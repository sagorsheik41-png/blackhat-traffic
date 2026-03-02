const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    action: {
        type: String,
        required: true,
        enum: [
            'login', 'logout', 'register',
            'tool_access', 'content_generate',
            'file_upload', 'file_download',
            'tier_upgrade', 'settings_change',
            'admin_action',
        ],
    },
    tool: {
        type: String,
        default: null,
    },
    details: {
        type: String,
        default: '',
    },
    ip: {
        type: String,
        default: '',
    },
    userAgent: {
        type: String,
        default: '',
    },
}, {
    timestamps: true,
});

// Index for efficient querying
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
