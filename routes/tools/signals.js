const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { requireTier } = require('../../middleware/tierGate');
const router = express.Router();

router.use(requireAuth);
router.use(requireTier('pro'));

router.get('/', (req, res) => {
    res.render('tools/signals', { title: 'Signal Dashboards' });
});

module.exports = router;
