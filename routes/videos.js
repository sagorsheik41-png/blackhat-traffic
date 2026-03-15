const express = require('express');
const router = express.Router();
const Video = require('../models/Video');
const Blog = require('../models/Blog');
const Category = require('../models/Category');
const VideoAnalytics = require('../models/VideoAnalytics');
const Affiliate = require('../models/Affiliate');

// ─── Helper: detect country from request ────────────────────
function detectCountry(req) {
    // Cloudflare header (most reliable on production)
    if (req.headers['cf-ipcountry']) return req.headers['cf-ipcountry'];
    // Vercel / generic proxy
    if (req.headers['x-vercel-ip-country']) return req.headers['x-vercel-ip-country'];
    return 'Unknown';
}

// ─── GET /videos ─────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const { category, search, page = 1 } = req.query;
        const limit = 12;
        const skip = (page - 1) * limit;

        let filter = { isPublished: true };
        if (category) filter.category = category;
        if (search) filter.$text = { $search: search };

        const [videos, featuredVideos, trendingVideos, categories, blogHighlights, affiliates, totalCount] = await Promise.all([
            Video.find(filter).populate('category').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Video.find({ isPublished: true, isFeatured: true }).populate('category').sort({ createdAt: -1 }).limit(5).lean(),
            Video.find({ isPublished: true, isTrending: true }).populate('category').sort({ 'stats.views': -1 }).limit(8).lean(),
            Category.find({ isActive: true }).lean(),
            Blog.find({ isPublished: true }).sort({ createdAt: -1 }).limit(3).lean(),
            Affiliate.find({ isActive: true }).sort({ displayOrder: 1 }).limit(4).lean(),
            Video.countDocuments(filter),
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        res.render('videos/index', {
            layout: 'layouts/main',
            title: 'Video Library — Watch & Download via TeraBox',
            metaDescription: 'Watch preview videos and download full content from our secure TeraBox library. Movies, Series, Apps, Games, Software and more.',
            videos,
            featuredVideos,
            trendingVideos,
            categories,
            blogHighlights,
            affiliates,
            currentCategory: category || '',
            searchQuery: search || '',
            currentPage: parseInt(page),
            totalPages,
            currentPath: '/videos',
        });
    } catch (err) {
        console.error('Videos index error:', err);
        res.render('videos/index', {
            layout: 'layouts/main',
            title: 'Video Library',
            metaDescription: '',
            videos: [], featuredVideos: [], trendingVideos: [],
            categories: [], blogHighlights: [], affiliates: [],
            currentCategory: '', searchQuery: '', currentPage: 1, totalPages: 1,
            currentPath: '/videos',
        });
    }
});

// ─── GET /videos/:slug ───────────────────────────────────────
router.get('/:slug', async (req, res) => {
    try {
        const video = await Video.findOne({ slug: req.params.slug, isPublished: true }).populate('category').lean();
        if (!video) return res.status(404).render('errors/404', { layout: 'layouts/main', title: '404', currentPath: req.path, user: req.user || null });

        const [related, categories, affiliates] = await Promise.all([
            Video.find({
                isPublished: true,
                _id: { $ne: video._id },
                $or: [{ category: video.category?._id }, { tags: { $in: video.tags } }]
            }).populate('category').limit(6).lean(),
            Category.find({ isActive: true }).lean(),
            Affiliate.find({ isActive: true }).sort({ displayOrder: 1 }).limit(3).lean(),
        ]);

        const userCountry = detectCountry(req);

        // Pick country-specific TeraBox link if configured
        let teraboxLink = video.teraboxLink;
        let popupMessage = 'Watch Full Video Securely on TeraBox';
        if (video.countryLinks && video.countryLinks.length) {
            const countryOverride = video.countryLinks.find(cl => cl.country === userCountry);
            if (countryOverride) {
                if (countryOverride.link) teraboxLink = countryOverride.link;
                if (countryOverride.popupMessage) popupMessage = countryOverride.popupMessage;
            }
        }

        res.render('videos/show', {
            layout: 'layouts/main',
            title: (video.seoTitle || video.title) + ' — Watch on TeraBox',
            metaDescription: video.seoDescription || video.description?.substring(0, 160) || '',
            video,
            related,
            categories,
            affiliates,
            teraboxLink,
            popupMessage,
            userCountry,
            currentPath: `/videos/${video.slug}`,
        });
    } catch (err) {
        console.error('Video show error:', err);
        res.status(500).render('errors/404', { layout: 'layouts/main', title: 'Error', currentPath: req.path, user: req.user || null });
    }
});

// ─── POST /api/track/:videoId/:event ────────────────────────
router.post('/api/track/:videoId/:event', async (req, res) => {
    const validEvents = ['view', 'popup_click', 'redirect_click'];
    try {
        const { videoId, event } = req.params;
        if (!validEvents.includes(event)) return res.status(400).json({ error: 'Invalid event' });

        const country = detectCountry(req);
        const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

        // Avoid recording duplicate views in the same session
        if (event === 'view') {
            const sessionKey = `viewed_${videoId}`;
            if (req.session[sessionKey]) return res.json({ ok: true, skipped: true });
            req.session[sessionKey] = true;
        }

        // Insert raw analytics event
        await VideoAnalytics.create({ video: videoId, event, ip, country, userAgent: req.headers['user-agent'] || '', sessionId: req.sessionID });

        // Update denormalized counter on Video document
        const counterField = { view: 'stats.views', popup_click: 'stats.popupClicks', redirect_click: 'stats.redirectClicks' }[event];
        await Video.findByIdAndUpdate(videoId, { $inc: { [counterField]: 1 } });

        res.json({ ok: true });
    } catch (err) {
        // Don't crash on tracking errors
        res.json({ ok: false, error: err.message });
    }
});

module.exports = router;
