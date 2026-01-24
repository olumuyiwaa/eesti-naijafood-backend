const mongoose = require('mongoose');

const SiteDetailsSchema = new mongoose.Schema(
    {
        about: {
            text: {
                type: String,
                required: true,
            },
            image: {
                type: String, // Cloudinary URL
            },
        },
        missionStatement: {
            type: String,
            required: true,
        },
        phoneNumber: {
            type: String,
            required: true,
        },
        location: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
        },
        openingHours: {
            mondayWednesday: {
                open: String, // e.g., "09:00"
                close: String, // e.g., "22:00"
            },
            thursdaySunday: {
                open: String,
                close: String,
            },
        },
        socialMedia: {
            facebook: String,
            instagram: String,
            tiktok: String,
            youtube: String,
        },
    },
    { timestamps: true }
);

// Ensure only one document exists (singleton pattern)
SiteDetailsSchema.statics.findOrCreate = async function () {
    let doc = await this.findOne();
    if (!doc) {
        doc = await this.create({
            about: { text: '' },
            missionStatement: '',
            phoneNumber: '',
            location: '',
            email: '',
            openingHours: {
                mondayWednesday: { open: '', close: '' },
                thursdaySunday: { open: '', close: '' },
            },
            socialMedia: {
                facebook: '',
                instagram: '',
                tiktok: '',
                youtube: '',
            },
        });
    }
    return doc;
};

module.exports = mongoose.model('SiteDetails', SiteDetailsSchema);
