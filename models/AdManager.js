const mongoose = require('mongoose');

const adManagerSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    status: {
        type: Boolean,
        default: false  // ON/OFF
    },
    // Ad Configuration
    htmlContent: {
        type: String,
        required: true
    },
    iframeUrl: {
        type: String,
        default: ''
    },
    // Display Timing
    displayDelay: {
        type: Number,
        default: 0,  // Delay in milliseconds (5000 = 5 seconds, 600000 = 10 minutes, etc.)
    },
    displayDelayUnit: {
        type: String,
        enum: ['seconds', 'minutes', 'hours'],
        default: 'seconds'
    },
    // Targeting
    targetUsers: {
        type: String,
        enum: ['all', 'free', 'pro', 'ultimate'],
        default: 'all'
    },
    // Display Frequency
    displayOnce: {
        type: Boolean,
        default: false  // If true, only show once per session
    },
    // Sidebar Ad Configuration (NEW)
    isSidebarAd: {
        type: Boolean,
        default: false  // Is this a sidebar ad?
    },
    sidebarAdStatus: {
        type: Boolean,
        default: false  // ON/OFF toggle specifically for sidebar
    },
    // Tracking
    impressions: {
        type: Number,
        default: 0
    },
    clicks: {
        type: Number,
        default: 0
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

module.exports = mongoose.model('AdManager', adManagerSchema);
