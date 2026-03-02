const express = require('express');
const router = express.Router();
const Payment = require('../../models/Payment');
const { requireAuth } = require('../../middleware/auth');

/**
 * @route   POST /api/payments/submit
 * @desc    Submit manual payment (TrxID) for verification
 * @access  Private
 */
router.post('/submit', requireAuth, async (req, res) => {
    try {
        const { method, senderNumber, trxId, tier } = req.body;

        if (!method || !senderNumber || !trxId || !tier) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }

        // Check if TrxID already exists
        const existingTx = await Payment.findOne({ trxId });
        if (existingTx) {
            return res.status(400).json({ success: false, error: 'This Transaction ID has already been submitted.' });
        }

        // Amount mock (optional: fetch from Settings)
        const amount = tier === 'ultimate' ? 11500 : 3500;

        const newPayment = new Payment({
            user: req.user._id,
            method,
            senderNumber,
            trxId,
            tier,
            amount,
            status: 'pending'
        });

        await newPayment.save();

        res.json({
            success: true,
            message: 'Payment submitted! Please wait for admin approval (usually within 1-2 hours).'
        });

    } catch (err) {
        console.error('Payment submit error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;
