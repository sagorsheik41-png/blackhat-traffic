const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const Payment = require('../models/Payment');
const Settings = require('../models/Settings');
const AdManager = require('../models/AdManager');
const AdAnalytics = require('../models/AdAnalytics');
const router = express.Router();

router.use(requireAuth);
router.use(requireAdmin);

// ─── GET /admin ─────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        const tierCounts = await User.aggregate([
            { $group: { _id: '$tier', count: { $sum: 1 } } },
        ]);

        const recentUsers = await User.find()
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const recentActivity = await ActivityLog.find()
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('user', 'name email')
            .lean();

        // New: Pending Payments
        const pendingPayments = await Payment.find({ status: 'pending' })
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        // New: Platform Settings
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({
                pricing: { pro: 29, ultimate: 99, currency: 'USD' },
                pricingBDT: { pro: 3500, ultimate: 11500, currency: 'BDT' },
                merchantNumbers: { bkash: '01XXXXXXXXX', nagad: '01XXXXXXXXX', rocket: '01XXXXXXXXX' },
                apiKeys: {
                    ollama: 'f5a80934188c41bc979a1fe810015e89._9ffcVpaev6VcsaDlrLKaXwo',
                    tmdb: '',
                    traffic: ''
                },
                useBDT: true
            });
        }

        // Stats for Chart: Users in last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const growthData = await User.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // New: Ad Analytics Breakdown
        const adAnalytics = await AdAnalytics.aggregate([
            {
                $group: {
                    _id: '$user',
                    totalViews: { $sum: '$viewCount' },
                    totalDurationMs: { $sum: '$totalDurationMs' }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: '$userInfo' },
            {
                $project: {
                    _id: 0,
                    userName: '$userInfo.name',
                    userEmail: '$userInfo.email',
                    totalViews: 1,
                    totalDurationMinutes: { $round: [{ $divide: ['$totalDurationMs', 60000] }, 2] }
                }
            },
            { $sort: { totalViews: -1 } }
        ]);

        res.render('admin', {
            title: 'Admin Control Center',
            stats: { totalUsers, activeUsers, tierCounts, growthData },
            recentUsers,
            recentActivity,
            pendingPayments,
            settings,
            adAnalytics
        });
    } catch (err) {
        console.error('Admin error:', err);
        res.render('admin', {
            title: 'Admin Panel',
            stats: { totalUsers: 0, activeUsers: 0, tierCounts: [], growthData: [] },
            recentUsers: [],
            recentActivity: [],
            pendingPayments: [],
            settings: {
                pricing: { pro: 29, ultimate: 99, currency: 'USD' },
                pricingBDT: { pro: 3500, ultimate: 11500, currency: 'BDT' },
                merchantNumbers: { bkash: 'N/A', nagad: 'N/A', rocket: 'N/A' },
                useBDT: true
            }
        });
    }
});

