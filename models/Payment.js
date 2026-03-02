const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    method: {
        type: String,
        enum: ['bkash', 'nagad', 'rocket'],
        required: true
    },
    senderNumber: {
        type: String,
        required: true
    },
    trxId: {
        type: String,
        required: true,
        unique: true
    },
    tier: {
        type: String,
        enum: ['pro', 'ultimate'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'BDT'
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    adminNote: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

paymentSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Payment', paymentSchema);
