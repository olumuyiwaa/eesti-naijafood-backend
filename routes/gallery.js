const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { body, validationResult } = require('express-validator');

// Cloudinary config (make sure process.env vars are set)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer memory storage (we'll upload buffer to Cloudinary manually)
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPG, JPEG, PNG allowed.'));
        }
    }
});

// POST: Upload image to gallery
router.post(
    '/',
    upload.single('image'), // Assumes the file field is named 'image'
    [
        // Optional validation (add more as needed)
        body('title').optional().trim() // Example: if you add a title field
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            if (!req.file) {
                return res.status(400).json({ success: false, message: "No file uploaded" });
            }

            // Upload buffer to Cloudinary using a stream (simplified, no streamifier needed)
            const result = await new Promise((resolve, reject) => {
                const cloudinaryStream = cloudinary.uploader.upload_stream(
                    {
                        folder: "gallery",
                        allowed_formats: ["jpg", "png", "jpeg"],
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );

                // Directly end the stream with the buffer
                cloudinaryStream.end(req.file.buffer);
            });

            res.status(200).json({
                success: true,
                message: "Image uploaded successfully",
                imageUrl: result.secure_url,
                publicId: result.public_id
            });
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ success: false, message: "Upload failed", error: error.message });
        }
    }
);

// GET: List all gallery images
router.get('/', async (req, res) => {
    try {
        const { resources } = await cloudinary.api.resources({
            type: "upload",
            prefix: "gallery/",
            max_results: 100 // Adjust as needed; consider adding pagination
        });
        const images = resources.map((img) => ({
            url: img.secure_url,
            publicId: img.public_id
        }));
        res.status(200).json({ success: true, images });
    } catch (error) {
        console.error('Retrieve images error:', error);
        res.status(500).json({ success: false, message: "Failed to retrieve images", error: error.message });
    }
});

// DELETE: Delete image by public ID
router.delete('/:publicId', async (req, res) => {
    try {
        const { publicId } = req.params;

        // Ensure full Cloudinary public ID
        const fullId = publicId.startsWith("gallery/")
            ? publicId
            : `gallery/${publicId}`;

        const deletionResult = await cloudinary.uploader.destroy(fullId);

        if (deletionResult.result === 'ok') {
            return res.status(200).json({
                success: true,
                message: "Image deleted successfully"
            });
        }

        return res.status(404).json({
            success: false,
            message: "Image not found or already deleted"
        });

    } catch (error) {
        console.error("Deletion error:", error);
        res.status(500).json({
            success: false,
            message: "Deletion failed",
            error: error.message
        });
    }
});


module.exports = router;