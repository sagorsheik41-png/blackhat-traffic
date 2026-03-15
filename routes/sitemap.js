const express = require('express');
const router = express.Router();
const Video = require('../models/Video');
const Blog = require('../models/Blog');

// GET /sitemap.xml
router.get('/', async (req, res) => {
    try {
        const baseUrl = process.env.SITE_URL || 'http://localhost:3000';

        const [videos, blogs] = await Promise.all([
            Video.find({ isPublished: true }).select('slug updatedAt').lean(),
            Blog.find({ isPublished: true }).select('slug updatedAt').lean(),
        ]);

        const staticPages = ['', '/videos', '/blog'];

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

        // Static pages
        staticPages.forEach(path => {
            xml += `  <url>\n    <loc>${baseUrl}${path}</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
        });

        // Video pages
        videos.forEach(v => {
            xml += `  <url>\n    <loc>${baseUrl}/videos/${v.slug}</loc>\n    <lastmod>${(v.updatedAt || new Date()).toISOString().split('T')[0]}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
        });

        // Blog pages
        blogs.forEach(b => {
            xml += `  <url>\n    <loc>${baseUrl}/blog/${b.slug}</loc>\n    <lastmod>${(b.updatedAt || new Date()).toISOString().split('T')[0]}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
        });

        xml += `</urlset>`;

        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (err) {
        res.status(500).send('<?xml version="1.0"?><error>Failed to generate sitemap</error>');
    }
});

module.exports = router;
