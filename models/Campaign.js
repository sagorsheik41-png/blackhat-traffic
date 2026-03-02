const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['Pending', 'Active', 'Completed', 'Rejected'],
        default: 'Pending'
    },
    // Targeting Options
    targeting: {
        countries: [{
            type: String,
            trim: true
        }],
        ipRotation: {
            type: Boolean,
            default: false
        },
        userAgentRotation: {
            type: Boolean,
            default: false
        },
        browsers: [{
            type: String,
            enum: ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera', 'Mobile Chrome', 'Mobile Safari'],
        }]
    },
    // Campaign Stats - Start at 0
    stats: {
        totalVisitors: {
            type: Number,
            default: 0
        },
        clicks: {
            type: Number,
            default: 0
        },
        conversions: {
            type: Number,
            default: 0
        },
        revenue: {
            type: Number,
            default: 0
        }
    },
    // Campaign Configuration
    startUrl: {
        type: String,
        default: ''
    },
    dailyBudget: {
        type: Number,
        default: 0
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        default: null
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

module.exports = mongoose.model('Campaign', campaignSchema);
