// routes/bookings.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const Booking = require('../models/Booking');

// Email transporter setup
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Validation middleware
const bookingValidation = [
    body('name').trim().notEmpty(),
    body('email').isEmail(),
    body('phone').trim().notEmpty(),
    body('date').isISO8601(),
    body('time').trim().notEmpty(),
    body('guests').isInt({ min: 1, max: 50 }),
    body('bookingType').isIn(['dine-in', 'event', 'african-experience']),
    body('specialRequests').optional().trim()
];

// ------------------------------------
// ✅ CREATE NEW BOOKING
// ------------------------------------
router.post('/', bookingValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { name, email, phone, date, time, guests, bookingType, specialRequests } = req.body;

        const bookingRef = `AFR${Date.now().toString().slice(-8)}`;

        const booking = await Booking.create({
            bookingRef,
            name,
            email,
            phone,
            date,
            time,
            guests,
            bookingType,
            specialRequests
        });

        // Send emails (optional)
        try {
            await transporter.sendMail({
                from: process.env.SMTP_FROM,
                to: email,
                subject: 'Booking Confirmation - Afroflavours',
                html: `
                  <h2>Booking Confirmation</h2>
                  <p>Thank you for your booking!</p>
                  <p><strong>Reference:</strong> ${bookingRef}</p>
                `
            });

            await transporter.sendMail({
                from: process.env.SMTP_FROM,
                to: process.env.ADMIN_EMAIL,
                subject: `New Booking - ${bookingRef}`,
                html: `<h2>New booking received</h2>`
            });
        } catch (emailErr) {
            console.warn("Email could not be sent:", emailErr.message);
        }

        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            booking
        });

    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ success: false, message: 'Failed to create booking' });
    }
});

// ------------------------------------
// ✅ GET ALL BOOKINGS (used by Admin Dashboard)
// ------------------------------------
router.get('/', async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 });
        res.json({ success: true, bookings });
    } catch (error) {
        console.error("Fetch error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch bookings" });
    }
});

// ------------------------------------
// ❗ REQUIRED BY YOUR FRONTEND
// POST /api/bookings/update-status
// ------------------------------------
router.post('/update-status', async (req, res) => {
    try {
        const { bookingRef, status } = req.body; // ✅ Changed to bookingRef

        if (!bookingRef || !status) {
            return res.status(400).json({ success: false, message: "Missing bookingRef or status" });
        }

        const booking = await Booking.findOneAndUpdate(
            { bookingRef: bookingRef }, // ✅ Using bookingRef (or just { bookingRef })
            { status },
            { new: true }
        );

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        res.json({
            success: true,
            message: "Booking updated",
            booking
        });

    } catch (error) {
        console.error("Update status error:", error);
        res.status(500).json({ success: false, message: "Failed to update status" });
    }
});

// ------------------------------------
// GET AVAILABLE SLOTS
// ------------------------------------
router.get('/availability', async (req, res) => {
    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ success: false, message: 'Date is required' });
        }

        const allSlots = [
            '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
            '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'
        ];

        // TODO: subtract already booked slots
        res.json({
            success: true,
            date,
            availableSlots: allSlots
        });

    } catch (error) {
        console.error('Availability error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch availability' });
    }
});

// ------------------------------------
// CANCEL BOOKING
// ------------------------------------
router.delete('/:bookingRef', async (req, res) => {
    try {
        const { bookingRef } = req.params;

        const booking = await Booking.findOneAndDelete({ bookingRef });

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        res.json({ success: true, message: 'Booking cancelled successfully' });

    } catch (error) {
        console.error('Cancellation error:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel booking' });
    }
});

module.exports = router;
