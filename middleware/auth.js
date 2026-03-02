const User = require('../models/User');
const supabase = require('../config/supabase');

/**
 * Middleware: Require authenticated user.
 * Checks JWT from cookie or Authorization header.
 * Attaches req.user on success.
 */
const requireAuth = async (req, res, next) => {
    try {
        let token = null;

        // 1. Check cookie
        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }
        // 2. Check Authorization header
        else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            // Check session
            if (req.session && req.session.userId) {
                const user = await User.findById(req.session.userId);
                if (user && user.isActive) {
                    req.user = user;
                    return next();
                }
            }

            if (req.accepts('html')) {
                return res.redirect('/auth/login');
            }
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

        if (error || !supabaseUser) {
            if (req.accepts('html')) {
                return res.redirect('/auth/login');
            }
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const user = await User.findOne({ email: supabaseUser.email });

        if (!user || !user.isActive) {
            if (req.accepts('html')) {
                return res.redirect('/auth/login');
            }
            return res.status(401).json({ error: 'User not found or inactive' });
        }

        req.user = user;
        req.session.userId = user._id; // Restore session if needed
        next();
    } catch (err) {
        if (req.accepts('html')) {
            return res.redirect('/auth/login');
        }
        return res.status(401).json({ error: 'Server error' });
    }
};

/**
 * Middleware: Require admin role.
 * Must be used AFTER requireAuth.
 */
const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    if (req.accepts('html')) {
        return res.status(403).render('errors/403', { user: req.user });
    }
    return res.status(403).json({ error: 'Admin access required' });
};

/**
 * Middleware: Optionally attach user if token exists (non-blocking).
 * Useful for public pages that show different UI for logged-in users.
 */
const optionalAuth = async (req, res, next) => {
    try {
        let token = null;
        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (token) {
            const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
            if (!error && supabaseUser) {
                const user = await User.findOne({ email: supabaseUser.email });
                if (user && user.isActive) {
                    req.user = user;
                    req.session.userId = user._id;
                    return next();
                }
            }
        }

        // Fallback to Express session
        if (req.session && req.session.userId) {
            const user = await User.findById(req.session.userId);
            if (user && user.isActive) req.user = user;
            return next();
        }
    } catch (err) {
        // Silently ignore — user stays unauthenticated
    }
    next();
};

module.exports = { requireAuth, requireAdmin, optionalAuth };
