const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res) => {
    res.render('tools/linkTools', { title: 'URL & Link Tools' });
});

module.exports = router;
