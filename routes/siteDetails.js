const express = require('express');
const router = express.Router();
const { getSiteDetails, updateSiteDetails, updateAbout, deleteAboutImage } = require('../controllers/siteDetailsController');
const { requireAdmin } = require('../middleware/adminAuth');
const uploadMiddleware = require('../middleware/upload');

// Get site details (public)
router.get('/', getSiteDetails);

// Update site details (admin only)
router.put('/', requireAdmin, updateSiteDetails);

// Update about section with image upload (admin only)
router.put('/about', requireAdmin, uploadMiddleware.siteDetails.single('image'), updateAbout);

// Delete about image (admin only)
router.delete('/about/image', requireAdmin, deleteAboutImage);

module.exports = router;
