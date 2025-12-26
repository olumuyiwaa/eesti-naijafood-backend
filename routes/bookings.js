// routes/bookings.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { Resend } = require('resend');
const Booking = require('../models/Booking');

const resend = new Resend(process.env.RESEND_API_KEY);

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

        // Send emails via Resend
        try {
            await resend.emails.send({
                from: process.env.SMTP_FROM || 'onboarding@resend.dev',
                to: email,
                subject: 'Booking Confirmation - Afroflavours',
                html: `
                  <h2>Booking Confirmation</h2>
                  <p>Thank you for your booking!</p>
                  <p><strong>Reference:</strong> ${bookingRef}</p>
                  <p><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</p>
                  <p><strong>Time:</strong> ${time}</p>
                  <p><strong>Guests:</strong> ${guests}</p>
                  <br/>
                  <p>Best regards,<br>Afroflavours Team</p>
                `
            });

            await resend.emails.send({
                from: process.env.SMTP_FROM || 'onboarding@resend.dev',
                to: process.env.ADMIN_EMAIL,
                subject: `New Booking - ${bookingRef}`,
                html: `
                    <h2>New booking received</h2>
                    <p><strong>Reference:</strong> ${bookingRef}</p>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                `
            });
        } catch (emailErr) {
            console.warn("Email could not be sent via Resend:", emailErr.message);
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

// GET ALL BOOKINGS
router.get('/', async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 });
        res.json({ success: true, bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch bookings" });
    }
});

// UPDATE STATUS
router.post('/update-status', async (req, res) => {
    try {
        const { bookingRef, status } = req.body;
        const booking = await Booking.findOneAndUpdate({ bookingRef }, { status }, { new: true });
        if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
        res.json({ success: true, booking });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to update status" });
    }
});

// GET AVAILABILITY
router.get('/availability', async (req, res) => {
    try {
        const { date } = req.query;
        const allSlots = ['11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'];
        res.json({ success: true, date, availableSlots: allSlots });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch availability' });
    }
});

// CANCEL BOOKING
router.delete('/:bookingRef', async (req, res) => {
    try {
        const { bookingRef } = req.params;
        const booking = await Booking.findOneAndDelete({ bookingRef });
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
        res.json({ success: true, message: 'Booking cancelled successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to cancel booking' });
    }
});

module.exports = router;