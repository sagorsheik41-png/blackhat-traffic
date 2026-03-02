const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { requireTier } = require('../../middleware/tierGate');
const router = express.Router();

router.use(requireAuth);
router.use(requireTier('pro'));

router.get('/', (req, res) => {
    res.render('tools/multiDevice', { title: 'Multi-Device Preview' });
});

module.exports = router;
