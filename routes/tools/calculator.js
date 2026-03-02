const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res) => {
    res.render('tools/calculator', { title: 'View Cost Calculator' });
});

module.exports = router;
