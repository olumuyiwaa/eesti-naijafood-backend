const express = require('express');
const router = express.Router();
const { getSiteDetails, updateSiteDetails, updateAbout, deleteAboutImage } = require('../controllers/siteDetailsController');
const { requireAdmin } = require('../middleware/adminAuth');
const uploadMiddleware = require('../middleware/upload');

// Get site details (public)
router.get('/', getSiteDetails);

// Update site details (admin only)
router.put('/', updateSiteDetails);

// Update about section with image upload (admin only)
router.put('/about', uploadMiddleware.siteDetails.single('image'), updateAbout);

// Delete about image (admin only)
router.delete('/about/image', deleteAboutImage);

module.exports = router;
