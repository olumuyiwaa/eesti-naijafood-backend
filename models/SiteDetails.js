const mongoose = require('mongoose');

const SiteDetailsSchema = new mongoose.Schema(
    {
        about: {
            text: {
                type: String,
                default: '',
            },
            image: {
                type: String, // Cloudinary URL
            },
        },
        missionStatement: {
            type: String,
            default: '',
        },
        phoneNumber: {
            type: String,
            default: '',
        },
        location: {
            type: String,
            default: '',
        },
        email: {
            type: String,
            default: '',
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
