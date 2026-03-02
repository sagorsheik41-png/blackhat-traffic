const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res) => {
    res.render('tools/trafficPro', { title: 'Traffic Pro Automation' });
});

module.exports = router;
