const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const router = express.Router();

/**
 * TMDB API Proxy — keeps API key server-side.
 * Proxies requests to api.themoviedb.org with the server's API key.
 * Now handles ANY valid TMDB endpoint (e.g., /movie/popular, /search/tv, /movie/123/credits).
 */

router.use(requireAuth);

router.get('/*', async (req, res) => {
    try {
        let tmdbPath = req.params[0];
        // Remove leading slash if present
        if (tmdbPath.startsWith('/')) tmdbPath = tmdbPath.slice(1);

        // Removed Database dependency based on user instructions
        // Hardcode the API key
        let apiKey = '05902896074695709d7763505bb88b4d';


        // Reconstruct query string
        const queryParams = new URLSearchParams(req.query);
        queryParams.set('api_key', apiKey);

        const url = `https://api.themoviedb.org/3/${tmdbPath}?${queryParams.toString()}`;
        console.log(`🎬 TMDB Proxy Request: ${url}`);

        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ TMDB API Error (${response.status}):`, errorText);
            return res.status(response.status).json({ error: 'TMDB API error', details: errorText });
        }

        const data = await response.json();
        res.status(200).json(data);
    } catch (err) {
        console.error('❌ TMDB proxy exception:', err);
        res.status(500).json({ error: 'Failed to fetch from TMDB', message: err.message });
    }
});

module.exports = router;
