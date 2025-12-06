// routes/events.js
const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

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

// Get upcoming events
router.get('/upcoming', async (req, res) => {
    try {
        // Get events with date >= today, sorted by date ascending
        const today = new Date();
        const events = await Event.find({ date: { $gte: today } }).sort({ date: 1 });

        res.json({ success: true, events });
    } catch (error) {
        console.error('Events error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch events' });
    }
});

// Get African Experience schedule
router.get('/african-experience', async (req, res) => {
    try {
        const schedule = {
            thursday: { genre: 'Afrobeat', time: '21:00-23:30', description: 'Classic and modern Afrobeat' },
            friday: { genre: 'Amapiano', time: '21:00-23:30', description: 'South African house music vibes' },
            saturday: { genre: 'Highlife & Afrobeat Mix', time: '21:00-23:30', description: 'Best of African music' },
            sunday: { genre: 'Live Drumming', time: '21:00-23:30', description: 'Traditional drumming sessions' }
        };

        res.json({ success: true, schedule });
    } catch (error) {
        console.error('African Experience error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch schedule' });
    }
});


// POST /api/events
// Accepts optional single image field named 'image'. If provided, uploads to Cloudinary
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const eventData = { ...req.body };

        if (req.file) {
            // upload buffer to Cloudinary
            const result = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: "events",
                        allowed_formats: ["jpg", "png", "jpeg"],
                    },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );
                stream.end(req.file.buffer);
            });

            eventData.imageUrl = result.secure_url;
            eventData.imagePublicId = result.public_id; // store full public id (with folder)
        }

        const event = new Event(eventData);
        await event.save();
        res.json({ success: true, event });
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ success: false, message: 'Failed to create event', error: error.message });
    }
});

// PUT /api/events/:id
// Accepts optional single image field named 'image'. If provided, replaces previous image in Cloudinary.
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const updateData = { ...req.body };

        if (req.file) {
            // Find existing event to delete old image if present
            const existing = await Event.findById(req.params.id);
            if (existing && existing.imagePublicId) {
                try {
                    await cloudinary.uploader.destroy(existing.imagePublicId);
                } catch (err) {
                    console.warn('Failed to delete previous image from Cloudinary:', err.message);
                    // continue - not fatal
                }
            }

            // upload new file
            const result = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: "events",
                        allowed_formats: ["jpg", "png", "jpeg"],
                    },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );
                stream.end(req.file.buffer);
            });

            updateData.imageUrl = result.secure_url;
            updateData.imagePublicId = result.public_id;
        }

        const event = await Event.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json({ success: true, event });
    } catch (error) {
        console.error('Update event error:', error);
        res.status(500).json({ success: false, message: 'Failed to update event', error: error.message });
    }
});

// ...existing code...
// DELETE /api/events/:id
router.delete('/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (event && event.imagePublicId) {
            try {
                await cloudinary.uploader.destroy(event.imagePublicId);
            } catch (err) {
                console.warn('Failed to delete image from Cloudinary during event deletion:', err.message);
                // continue with deleting event record
            }
        }

        await Event.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete event', error: error.message });
    }
});

// PATCH /api/events/:id/publish
router.patch('/:id/publish', async (req, res) => {
    try {
        const { isPublished } = req.body;
        const event = await Event.findByIdAndUpdate(req.params.id, { isPublished }, { new: true });
        res.json({ success: true, event });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update publish status' });
    }
});

module.exports = router;