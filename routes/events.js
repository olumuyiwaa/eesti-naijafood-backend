// routes/events.js
const express = require('express');
const router = express.Router();
const Event = require('../models/Event');

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

// Get event gallery
// router.get('/gallery', async (req, res) => {
//     try {
//         const gallery = [
//             { id: 1, title: 'Afrobeat Night', image: '/images/gallery/1.jpg', date: '2025-11-08' },
//             { id: 2, title: 'Birthday Celebration', image: '/images/gallery/2.jpg', date: '2025-11-05' },
//             { id: 3, title: 'Corporate Event', image: '/images/gallery/3.jpg', date: '2025-11-01' }
//         ];
//
//         res.json({ success: true, gallery });
//     } catch (error) {
//         console.error('Gallery error:', error);
//         res.status(500).json({ success: false, message: 'Failed to fetch gallery' });
//     }
// });

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
router.post('/', async (req, res) => {
    try {
        const event = new Event(req.body);
        await event.save();
        res.json({ success: true, event });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to create event' });
    }
});

// PUT /api/events/:id
router.put('/:id', async (req, res) => {
    try {
        const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, event });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update event' });
    }
});

// DELETE /api/events/:id
router.delete('/:id', async (req, res) => {
    try {
        await Event.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete event' });
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