// ─── POST /admin/users/:id/tier ─────────────────────────────
router.post('/users/:id/tier', async (req, res) => {
    try {
        const { tier } = req.body;
        if (!['free', 'pro', 'ultimate'].includes(tier)) {
            return res.status(400).json({ error: 'Invalid tier' });
        }
        await User.findByIdAndUpdate(req.params.id, { tier });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /admin/users/:id/toggle ───────────────────────────
router.post('/users/:id/toggle', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        user.isActive = !user.isActive;
        await user.save();
        res.json({ success: true, isActive: user.isActive });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /admin/users/:id (Edit) ───────────────────────────
router.post('/users/:id', async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        await User.findByIdAndUpdate(req.params.id, { name, email, phone });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── DELETE /admin/users/:id ────────────────────────────
router.delete('/users/:id', async (req, res) => {
    try {
        // Don't allow self-deletion in admin panel
        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({ error: 'Cannot delete yourself' });
        }
        await User.findByIdAndDelete(req.params.id);
        await ActivityLog.deleteMany({ user: req.params.id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /admin/payments/:id/approve ──────────────────────
router.post('/payments/:id/approve', async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);
        if (!payment) return res.status(404).json({ error: 'Payment not found' });

        // Update User Tier
        await User.findByIdAndUpdate(payment.user, { tier: payment.tier });

        // Update Payment Status
        payment.status = 'approved';
        await payment.save();

        // Log Activity
        await ActivityLog.create({
            user: payment.user,
            action: 'TIER_UPGRADE',
            details: `Upgraded to ${payment.tier} via manual payment approval`,
            severity: 'info'
        });

        res.json({ success: true, message: 'Payment approved and user upgraded' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /admin/payments/:id/reject ───────────────────────
router.post('/payments/:id/reject', async (req, res) => {
    try {
        const { note } = req.body;
        const payment = await Payment.findById(req.params.id);
        if (!payment) return res.status(404).json({ error: 'Payment not found' });

        payment.status = 'rejected';
        payment.adminNote = note || 'Invalid TrxID or Sender Number';
        await payment.save();

        res.json({ success: true, message: 'Payment rejected' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /admin/settings/update ───────────────────────────
router.post('/settings/update', async (req, res) => {
    try {
        const { pricing, pricingBDT, merchantNumbers, apiKeys, useBDT } = req.body;
        let settings = await Settings.findOne();
        if (!settings) settings = new Settings();

        if (pricing) settings.pricing = pricing;
        if (pricingBDT) settings.pricingBDT = pricingBDT;
        if (merchantNumbers) settings.merchantNumbers = merchantNumbers;
        if (apiKeys) Object.assign(settings.apiKeys, apiKeys); // Merge — don't overwrite unrelated keys
        if (useBDT !== undefined) settings.useBDT = useBDT;

        await settings.save();
        res.json({ success: true, message: 'Platform settings updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /admin/user/:id/update-status ────────────────────
router.post('/user/:id/update-status', async (req, res) => {
    try {
        const { status } = req.body;
        if (!['pending', 'active', 'rejected', 'banned'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!user) return res.status(404).json({ error: 'User not found' });

        await ActivityLog.create({
            user: user._id,
            action: 'STATUS_CHANGED',
            details: `Status changed to ${status}`,
            severity: 'info'
        });

        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /admin/user/:id/reset-traffic-pro ────────────────
router.post('/user/:id/reset-traffic-pro', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            {
                'trafficProStats.totalVisitors': 0,
                'trafficProStats.totalClicks': 0,
                'trafficProStats.totalRevenue': 0,
                'trafficProStats.conversionRate': 0,
                'trafficProStats.lastUpdate': new Date()
            },
            { new: true }
        );

        if (!user) return res.status(404).json({ error: 'User not found' });

        await ActivityLog.create({
            user: user._id,
            action: 'TRAFFIC_RESET',
            details: 'Traffic Pro stats reset to zero',
            severity: 'info'
        });

        res.json({ success: true, message: 'Traffic Pro stats reset', user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /admin/ad-analytics ───────────────────────────────
router.get('/ad-analytics', async (req, res) => {
    try {
        const AdAnalytics = require('../models/AdAnalytics');

        // Aggregate analytics by user
        const analytics = await AdAnalytics.aggregate([
            {
                $group: {
                    _id: '$user',
                    totalViews: { $sum: '$viewCount' },
                    totalDurationMs: { $sum: '$totalDurationMs' }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            {
                $unwind: '$userInfo'
            },
            {
                $project: {
                    _id: 0,
                    userId: '$_id',
                    userName: '$userInfo.name',
                    userEmail: '$userInfo.email',
                    totalViews: 1,
                    totalDurationMinutes: {
                        $divide: ['$totalDurationMs', 60000]
                    }
                }
            },
            {
                $sort: { totalViews: -1 }
            }
        ]);

        res.json({ success: true, analytics });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /admin/ad-manager ───────────────────────────────
router.get('/ad-manager', async (req, res) => {
    try {
        const ads = await AdManager.find().sort({ createdAt: -1 }).lean();
        res.json({ success: true, ads });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /admin/ad-manager ──────────────────────────────
router.post('/ad-manager', async (req, res) => {
    try {
        const ad = new AdManager(req.body);
        await ad.save();
        res.json({ success: true, ad });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── PUT /admin/ad-manager/:id ───────────────────────────
router.put('/ad-manager/:id', async (req, res) => {
    try {
        const ad = await AdManager.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!ad) return res.status(404).json({ error: 'Ad not found' });
        res.json({ success: true, ad });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── DELETE /admin/ad-manager/:id ────────────────────────
router.delete('/ad-manager/:id', async (req, res) => {
    try {
        const ad = await AdManager.findByIdAndDelete(req.params.id);
        if (!ad) return res.status(404).json({ error: 'Ad not found' });
        // Also delete associated analytics
        await AdAnalytics.deleteMany({ ad: req.params.id });
        res.json({ success: true, message: 'Ad deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /admin/ad-manager/:id/toggle ───────────────────
router.post('/ad-manager/:id/toggle', async (req, res) => {
    try {
        const ad = await AdManager.findById(req.params.id);
        if (!ad) return res.status(404).json({ error: 'Ad not found' });

        ad.status = !ad.status;
        await ad.save();

        res.json({ success: true, status: ad.status });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /admin/settings/ad-toggle ──────────────────────
router.post('/settings/ad-toggle', async (req, res) => {
    try {
        const settings = await Settings.findOne();
        if (!settings) return res.status(404).json({ error: 'Settings not found' });

        settings.sidebarAdsEnabled = !settings.sidebarAdsEnabled;
        await settings.save();

        res.json({ success: true, enabled: settings.sidebarAdsEnabled });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
