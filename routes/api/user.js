const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const { requireAuth } = require('../../middleware/auth');

/**
 * @route   POST /api/user/keys
 * @desc    Save/Update user-specific API keys
 */
router.post('/keys', requireAuth, async (req, res) => {
    try {
        const { apiKeys } = req.body;

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        if (apiKeys) {
            user.apiKeys = { ...user.apiKeys, ...apiKeys };
            await user.save();
        }

        res.json({ success: true, message: 'API keys updated successfully' });
    } catch (err) {
        console.error('API Key update error:', err);
        res.status(500).json({ success: false, error: 'Failed to update keys' });
    }
});

module.exports = router;
