const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const AdManager = require('../../models/AdManager');
const AdAnalytics = require('../../models/AdAnalytics');
const router = express.Router();

/**
 * @route   POST /api/ads/track-view
 * @desc    Track when a user views an ad
 * @access  Private
 */
router.post('/track-view', requireAuth, async (req, res) => {
    try {
        const { adId } = req.body;

        if (!adId) {
            return res.status(400).json({ success: false, error: 'Ad ID required' });
        }

        // Find or create analytics record
        let analytics = await AdAnalytics.findOne({ user: req.user._id, ad: adId });

        if (!analytics) {
            analytics = new AdAnalytics({
                user: req.user._id,
                ad: adId,
                viewCount: 1,
                lastViewed: new Date()
            });
        } else {
            analytics.viewCount += 1;
            analytics.lastViewed = new Date();
        }

        await analytics.save();

        res.json({ success: true, viewCount: analytics.viewCount });
    } catch (error) {
        console.error('Track view error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route   POST /api/ads/track-duration
 * @desc    Track time spent viewing an ad
 * @access  Private
 */
router.post('/track-duration', requireAuth, async (req, res) => {
    try {
        const { adId, durationMs } = req.body;

        if (!adId || !durationMs) {
            return res.status(400).json({ success: false, error: 'Ad ID and duration required' });
        }

        // Find or create analytics record
        let analytics = await AdAnalytics.findOne({ user: req.user._id, ad: adId });

        if (!analytics) {
            analytics = new AdAnalytics({
                user: req.user._id,
                ad: adId,
                totalDurationMs: durationMs,
                viewCount: 1,
                lastViewed: new Date()
            });
        } else {
            analytics.totalDurationMs += durationMs;
            analytics.lastViewed = new Date();
        }

        await analytics.save();

        res.json({ success: true, totalDurationMs: analytics.totalDurationMs });
    } catch (error) {
        console.error('Track duration error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route   GET /api/ads/sidebar
 * @desc    Get the active sidebar ad
 * @access  Public
 */
router.get('/sidebar', async (req, res) => {
    try {
        // Check if ads are globally enabled
        const Settings = require('../../models/Settings');
        const settings = await Settings.findOne();
        if (settings && settings.sidebarAdsEnabled === false) {
            return res.json({ success: true, ad: null });
        }

        // First try to find a dedicated sidebar ad
        let ad = await AdManager.findOne({
            status: true,
            isSidebarAd: true
        }).lean();

        // Fallback: return any active ad
        if (!ad) {
            ad = await AdManager.findOne({ status: true }).lean();
        }

        res.json({ success: true, ad: ad || null });
    } catch (error) {
        console.error('Get sidebar ad error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route   POST /api/ads/track
 * @desc    Track ad impression (view)
 * @access  Public (no auth required for impressions)
 */
router.post('/track', async (req, res) => {
    try {
        const { adId } = req.body;

        if (!adId) {
            return res.status(400).json({ success: false, error: 'Ad ID required' });
        }

        // Update ad impression counter
        await AdManager.findByIdAndUpdate(
            adId,
            { $inc: { impressions: 1 } },
            { new: true }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Track impression error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route   GET /api/ads/analytics
 * @desc    Get total ad impressions and clicks
 * @access  Public or Admin (used for admin ad manager stats)
 */
router.get('/analytics', async (req, res) => {
    try {
        const ads = await AdManager.find({});
        const totals = ads.reduce((acc, ad) => ({
            impressions: acc.impressions + (ad.impressions || 0),
            clicks: acc.clicks + (ad.clicks || 0)
        }), { impressions: 0, clicks: 0 });

        res.json({ success: true, analytics: totals });
    } catch (error) {
        console.error('Fetch analytics error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;