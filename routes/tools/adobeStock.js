const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res) => {
    res.render('tools/adobeStock', { title: 'Adobe Stock Suite' });
});

module.exports = router;
