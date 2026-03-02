const express = require('express');
const { requireAuth } = require('../middleware/auth');
const ActivityLog = require('../models/ActivityLog');
const router = express.Router();

// All dashboard routes require authentication
router.use(requireAuth);

// ─── GET /dashboard ─────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const recentActivity = await ActivityLog.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        res.render('dashboard', {
            title: 'Omni-Dashboard',
            recentActivity,
        });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.render('dashboard', {
            title: 'Omni-Dashboard',
            recentActivity: [],
        });
    }
});

// ─── GET /dashboard/profile ─────────────────────────────────
router.get('/profile', (req, res) => {
    res.render('profile', { title: 'My Profile' });
});

// ─── GET /dashboard/upgrade ─────────────────────────────────
router.get('/upgrade', async (req, res) => {
    try {
        const Settings = require('../models/Settings');
        let settings = await Settings.findOne();
        if (!settings) {
            // Default fallback if no settings found
            settings = {
                pricing: { pro: 29, ultimate: 99, currency: 'USD' },
                pricingBDT: { pro: 3500, ultimate: 11500, currency: 'BDT' },
                merchantNumbers: { bkash: '01XXXXXXXXX', nagad: '01XXXXXXXXX', rocket: '01XXXXXXXXX' },
                useBDT: true
            };
        }
        res.render('upgrade', { title: 'Upgrade Plan', settings });
    } catch (err) {
        console.error('Upgrade page error:', err);
        res.render('upgrade', {
            title: 'Upgrade Plan',
            settings: {
                pricing: { pro: 29, ultimate: 99, currency: 'USD' },
                pricingBDT: { pro: 3500, ultimate: 11500, currency: 'BDT' },
                merchantNumbers: { bkash: 'N/A', nagad: 'N/A', rocket: 'N/A' },
                useBDT: true
            }
        });
    }
});

module.exports = router;
