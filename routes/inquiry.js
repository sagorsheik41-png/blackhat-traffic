/**
 * Inquiry Form Routes
 * Handles submission, retrieval, and management of inquiry forms
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const InquiryForm = require('../models/InquiryForm');
const { optionalAuth } = require('../middleware/auth');
const router = express.Router();

// ─── GET /inquiry ──────────────────────────────────────────
// Get all inquiries (admin only) or user's own inquiries
router.get('/', optionalAuth, async (req, res) => {
    try {
        let query = {};

        // If not admin, only show user's own inquiries
        if (req.user && req.user.role !== 'admin') {
            query.userId = req.user._id;
        } else if (!req.user) {
            // Not logged in - no access
            return res.status(401).json('Please login to view inquiries');
        }

        const inquiries = await InquiryForm.find(query)
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .limit(50);

        res.json(inquiries);
    } catch (err) {
        console.error('Error fetching inquiries:', err);
        res.status(500).json('Error fetching inquiries');
    }
});

// ─── GET /inquiry/:id ──────────────────────────────────────
// Get specific inquiry by ID
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const inquiry = await InquiryForm.findById(req.params.id).populate('userId', 'name email');

        if (!inquiry) {
            return res.status(404).json('Inquiry not found');
        }

        // Check permissions
        if (req.user && (req.user._id == inquiry.userId || req.user.role === 'admin')) {
            return res.json(inquiry);
        }

        res.status(403).json('Unauthorized');
    } catch (err) {
        console.error('Error fetching inquiry:', err);
        res.status(500).json('Error fetching inquiry');
    }
});

// ─── POST /inquiry ────────────────────────────────────────
// Submit new inquiry form
router.post(
    '/',
    [
        body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 255 }),
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('phone').optional().trim().isLength({ max: 20 }),
        body('subject').optional().trim().isLength({ max: 255 }),
        body('message')
            .trim()
            .notEmpty()
            .withMessage('Message is required')
            .isLength({ min: 10, max: 5000 })
            .withMessage('Message must be between 10 and 5000 characters'),
        body('category')
            .optional()
            .isIn(['general', 'support', 'complaint', 'suggestion', 'account', 'billing', 'other']),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { name, email, phone, subject, message, category } = req.body;

            // Create inquiry in MongoDB
            const inquiry = new InquiryForm({
                userId: req.user ? req.user._id : null,
                name,
                email,
                phone,
                subject,
                message,
                category: category || 'general',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
            });

            await inquiry.save();

            // Also try to save to Supabase
            if (req.user) {
                try {
                    const { data, error } = await supabase.from('inquiry_forms').insert([
                        {
                            user_id: req.user.supabaseId || null, // Assuming user has supabaseId
                            name,
                            email,
                            phone,
                            subject,
                            message,
                            category: category || 'general',
                            status: 'pending',
                            priority: 'normal',
                        },
                    ]);

                    if (error) {
                        console.error('Supabase insert error:', error);
                        // Continue anyway - MongoDB save was successful
                    }
                } catch (supabseErr) {
                    console.error('Supabase sync error:', supabseErr);
                    // Continue anyway - MongoDB save was successful
                }
            }

            res.status(201).json({
                success: true,
                message: 'Inquiry submitted successfully!',
                inquiry: inquiry,
            });
        } catch (err) {
            console.error('Error creating inquiry:', err);
            res.status(500).json({ error: 'Error creating inquiry' });
        }
    }
);

// ─── PUT /inquiry/:id ──────────────────────────────────────
// Update inquiry (admin only)
router.put('/:id', optionalAuth, async (req, res) => {
    try {
        // Check if admin
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json('Only admins can update inquiries');
        }

        const allowedUpdates = ['status', 'priority', 'adminNotes', 'isResolved'];
        const updates = {};

        allowedUpdates.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const inquiry = await InquiryForm.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true,
        });

        if (!inquiry) {
            return res.status(404).json('Inquiry not found');
        }

        // Sync update to Supabase if available
        try {
            await supabase
                .from('inquiry_forms')
                .update({
                    status: updates.status,
                    priority: updates.priority,
                    admin_notes: updates.adminNotes,
                    is_resolved: updates.isResolved,
                })
                .eq('id', inquiry._id);
        } catch (supabseErr) {
            console.error('Supabase update error:', supabseErr);
            // Continue anyway
        }

        res.json({
            success: true,
            message: 'Inquiry updated successfully!',
            inquiry,
        });
    } catch (err) {
        console.error('Error updating inquiry:', err);
        res.status(500).json({ error: 'Error updating inquiry' });
    }
});

// ─── DELETE /inquiry/:id ───────────────────────────────────
// Delete inquiry (admin only)
router.delete('/:id', optionalAuth, async (req, res) => {
    try {
        // Check if admin
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json('Only admins can delete inquiries');
        }

        const inquiry = await InquiryForm.findByIdAndDelete(req.params.id);

        if (!inquiry) {
            return res.status(404).json('Inquiry not found');
        }

        // Also delete from Supabase
        try {
            await supabase.from('inquiry_forms').delete().eq('id', inquiry._id);
        } catch (supabseErr) {
            console.error('Supabase delete error:', supabseErr);
            // Continue anyway
        }

        res.json({
            success: true,
            message: 'Inquiry deleted successfully!',
        });
    } catch (err) {
        console.error('Error deleting inquiry:', err);
        res.status(500).json({ error: 'Error deleting inquiry' });
    }
});

// ─── GET /inquiry/stats/dashboard ──────────────────────────
// Get inquiry statistics for dashboard (admin only)
router.get('/stats/dashboard', optionalAuth, async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json('Only admins can view stats');
        }

        const stats = {
            total: await InquiryForm.countDocuments(),
            pending: await InquiryForm.countDocuments({ status: 'pending' }),
            inProgress: await InquiryForm.countDocuments({ status: 'in_progress' }),
            resolved: await InquiryForm.countDocuments({ status: 'resolved' }),
            urgent: await InquiryForm.countDocuments({ priority: 'urgent' }),
        };

        res.json(stats);
    } catch (err) {
        console.error('Error fetching stats:', err);
        res.status(500).json({ error: 'Error fetching stats' });
    }
});

module.exports = router;
