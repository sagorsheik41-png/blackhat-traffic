const mongoose = require('mongoose');

const videoAnalyticsSchema = new mongoose.Schema({
    video: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video',
        required: true,
        index: true,
    },
    event: {
        type: String,
        enum: ['view', 'popup_click', 'redirect_click'],
        required: true,
        index: true,
    },
    ip: {
        type: String,
        default: '',
    },
    country: {
        type: String,
        default: 'Unknown',
        index: true,
    },
    userAgent: {
        type: String,
        default: '',
    },
    sessionId: {
        type: String,
        default: '',
    },
}, {
    timestamps: true,
});

// TTL index: keep raw analytics for 90 days
videoAnalyticsSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('VideoAnalytics', videoAnalyticsSchema);
