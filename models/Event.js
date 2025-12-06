// models/Event.js
const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['african-experience', 'special-event', 'private-event'],
        default: 'african-experience'
    },
    genre: {
        type: String,
        enum: ['Afrobeat', 'Amapiano', 'Highlife', 'Drumming', 'Mixed']
    },

    imageUrl: String,
    imagePublicId: String,
    capacity: Number,
    bookingsCount: {
        type: Number,
        default: 0
    },
    isPublished: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

eventSchema.index({ date: 1, isPublished: 1 });

module.exports = mongoose.model('Event', eventSchema);