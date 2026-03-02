const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: 100,
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6,
        select: false,  // Don't return password by default
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    tier: {
        type: String,
        enum: ['free', 'pro', 'ultimate'],
        default: 'free',
    },
    avatar: {
        type: String,
        default: '',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    lastLogin: {
        type: Date,
        default: null,
    },
    apiKeys: {
        gemini: { type: String, default: '' },
        tmdb: { type: String, default: '' }
    },
    // Traffic Pro Statistics
    trafficProStats: {
        totalVisitors: { type: Number, default: 0 },
        totalClicks: { type: Number, default: 0 },
        totalRevenue: { type: Number, default: 0 },
        conversionRate: { type: Number, default: 0 },
        lastUpdate: { type: Date, default: Date.now }
    },
    // User Status for Admin
    status: {
        type: String,
        enum: ['pending', 'active', 'rejected', 'banned'],
        default: 'active'
    },
    // Campaigns for Traffic Pro
    campaigns: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign'
    }]
}, {
    timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare candidate password with stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Return user as JSON without password
userSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    return user;
};

module.exports = mongoose.model('User', userSchema);
