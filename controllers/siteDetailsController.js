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
        const { about, missionStatement, phoneNumber, location, email, openingHours, socialMedia } = req.body;
        
        let siteDetails = await SiteDetails.findOne();
        
        if (!siteDetails) {
            siteDetails = new SiteDetails();
        }

        // Update fields if provided
        if (about && about.text) {
            siteDetails.about.text = about.text;
        }
        if (req.file) {
            siteDetails.about.image = req.file.path; // Cloudinary URL
        }
        if (missionStatement) siteDetails.missionStatement = missionStatement;
        if (phoneNumber) siteDetails.phoneNumber = phoneNumber;
        if (location) siteDetails.location = location;
        if (email) siteDetails.email = email;
        if (openingHours) siteDetails.openingHours = openingHours;
        if (socialMedia) siteDetails.socialMedia = socialMedia;

        await siteDetails.save();

        res.status(200).json({
            success: true,
            message: 'Site details updated successfully',
            data: siteDetails,
        });
    } catch (error) {
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
