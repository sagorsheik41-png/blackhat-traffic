/**
 * BlackHat Traffic SaaS — Main Server Entry Point
 */
require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');
const http = require('http');
const mongoose = require('mongoose');
const flash = require('connect-flash');
const { MongoMemoryServer } = require('mongodb-memory-server');
const rateLimit = require('express-rate-limit');

// Models
const User = require('./models/User');
const Settings = require('./models/Settings');

// ─── Rate Limiting ──────────────────────────────────────────
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // INCREASED for testing/dev: 2000 requests per windowMs
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1000, // INCREASED for testing/dev: 1000 attempts per hour
    message: { error: 'Too many authentication attempts, please try again after an hour' },
    standardHeaders: true,
    legacyHeaders: false,
});

const errorHandler = require('./middleware/errorHandler');
const { optionalAuth } = require('./middleware/auth');

// Route imports
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');
const apiTmdbRoutes = require('./routes/api/tmdb');
const apiPaymentRoutes = require('./routes/api/payments');
const apiUserRoutes = require('./routes/api/user');
const apiAdsRoutes = require('./routes/api/ads');
const apiAiRoutes = require('./routes/api/ai');
const apiStreamingRoutes = require('./routes/api/streaming');
const inquiryRoutes = require('./routes/inquiry');

// Tool routes
const adobeStockRoutes = require('./routes/tools/adobeStock');
const trafficProRoutes = require('./routes/tools/trafficPro');
const tradingBotRoutes = require('./routes/tools/tradingBot');
const multiDeviceRoutes = require('./routes/tools/multiDevice');
const movieStreamRoutes = require('./routes/tools/movieStream');
const signalsRoutes = require('./routes/tools/signals');
const youtubeRoutes = require('./routes/tools/youtube');
const linkToolsRoutes = require('./routes/tools/linkTools');
const calculatorRoutes = require('./routes/tools/calculator');
const cryptoMiningRoutes = require('./routes/tools/cryptoMining');

const app = express();
const server = http.createServer(app);

// ─── Security Middleware ────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'", "'unsafe-inline'", "'unsafe-eval'",
                "https://cdn.jsdelivr.net",
                "https://cdn.tailwindcss.com",
                "https://cdnjs.cloudflare.com",
                "https://challenges.cloudflare.com",
            ],
            scriptSrcAttr: ["'unsafe-inline'"],  // Allow inline event handlers (onclick, onsubmit, etc.)
            styleSrc: [
                "'self'", "'unsafe-inline'",
                "https://cdn.jsdelivr.net",
                "https://fonts.googleapis.com",
                "https://cdnjs.cloudflare.com",
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com",
            ],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'", "wss:", "ws:", "https:"],
            frameSrc: ["'self'", "https:", "http:"],
        },
    },
}));

app.use(cors());

// ─── Logging ────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

// ─── Body Parsing ───────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Sessions (in-memory by default, MongoStore when DB is available) ───
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    },
}));

app.use(flash());
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});

// ─── View Engine ────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// ─── Static Files ───────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── Expose user to all views ───────────────────────────────
app.use(optionalAuth);
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.currentPath = req.path;
    next();
});

// ─── Routes ─────────────────────────────────────────────────
// Public
app.get('/', async (req, res) => {
    if (req.user) return res.redirect('/dashboard');

    // Fetch settings for pricing display on landing page
    let settings = await Settings.findOne();
    if (!settings) {
        settings = { pricingBDT: { pro: 3500, ultimate: 11500 } };
    }

    res.render('landing', {
        layout: false,
        settings
    });
});

// Auth
app.use('/auth', authRoutes);

// Protected
app.use('/dashboard', dashboardRoutes);
app.use('/admin', adminRoutes);

// API
app.use('/api/tmdb', apiTmdbRoutes);
app.use('/api/payments', apiPaymentRoutes);
app.use('/api/user', apiUserRoutes);
app.use('/api/ads', apiAdsRoutes);
app.use('/api/ai', apiAiRoutes);
app.use('/api/stream', apiStreamingRoutes);

// Tool pages
app.use('/tools/adobe-stock', adobeStockRoutes);
app.use('/tools/traffic-pro', trafficProRoutes);
app.use('/tools/trading-bot', tradingBotRoutes);
app.use('/tools/multi-device', multiDeviceRoutes);
app.use('/tools/movie-stream', movieStreamRoutes);
app.use('/tools/signals', signalsRoutes);
app.use('/tools/youtube', youtubeRoutes);
app.use('/tools/link-tools', linkToolsRoutes);
app.use('/tools/calculator', calculatorRoutes);
app.use('/tools/crypto-mining', cryptoMiningRoutes);

// Inquiry Form Pages
app.get('/inquiry', (req, res) => {
    res.render('tools/inquiryForm', { layout: 'layouts/main', dashboard: req.user ? true : false });
});

// Inquiry Form API
app.use('/api/inquiry', inquiryRoutes);

// ─── 404 Handler ────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).render('errors/404', { layout: 'layouts/main', user: req.user || null, currentPath: req.path, title: '404' });
});

// ─── Error Handler ──────────────────────────────────────────
app.use(errorHandler);

// ─── Connect to MongoDB (non-blocking) ─────────────────────
async function connectDB() {
    try {
        let uri = process.env.MONGODB_URI;
        if (process.env.NODE_ENV === 'development' || !uri || uri.includes('127.0.0.1')) {
            const mongoServer = await MongoMemoryServer.create();
            uri = mongoServer.getUri();
            console.log('📦 Using In-Memory MongoDB for Development/Testing');
        }
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
        seedAdmin();
    } catch (err) {
        console.warn(`⚠️  MongoDB unavailable: ${err.message}`);
        console.warn('   Server running without database. Auth/data features disabled.');
    }
}

// ─── Admin & Settings Seeding ──────────────────────────
const seedAdmin = async () => {
    try {
        const adminEmail = 'sayemapon1213@gmail.com';
        const adminPass = '@SAgoR-1213!';

        // Ensure standard admin exists
        const adminExists = await User.findOne({ email: adminEmail });
        if (!adminExists) {
            await User.create({
                name: 'Master Admin',
                email: adminEmail,
                phone: '+880 1XXXXXXXXX',
                password: adminPass,
                role: 'admin',
                tier: 'ultimate',
            });
            console.log(`👤 Master Admin seeded: ${adminEmail}`);
        } else {
            // Update password just in case it was changed/lost
            adminExists.password = adminPass;
            adminExists.role = 'admin';
            adminExists.tier = 'ultimate';
            await adminExists.save();
        }

        // Initialize Settings
        const settingsCount = await Settings.countDocuments();
        if (settingsCount === 0) {
            await Settings.create({
                pricing: { pro: 29, ultimate: 99, currency: 'USD' },
                pricingBDT: { pro: 3500, ultimate: 11500, currency: 'BDT' },
                merchantNumbers: {
                    bkash: '01XXXXXXXXX',
                    nagad: '01XXXXXXXXX',
                    rocket: '01XXXXXXXXX'
                },
                useBDT: true
            });
            console.log('⚙️ Default Platform Settings initialized.');
        }

    } catch (err) {
        console.error('Seeding error:', err.message);
    }
};

// ─── Start Server ───────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`\n🚀 BlackHat Traffic SaaS running on http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
    connectDB();
});

module.exports = { app, server };
