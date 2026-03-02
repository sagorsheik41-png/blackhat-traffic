const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const router = express.Router();

/**
 * Streaming Content Proxy API
 * Handles multiple streaming sources with fallback support
 * Fixes CORS and embedding issues
 */

router.use(requireAuth);

/**
 * GET /api/stream/embed
 * Returns working embed URL based on source
 * Query: ?id=123&type=movie&source=vidsrc_me&season=1&episode=1
 */
router.get('/embed', (req, res) => {
    try {
        const { id, type = 'movie', source = 'vidsrc_me', season = 1, episode = 1 } = req.query;

        if (!id) {
            return res.status(400).json({ error: 'Missing required parameter: id' });
        }

        let embedUrl = '';

        if (type === 'movie') {
            // Movie embed URLs with multiple sources
            switch (source) {
                case 'vidsrc_me':
                    embedUrl = `https://vidsrc.me/embed/movie/${id}`;
                    break;
                case 'vidsrc_icu':
                    embedUrl = `https://vidsrc.icu/embed/movie/${id}`;
                    break;
                case 'multiembed':
                    embedUrl = `https://multiembed.mov/directStream.php?video_id=${id}&tmdb=1`;
                    break;
                case '2embed':
                    embedUrl = `https://www.2embed.cc/embed/${id}`;
                    break;
                case 'embedsu':
                    embedUrl = `https://embed.su/embed/movie/${id}`;
                    break;
                default:
                    // Fallback to primary
                    embedUrl = `https://vidsrc.me/embed/movie/${id}`;
            }
        } else if (type === 'tv') {
            // TV show embed URLs
            switch (source) {
                case 'vidsrc_me':
                    embedUrl = `https://vidsrc.me/embed/tv/${id}/${season}/${episode}`;
                    break;
                case 'vidsrc_icu':
                    embedUrl = `https://vidsrc.icu/embed/tv/${id}/${season}/${episode}`;
                    break;
                case 'multiembed':
                    embedUrl = `https://multiembed.mov/directStream.php?video_id=${id}&tmdb=1&s=${season}&e=${episode}`;
                    break;
                case '2embed':
                    embedUrl = `https://www.2embed.cc/embedtv/${id}-${season}-${episode}`;
                    break;
                case 'embedsu':
                    embedUrl = `https://embed.su/embed/tv/${id}/${season}/${episode}`;
                    break;
                default:
                    // Fallback to primary
                    embedUrl = `https://vidsrc.me/embed/tv/${id}/${season}/${episode}`;
            }
        }

        if (!embedUrl) {
            return res.status(400).json({ error: 'Invalid type specified' });
        }

        console.log(`[Streaming] Generated embed URL (${source}):`, embedUrl);

        res.json({
            success: true,
            embedUrl,
            source,
            type,
            id,
            season,
            episode,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error('[Streaming] Error:', err);
        res.status(500).json({ error: 'Failed to generate embed URL', message: err.message });
    }
});

/**
 * GET /api/stream/test
 * Test if a source is working
 */
router.get('/test', async (req, res) => {
    try {
        const { source = 'vidsrc_me', id = '550' } = req.query; // Test with default movie ID (Fight Club)

        let testUrl = '';
        
        switch (source) {
            case 'vidsrc_me':
                testUrl = `https://vidsrc.me/embed/movie/${id}`;
                break;
            case 'vidsrc_icu':
                testUrl = `https://vidsrc.icu/embed/movie/${id}`;
                break;
            case 'multiembed':
                testUrl = `https://multiembed.mov/directStream.php?video_id=${id}&tmdb=1`;
                break;
            case '2embed':
                testUrl = `https://www.2embed.cc/embed/${id}`;
                break;
            default:
                testUrl = `https://vidsrc.me/embed/movie/${id}`;
        }

        console.log('[Streaming] Testing source:', source);

        const response = await fetch(testUrl, {
            method: 'HEAD',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://vidsrc.me/'
            },
            redirect: 'follow',
            timeout: 5000
        }).catch(err => {
            // HEAD request might not be supported, try GET instead
            return fetch(testUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://vidsrc.me/'
                },
                redirect: 'follow',
                timeout: 5000
            });
        });

        const isWorking = response && response.ok;
        console.log(`[Streaming] Source ${source} status:`, isWorking ? 'WORKING' : 'FAILED', response?.status);

        res.json({
            success: true,
            source,
            testUrl,
            working: isWorking,
            status: response?.status || 'unknown'
        });

    } catch (err) {
        console.error('[Streaming] Test error:', err);
        res.json({
            success: false,
            source: req.query.source,
            working: false,
            error: err.message
        });
    }
});

/**
 * GET /api/stream/sources
 * Returns available streaming sources
 */
router.get('/sources', (req, res) => {
    const sources = [
        { id: 'vidsrc_me', name: 'VidSrc.me', status: 'primary', reliability: 'high' },
        { id: 'vidsrc_icu', name: 'VidSrc.icu', status: 'secondary', reliability: 'high' },
        { id: 'multiembed', name: 'MultiEmbed', status: 'tertiary', reliability: 'medium' },
        { id: '2embed', name: '2Embed.cc', status: 'backup', reliability: 'medium' },
        { id: 'embedsu', name: 'Embed.su', status: 'fallback', reliability: 'low' }
    ];

    res.json({
        success: true,
        sources,
        defaultSource: 'vidsrc_me'
    });
});

module.exports = router;
