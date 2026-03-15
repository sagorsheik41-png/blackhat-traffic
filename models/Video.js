const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: 200,
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true,
    },
    description: {
        type: String,
        default: '',
    },
    thumbnail: {
        type: String,
        default: '',
    },
    // Optional short preview video (10-20 seconds)
    previewVideoUrl: {
        type: String,
        default: '',
    },
    // The TeraBox full video link
    teraboxLink: {
        type: String,
        required: [true, 'TeraBox link is required'],
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null,
    },
    tags: [{
        type: String,
        trim: true,
    }],
    releaseDate: {
        type: Date,
        default: Date.now,
    },
    // SEO
    seoTitle: {
        type: String,
        default: '',
        maxlength: 160,
    },
    seoDescription: {
        type: String,
        default: '',
        maxlength: 320,
    },
    // Analytics counters (fast denormalized counts)
    stats: {
        views: { type: Number, default: 0 },
        popupClicks: { type: Number, default: 0 },
        redirectClicks: { type: Number, default: 0 },
    },
    isFeatured: {
        type: Boolean,
        default: false,
    },
    isTrending: {
        type: Boolean,
        default: false,
    },
    isPublished: {
        type: Boolean,
        default: true,
    },
    // Country-specific TeraBox links (optional override)
    countryLinks: [{
        country: { type: String }, // e.g. 'US', 'SA', 'AE', 'IN'
        link: { type: String },
        popupMessage: { type: String },
    }],
}, {
    timestamps: true,
});

// Auto-generate slug from title before save
videoSchema.pre('save', function (next) {
    if (this.isModified('title') && !this.slug) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 100) + '-' + Date.now();
    }
    next();
});

// Virtual for conversion rate
videoSchema.virtual('conversionRate').get(function () {
    if (!this.stats.popupClicks) return 0;
    return ((this.stats.redirectClicks / this.stats.popupClicks) * 100).toFixed(1);
});

videoSchema.set('toJSON', { virtuals: true });
videoSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Video', videoSchema);
