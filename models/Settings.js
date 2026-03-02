const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    pricing: {
        pro: { type: Number, default: 29 },
        ultimate: { type: Number, default: 99 },
        currency: { type: String, default: 'USD' }
    },
    pricingBDT: {
        pro: { type: Number, default: 3500 },
        ultimate: { type: Number, default: 11500 },
        currency: { type: String, default: 'BDT' }
    },
    merchantNumbers: {
        bkash: { type: String, default: '01XXXXXXXXX' },
        nagad: { type: String, default: '01XXXXXXXXX' },
        rocket: { type: String, default: '01XXXXXXXXX' }
    },
    apiKeys: {
        tmdb: { type: String, default: '' },
        ollama: { type: String, default: '' },
        traffic: { type: String, default: '' }
    },
    useBDT: {
        type: Boolean,
        default: true
    },
    sidebarAdsEnabled: {
        type: Boolean,
        default: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

settingsSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Settings', settingsSchema);
