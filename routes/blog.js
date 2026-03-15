const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');

// ─── GET /blog ─────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;

        const [posts, totalCount] = await Promise.all([
            Blog.find({ isPublished: true }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Blog.countDocuments({ isPublished: true }),
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        res.render('blog/index', {
            layout: 'layouts/main',
            title: 'Blog — Tips, Guides & News',
            metaDescription: 'Read our latest articles on movies, apps, games, software and more.',
            posts,
            currentPage: page,
            totalPages,
            currentPath: '/blog',
        });
    } catch (err) {
        console.error('Blog index error:', err);
        res.render('blog/index', {
            layout: 'layouts/main',
            title: 'Blog',
            metaDescription: '',
            posts: [], currentPage: 1, totalPages: 1, currentPath: '/blog',
        });
    }
});

// ─── GET /blog/:slug ───────────────────────────────────────────
router.get('/:slug', async (req, res) => {
    try {
        const post = await Blog.findOne({ slug: req.params.slug, isPublished: true }).lean();
        if (!post) return res.status(404).render('errors/404', { layout: 'layouts/main', title: '404', currentPath: req.path, user: req.user || null });

        // Increment views
        await Blog.findByIdAndUpdate(post._id, { $inc: { views: 1 } });

        const relatedPosts = await Blog.find({ isPublished: true, _id: { $ne: post._id } }).sort({ createdAt: -1 }).limit(3).lean();

        res.render('blog/show', {
            layout: 'layouts/main',
            title: post.title + ' — Blog',
            metaDescription: post.metaDescription || post.excerpt || '',
            post,
            relatedPosts,
            currentPath: `/blog/${post.slug}`,
        });
    } catch (err) {
        console.error('Blog show error:', err);
        res.status(500).render('errors/404', { layout: 'layouts/main', title: 'Error', currentPath: req.path, user: req.user || null });
    }
});

module.exports = router;
