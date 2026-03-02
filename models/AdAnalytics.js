const mongoose = require('mongoose');

const adAnalyticsSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ad: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdManager',
        required: true
    },
    // View tracking
    viewCount: {
        type: Number,
        default: 0
    },
    // Duration tracking (in milliseconds)
    totalDurationMs: {
        type: Number,
        default: 0
    },
    // Session-based tracking
    sessions: [{
        sessionId: String,
        startTime: Date,
        endTime: Date,
        durationMs: Number,
        viewed: Boolean
    }],
    // Latest interaction
    lastViewed: {
        type: Date,
        default: null
    },
    lastTrackedAt: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Index for efficient queries
adAnalyticsSchema.index({ user: 1, ad: 1 });
adAnalyticsSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AdAnalytics', adAnalyticsSchema);
