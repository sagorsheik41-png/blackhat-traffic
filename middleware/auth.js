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

        // Try Supabase token validation first
        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

        if (!error && supabaseUser) {
            const user = await User.findOne({ email: supabaseUser.email });
            if (user && user.isActive) {
                req.user = user;
                req.session.userId = user._id;
                return next();
            }
        }

        // Fallback: Try to validate as a local token (base64 encoded: userId:email:timestamp)
        try {
            const decoded = Buffer.from(token, 'base64').toString('utf-8');
            const [userId, email] = decoded.split(':');
            
            if (userId && email) {
                const user = await User.findById(userId);
                if (user && user.email === email && user.isActive) {
                    req.user = user;
                    req.session.userId = user._id;
                    return next();
                }
            }
        } catch (decodeErr) {
            // Not a local token
        }

        // Token validation failed
        if (req.accepts('html')) {
            res.clearCookie('token');
            res.clearCookie('refreshToken');
            return res.redirect('/auth/login');
        }
        return res.status(401).json({ error: 'Invalid or expired token' });
    } catch (err) {
        console.error('Auth middleware error:', err);
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
            // Try Supabase token first
            const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
            if (!error && supabaseUser) {
                const user = await User.findOne({ email: supabaseUser.email });
                if (user && user.isActive) {
                    req.user = user;
                    req.session.userId = user._id;
                    return next();
                }
            }

            // Fallback: Try local token
            try {
                const decoded = Buffer.from(token, 'base64').toString('utf-8');
                const [userId, email] = decoded.split(':');
                if (userId && email) {
                    const user = await User.findById(userId);
                    if (user && user.email === email && user.isActive) {
                        req.user = user;
                        req.session.userId = user._id;
                        return next();
                    }
                }
            } catch (decodeErr) {
                // Not a local token
            }
        }

        // Fallback to Express session
        if (req.session && req.session.userId) {
            const user = await User.findById(req.session.userId);
            if (user && user.isActive) req.user = user;
            return next();
        }
    } catch (err) {
        console.error('Optional auth middleware error:', err);
    }
    next();
};

module.exports = { requireAuth, requireAdmin, optionalAuth };
