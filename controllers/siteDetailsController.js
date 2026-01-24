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
        let { about, missionStatement, phoneNumber, location, email, openingHours, socialMedia } = req.body;
        
        // Parse JSON strings if they come as strings from FormData
        if (typeof about === 'string') {
            try {
                about = JSON.parse(about);
            } catch (e) {
                about = { text: about };
            }
        }
        if (typeof openingHours === 'string') {
            try {
                openingHours = JSON.parse(openingHours);
            } catch (e) {
                console.log('Failed to parse openingHours:', e.message);
            }
        }
        if (typeof socialMedia === 'string') {
            try {
                socialMedia = JSON.parse(socialMedia);
            } catch (e) {
                console.log('Failed to parse socialMedia:', e.message);
            }
        }
        
        console.log('Parsed data:', { about, missionStatement, phoneNumber, location, email, openingHours, socialMedia });
        
        let siteDetails = await SiteDetails.findOne();
        
        if (!siteDetails) {
            siteDetails = new SiteDetails();
        }

        // Update fields if provided and not empty
        if (about && about.text && typeof about.text === 'string' && about.text.trim()) {
            siteDetails.about.text = about.text.trim();
        }
        if (req.file) {
            siteDetails.about.image = req.file.path; // Cloudinary URL
        }
        if (missionStatement && typeof missionStatement === 'string' && missionStatement.trim()) {
            siteDetails.missionStatement = missionStatement.trim();
        }
        if (phoneNumber && typeof phoneNumber === 'string' && phoneNumber.trim()) {
            siteDetails.phoneNumber = phoneNumber.trim();
        }
        if (location && typeof location === 'string' && location.trim()) {
            siteDetails.location = location.trim();
        }
        if (email && typeof email === 'string' && email.trim()) {
            siteDetails.email = email.trim();
        }
        if (openingHours && typeof openingHours === 'object') {
            siteDetails.openingHours = openingHours;
        }
        if (socialMedia && typeof socialMedia === 'object') {
            siteDetails.socialMedia = socialMedia;
        }

        console.log('Before save:', siteDetails);
        await siteDetails.save();
        console.log('After save:', siteDetails);

        res.status(200).json({
            success: true,
            message: 'Site details updated successfully',
            data: siteDetails,
        });
    } catch (error) {
        console.error('Update site details error:', error);
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
