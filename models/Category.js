const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true,
        unique: true,
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
    icon: {
        type: String,
        default: '🎬',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});

categorySchema.pre('save', function (next) {
    if (this.isModified('name') && !this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }
    next();
});

const Category = mongoose.model('Category', categorySchema);

// Seed default categories if none exist
Category.seedDefaults = async () => {
    const count = await Category.countDocuments();
    if (count === 0) {
        const defaults = [
            { name: 'Movies', slug: 'movies', icon: '🎬', description: 'Latest movies and film content' },
            { name: 'Web Series', slug: 'web-series', icon: '📺', description: 'TV shows and web series' },
            { name: 'Mobile Apps', slug: 'mobile-apps', icon: '📱', description: 'Android & iOS applications' },
            { name: 'Games', slug: 'games', icon: '🎮', description: 'PC and mobile games' },
            { name: 'Software', slug: 'software', icon: '💻', description: 'PC software tools and utilities' },
            { name: 'Courses', slug: 'courses', icon: '📚', description: 'Online learning and tutorials' },
        ];
        await Category.insertMany(defaults);
        console.log('🏷️  Default categories seeded.');
    }
};

module.exports = Category;
