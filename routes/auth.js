const express = require('express');
const { body, validationResult } = require('express-validator');
const supabase = require('../config/supabase'); // Import Supabase Client
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const router = express.Router();

// ─── GET /auth/login ────────────────────────────────────────
router.get('/login', (req, res) => {
    if (req.user) return res.redirect('/dashboard');
    res.render('auth/login', { layout: false, error: req.flash('error') });
});

// ─── GET /auth/register ─────────────────────────────────────
router.get('/register', (req, res) => {
    if (req.user) return res.redirect('/dashboard');
    res.render('auth/register', { layout: false, error: req.flash('error') });
});

// ─── POST /auth/register ────────────────────────────────────
router.post('/register', [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('auth/register', {
                layout: false,
                error: errors.array()[0].msg,
            });
        }

        const { name, email, phone, password } = req.body;

        // 1. Register with Supabase
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name,
                    phone
                },
                emailRedirectTo: `${process.env.SITE_URL || 'https://blackhat-traffic.onrender.com'}/auth/callback`
            }
        });

        if (authError) {
            console.error('Supabase Auth Error:', authError.message);
            req.flash('error', authError.message);
            return res.redirect('/auth/register');
        }

        // 2. Sync to MongoDB to keep profile data accessible for the rest of the app
        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({ name, email, phone, password });
        }

        // 3. Set custom JWT cookie using Supabase Session (if available)
        const session = authData.session;
        if (session) {
            res.cookie('token', session.access_token, {
                httpOnly: true,
                maxAge: 7 * 24 * 60 * 60 * 1000,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
            });
            
            res.cookie('refreshToken', session.refresh_token, {
                httpOnly: true,
                maxAge: 7 * 24 * 60 * 60 * 1000,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
            });
        } else {
            // Email confirmation is required - user needs to verify email
            req.flash('success_msg', 'Registration successful! A confirmation email has been sent to ' + email + '. Please check your email and click the confirmation link.');
            return res.redirect('/auth/login');
        }

        req.session.userId = user._id;

        // Log activity non-blocking
        try {
            await ActivityLog.create({
                user: user._id,
                action: 'register',
                details: 'New user registration via Supabase',
                ip: req.ip,
                userAgent: req.get('User-Agent'),
            });
        } catch (logErr) {
            console.error('ActivityLog warning on register:', logErr);
        }

        req.flash('success_msg', 'Registration successful! A confirmation email has been sent to ' + email + '. Please check your email and click the confirmation link to activate your account.');
        res.redirect('/dashboard');
    } catch (err) {
        console.error('Register error:', err);
        req.flash('error', 'Registration failed. Please try again.');
        res.redirect('/auth/register');
    }
});

// ─── POST /auth/login ───────────────────────────────────────
router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('auth/login', {
                layout: false,
                error: 'Please enter a valid email and password',
            });
        }

        const { email, password } = req.body;

        // Authenticate with Supabase
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            console.error('Supabase Auth Error:', authError.message);
            return res.render('auth/login', {
                layout: false,
                error: 'Invalid email or password',
            });
        }

        // Get user from MongoDB
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('auth/login', {
                layout: false,
                error: 'Profile not found. Please contact support.',
            });
        }


        if (!user.isActive) {
            return res.render('auth/login', {
                layout: false,
                error: 'Account has been deactivated',
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Set Supabase access token as our auth cookie
        res.cookie('token', authData.session.access_token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });

        // Also save Supabase refresh token
        res.cookie('refreshToken', authData.session.refresh_token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });

        req.session.userId = user._id;

        // Log activity non-blocking
        try {
            await ActivityLog.create({
                user: user._id,
                action: 'login',
                details: 'User login via Supabase',
                ip: req.ip,
                userAgent: req.get('User-Agent'),
            });
        } catch (logErr) {
            console.error('ActivityLog warning on login:', logErr);
        }

        // MASTER ADMIN REDIRECT
        if (user.email === 'sayemapon1213@gmail.com' || user.role === 'admin') {
            return res.redirect('/admin');
        }

        res.redirect('/dashboard');
    } catch (err) {
        console.error('Login error:', err);
        res.render('auth/login', {
            layout: false,
            error: 'Login failed. Please try again.',
        });
    }
});

// ─── GET /auth/logout ───────────────────────────────────────
router.get('/logout', async (req, res) => {
    try {
        if (req.user) {
            await ActivityLog.create({
                user: req.user._id,
                action: 'logout',
                ip: req.ip,
            });
        }

        // Sign out from Supabase as well
        await supabase.auth.signOut();
    } catch (err) {
        // Ignore logging errors
    }

    res.clearCookie('token');
    res.clearCookie('refreshToken');
    req.session.destroy(() => {
        res.redirect('/auth/login');
    });
});

// ─── GET /auth/callback ─────────────────────────────────────
// Callback for email confirmation link from Supabase
router.get('/callback', async (req, res) => {
    try {
        const { code, error } = req.query;

        if (error) {
            console.error('Email confirmation error:', error);
            req.flash('error', 'Email confirmation failed. Please try again.');
            return res.redirect('/auth/login');
        }

        if (!code) {
            return res.redirect('/auth/login');
        }

        // Exchange code for session
        const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

        if (sessionError) {
            console.error('Session exchange error:', sessionError.message);
            req.flash('error', 'Email confirmation failed. Please try again.');
            return res.redirect('/auth/login');
        }

        // User email is now confirmed
        const { user } = sessionData;

        // Find or update user in MongoDB
        let dbUser = await User.findOne({ email: user.email });
        if (!dbUser) {
            dbUser = await User.create({
                name: user.user_metadata?.name || user.email,
                email: user.email,
                phone: user.user_metadata?.phone || '',
                password: '', // Password is managed by Supabase
            });
        }

        // Set session cookie
        res.cookie('token', sessionData.session.access_token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });

        res.cookie('refreshToken', sessionData.session.refresh_token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });

        req.session.userId = dbUser._id;

        req.flash('success_msg', 'Email confirmed! You are now logged in.');
        res.redirect('/dashboard');
    } catch (err) {
        console.error('Callback error:', err);
        req.flash('error', 'Confirmation failed. Please try again.');
        res.redirect('/auth/login');
    }
});

module.exports = router;

