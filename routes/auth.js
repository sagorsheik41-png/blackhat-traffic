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
                }
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

        // 3. Set custom JWT cookie using Supabase Session
        const session = authData.session;
        if (session) {
            res.cookie('token', session.access_token, {
                httpOnly: true,
                maxAge: 7 * 24 * 60 * 60 * 1000,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
            });
        } else {
            // If email confirmation is enabled on Supabase, session will be null here
            req.flash('success_msg', 'Please check your email to verify your account!');
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

        req.flash('success_msg', 'Registration successful!');
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

        // 1. Authenticate with Supabase
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            return res.render('auth/login', {
                layout: false,
                error: authError.message, // Provide the exact Supabase error (e.g., 'Email not confirmed')
            });
        }

        // Find associated user in MongoDB
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

        // 2. Set Supabase access token as our auth cookie
        res.cookie('token', authData.session.access_token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });

        // Also save Supabase refresh token in case we need it
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

module.exports = router;

