/**
 * InquiryForm Model
 * Stores inquiry/contact form submissions in MongoDB
 * Also syncs to Supabase PostgreSQL database
 */

const mongoose = require('mongoose');

const inquiryFormSchema = new mongoose.Schema({
    // User Information
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false, // Allow anonymous submissions
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: 255,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    phone: {
        type: String,
        trim: true,
        maxlength: 20,
    },

    // Message Information
    subject: {
        type: String,
        trim: true,
        maxlength: 255,
    },
    message: {
        type: String,
        required: [true, 'Message is required'],
        maxlength: 5000,
    },
    category: {
        type: String,
        enum: ['general', 'support', 'complaint', 'suggestion', 'account', 'billing', 'other'],
        default: 'general',
    },

    // Status Management
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'resolved', 'closed'],
        default: 'pending',
    },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal',
    },
    isResolved: {
        type: Boolean,
        default: false,
    },

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    resolvedAt: {
        type: Date,
    },

    // Admin Notes
    adminNotes: {
        type: String,
        maxlength: 2000,
    },

    // Metadata
    ipAddress: String,
    userAgent: String,
    attachments: [
        {
            filename: String,
            url: String,
            uploadedAt: Date,
        },
    ],
});

// Auto-update timestamps
inquiryFormSchema.pre('save', function (next) {
    this.updatedAt = new Date();

    if (this.isResolved && !this.resolvedAt) {
        this.resolvedAt = new Date();
        this.status = 'resolved';
    }

    next();
});

// Create index for faster queries
inquiryFormSchema.index({ email: 1 });
inquiryFormSchema.index({ status: 1 });
inquiryFormSchema.index({ userId: 1 });
inquiryFormSchema.index({ createdAt: -1 });

// Virtual for full URL to view inquiry detail
inquiryFormSchema.virtual('detailUrl').get(function () {
    return `/dashboard/inquiries/${this._id}`;
});

// toJSON to include virtuals
inquiryFormSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('InquiryForm', inquiryFormSchema);
