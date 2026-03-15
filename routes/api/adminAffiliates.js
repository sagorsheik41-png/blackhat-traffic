const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../../middleware/auth');
const Affiliate = require('../../models/Affiliate');

router.use(requireAuth);
router.use(requireAdmin);

// ─── GET /api/admin/affiliates ───────────────────────────────
router.get('/', async (req, res) => {
    try {
        const affiliates = await Affiliate.find().sort({ displayOrder: 1, createdAt: -1 }).lean();
        res.json({ success: true, affiliates });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/admin/affiliates ──────────────────────────────
router.post('/', async (req, res) => {
    try {
        const { title, type, url, imageUrl, description, targetCountries, displayOrder } = req.body;
        const affiliate = new Affiliate({
            title, type, url, imageUrl, description,
            targetCountries: Array.isArray(targetCountries) ? targetCountries : (targetCountries ? targetCountries.split(',').map(c => c.trim().toUpperCase()) : []),
            displayOrder: parseInt(displayOrder) || 0,
        });
        await affiliate.save();
        res.json({ success: true, affiliate });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── PUT /api/admin/affiliates/:id ────────────────────────────
router.put('/:id', async (req, res) => {
    try {
        const { title, type, url, imageUrl, description, targetCountries, displayOrder, isActive } = req.body;
        const update = {
            title, type, url, imageUrl, description,
            targetCountries: Array.isArray(targetCountries) ? targetCountries : (targetCountries ? targetCountries.split(',').map(c => c.trim().toUpperCase()) : []),
            displayOrder: parseInt(displayOrder) || 0,
            isActive: isActive !== false,
        };
        const affiliate = await Affiliate.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!affiliate) return res.status(404).json({ error: 'Affiliate not found' });
        res.json({ success: true, affiliate });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── DELETE /api/admin/affiliates/:id ────────────────────────
router.delete('/:id', async (req, res) => {
    try {
        await Affiliate.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/admin/affiliates/:id/toggle ───────────────────
router.post('/:id/toggle', async (req, res) => {
    try {
        const affiliate = await Affiliate.findById(req.params.id);
        if (!affiliate) return res.status(404).json({ error: 'Affiliate not found' });
        affiliate.isActive = !affiliate.isActive;
        await affiliate.save();
        res.json({ success: true, isActive: affiliate.isActive });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/affiliates/:id/click (public) ──────────────────
router.post('/click/:id', async (req, res) => {
    try {
        await Affiliate.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } });
        res.json({ ok: true });
    } catch (err) {
        res.json({ ok: false });
    }
});

module.exports = router;
