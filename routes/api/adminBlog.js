const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../../middleware/auth');
const Blog = require('../../models/Blog');

router.use(requireAuth);
router.use(requireAdmin);

// ─── GET /api/admin/blog ─────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const posts = await Blog.find().sort({ createdAt: -1 }).lean();
        res.json({ success: true, posts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/admin/blog ────────────────────────────────────
router.post('/', async (req, res) => {
    try {
        const { title, content, excerpt, featuredImage, seoKeywords, metaDescription, isPublished } = req.body;
        const post = new Blog({
            title, content, excerpt, featuredImage,
            seoKeywords: Array.isArray(seoKeywords) ? seoKeywords : (seoKeywords ? seoKeywords.split(',').map(k => k.trim()) : []),
            metaDescription,
            authorName: req.user?.name || 'Admin',
            author: req.user?._id,
            isPublished: isPublished !== false,
        });
        await post.save();
        res.json({ success: true, post });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── PUT /api/admin/blog/:id ─────────────────────────────────
router.put('/:id', async (req, res) => {
    try {
        const { title, content, excerpt, featuredImage, seoKeywords, metaDescription, isPublished } = req.body;
        const update = {
            title, content, excerpt, featuredImage,
            seoKeywords: Array.isArray(seoKeywords) ? seoKeywords : (seoKeywords ? seoKeywords.split(',').map(k => k.trim()) : []),
            metaDescription,
            isPublished: isPublished !== false,
        };
        if (title) {
            update.slug = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').substring(0, 100) + '-' + Date.now();
        }
        const post = await Blog.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!post) return res.status(404).json({ error: 'Post not found' });
        res.json({ success: true, post });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── DELETE /api/admin/blog/:id ──────────────────────────────
router.delete('/:id', async (req, res) => {
    try {
        await Blog.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
