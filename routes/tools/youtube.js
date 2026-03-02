const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res) => {
    res.render('tools/youtube', { title: 'YouTube Content Generator' });
});

module.exports = router;
