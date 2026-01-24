const SiteDetails = require('../models/SiteDetails');

// Get site details
exports.getSiteDetails = async (req, res) => {
    try {
        const siteDetails = await SiteDetails.findOrCreate();
        res.status(200).json({
            success: true,
            data: siteDetails,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching site details',
            error: error.message,
        });
    }
};
// Create or update site details
exports.updateSiteDetails = async (req, res) => {
    try {
        console.log('Raw req.body:', req.body);
        console.log('File:', req.file);

        let { about, missionStatement, phoneNumber, location, email, openingHours, socialMedia } = req.body;

        // Safe JSON parsing
        const safeParse = (value, fallback = {}) => {
            if (!value) return fallback;
            if (typeof value === 'object') return value;
            try {
                return JSON.parse(value);
            } catch {
                return fallback;
            }
        };

        about = safeParse(about, { text: '' });
        openingHours = safeParse(openingHours, {});
        socialMedia = safeParse(socialMedia, {});

        console.log('Parsed:', {
            about,
            missionStatement,
            phoneNumber,
            location,
            email,
            openingHours,
            socialMedia,
        });

        let siteDetails = await SiteDetails.findOne();
        if (!siteDetails) siteDetails = new SiteDetails();

        // Always update (not conditionally blocked)
        siteDetails.about.text = about?.text ?? '';
        if (req.file?.path) {
            siteDetails.about.image = req.file.path;
        }

        siteDetails.missionStatement = missionStatement ?? '';
        siteDetails.phoneNumber = phoneNumber ?? '';
        siteDetails.location = location ?? '';
        siteDetails.email = email ?? '';
        siteDetails.openingHours = openingHours ?? {};
        siteDetails.socialMedia = socialMedia ?? {};

        await siteDetails.save();

        console.log('Saved:', siteDetails);

        res.status(200).json({
            success: true,
            message: 'Site details updated successfully',
            data: siteDetails,
        });
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating site details',
            error: error.message,
        });
    }
};

// Update about with image
exports.updateAbout = async (req, res) => {
    try {
        const { text } = req.body;

        if (!text && !req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please provide about text or image',
            });
        }

        let siteDetails = await SiteDetails.findOrCreate();

        if (text) siteDetails.about.text = text;
        if (req.file) siteDetails.about.image = req.file.path;

        await siteDetails.save();

        res.status(200).json({
            success: true,
            message: 'About section updated successfully',
            data: siteDetails.about,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating about section',
            error: error.message,
        });
    }
};

// Delete site details image
exports.deleteAboutImage = async (req, res) => {
    try {
        const siteDetails = await SiteDetails.findOne();

        if (!siteDetails) {
            return res.status(404).json({
                success: false,
                message: 'Site details not found',
            });
        }

        siteDetails.about.image = null;
        await siteDetails.save();

        res.status(200).json({
            success: true,
            message: 'About image deleted successfully',
            data: siteDetails,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting about image',
            error: error.message,
        });
    }
};
