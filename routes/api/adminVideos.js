const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../../middleware/auth');
const Video = require('../../models/Video');
const Category = require('../../models/Category');
const VideoAnalytics = require('../../models/VideoAnalytics');

router.use(requireAuth);
router.use(requireAdmin);

// ─── GET /api/admin/videos ───────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const { category, search, page = 1 } = req.query;
        const limit = 20;
        const skip = (parseInt(page) - 1) * limit;
        let filter = {};
        if (category) filter.category = category;
        if (search) filter.title = { $regex: search, $options: 'i' };

        const [videos, total] = await Promise.all([
            Video.find(filter).populate('category').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Video.countDocuments(filter),
        ]);
        res.json({ success: true, videos, total, pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/admin/videos ──────────────────────────────────
router.post('/', async (req, res) => {
    try {
        const { title, description, thumbnail, previewVideoUrl, teraboxLink, category, tags, releaseDate, seoTitle, seoDescription, isFeatured, isTrending, isPublished } = req.body;
        const video = new Video({
            title, description, thumbnail, previewVideoUrl, teraboxLink, category: category || null,
            tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []),
            releaseDate: releaseDate || new Date(),
            seoTitle, seoDescription,
            isFeatured: !!isFeatured, isTrending: !!isTrending,
            isPublished: isPublished !== false,
        });
        await video.save();
        res.json({ success: true, video });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── PUT /api/admin/videos/:id ───────────────────────────────
router.put('/:id', async (req, res) => {
    try {
        const { title, description, thumbnail, previewVideoUrl, teraboxLink, category, tags, releaseDate, seoTitle, seoDescription, isFeatured, isTrending, isPublished } = req.body;
        const update = {
            title, description, thumbnail, previewVideoUrl, teraboxLink,
            category: category || null,
            tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []),
            releaseDate, seoTitle, seoDescription,
            isFeatured: !!isFeatured, isTrending: !!isTrending,
            isPublished: isPublished !== false,
        };
        // Regenerate slug if title changed
        if (title) {
            update.slug = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').substring(0, 100) + '-' + Date.now();
        }
        const video = await Video.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!video) return res.status(404).json({ error: 'Video not found' });
        res.json({ success: true, video });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── DELETE /api/admin/videos/:id ───────────────────────────
router.delete('/:id', async (req, res) => {
    try {
        await Video.findByIdAndDelete(req.params.id);
        await VideoAnalytics.deleteMany({ video: req.params.id });
        res.json({ success: true, message: 'Video deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/admin/videos/analytics/summary ─────────────────
router.get('/analytics/summary', async (req, res) => {
    try {
        const [
            totalViews, totalPopupClicks, totalRedirects,
            topVideos, topCountries, recentEvents,
        ] = await Promise.all([
            VideoAnalytics.countDocuments({ event: 'view' }),
            VideoAnalytics.countDocuments({ event: 'popup_click' }),
            VideoAnalytics.countDocuments({ event: 'redirect_click' }),
            Video.find({ isPublished: true }).sort({ 'stats.views': -1 }).limit(10).select('title stats thumbnail slug').lean(),
            VideoAnalytics.aggregate([
                { $match: { event: 'view' } },
                { $group: { _id: '$country', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
            ]),
            VideoAnalytics.find().sort({ createdAt: -1 }).limit(20).populate('video', 'title').lean(),
        ]);
        const conversionRate = totalPopupClicks > 0 ? ((totalRedirects / totalPopupClicks) * 100).toFixed(1) : 0;
        res.json({ success: true, totalViews, totalPopupClicks, totalRedirects, conversionRate, topVideos, topCountries, recentEvents });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/admin/categories ───────────────────────────────
router.get('/categories', async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 }).lean();
        res.json({ success: true, categories });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/admin/categories ──────────────────────────────
router.post('/categories', async (req, res) => {
    try {
        const { name, description, icon } = req.body;
        const cat = new Category({ name, description, icon });
        await cat.save();
        res.json({ success: true, category: cat });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── DELETE /api/admin/categories/:id ────────────────────────
router.delete('/categories/:id', async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
