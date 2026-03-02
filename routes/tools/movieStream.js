const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res) => {
    res.render('tools/movieStream', { title: 'Movie Streaming' });
});

module.exports = router;
