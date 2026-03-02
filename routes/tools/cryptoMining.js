const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { requireTier } = require('../../middleware/tierGate');
const router = express.Router();

router.use(requireAuth);
router.use(requireTier('ultimate'));

router.get('/', (req, res) => {
    res.render('tools/cryptoMining', { title: 'Crypto Mining dApp' });
});

module.exports = router;
