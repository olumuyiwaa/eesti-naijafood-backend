const express = require('express');
const router = express.Router();
const { getSiteDetails, updateSiteDetails, updateAbout, deleteAboutImage } = require('../controllers/siteDetailsController');
const { adminAuth } = require('../middleware/adminAuth');
const upload = require('../middleware/upload');

// Get site details (public)
router.get('/', getSiteDetails);

// Update site details (admin only)
router.put('/', adminAuth, updateSiteDetails);

// Update about section with image upload (admin only)
router.put('/about', adminAuth, upload.siteDetails.single('image'), updateAbout);

// Delete about image (admin only)
router.delete('/about/image', adminAuth, deleteAboutImage);

module.exports = router;
