const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
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
    content: {
        type: String,
        default: '',
    },
    excerpt: {
        type: String,
        default: '',
        maxlength: 300,
    },
    featuredImage: {
        type: String,
        default: '',
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    authorName: {
        type: String,
        default: 'Admin',
    },
    seoKeywords: [{
        type: String,
        trim: true,
    }],
    metaDescription: {
        type: String,
        default: '',
        maxlength: 320,
    },
    isPublished: {
        type: Boolean,
        default: true,
    },
    views: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});

// Auto-generate slug from title
blogSchema.pre('save', function (next) {
    if (this.isModified('title') && !this.slug) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 100) + '-' + Date.now();
    }
    // Auto-generate excerpt from content if not provided
    if (!this.excerpt && this.content) {
        this.excerpt = this.content.replace(/<[^>]+>/g, '').substring(0, 300);
    }
    next();
});

module.exports = mongoose.model('Blog', blogSchema);
