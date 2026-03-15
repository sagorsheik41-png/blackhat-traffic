const mongoose = require('mongoose');

const affiliateSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
    },
    type: {
        type: String,
        enum: ['app', 'offer', 'banner', 'cpa'],
        default: 'offer',
        index: true,
    },
    url: {
        type: String,
        required: [true, 'URL is required'],
    },
    imageUrl: {
        type: String,
        default: '',
    },
    description: {
        type: String,
        default: '',
    },
    targetCountries: [{
        type: String, // e.g. 'US', 'SA', 'IN', 'AE'
    }],
    // Tracking counters
    clicks: {
        type: Number,
        default: 0,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    displayOrder: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Affiliate', affiliateSchema);
