// routes/catering.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const CateringRequest = require('../models/CateringRequest');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/catering/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Invalid file type. Only JPEG, PNG, PDF, and DOC files are allowed.'));
    }
});

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
const cateringValidation = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('eventDate').isISO8601().withMessage('Valid event date is required'),
    body('eventType').isIn(['corporate', 'wedding', 'birthday', 'festival', 'community', 'other']).withMessage('Invalid event type'),
    body('guestCount').isInt({ min: 10 }).withMessage('Guest count must be at least 10'),
    body('venue').trim().notEmpty().withMessage('Venue is required'),
    body('menuPreferences').optional().trim(),
    body('specialRequirements').optional().trim(),
    body('budget').optional().trim()
];

// GET /api/catering/upcoming - Fetch all requests
router.get('/upcoming', async (req, res) => {
    try {
        const requests = await CateringRequest.find().sort({ createdAt: -1 });
        res.json({ success: true, requests });
    } catch (error) {
        console.error('Fetch requests error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch requests' });
    }
});

// POST /api/catering/quote - Request catering quote
router.post('/quote', upload.single('attachment'), cateringValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const {
            name,
            email,
            phone,
            eventDate,
            eventType,
            guestCount,
            venue,
            menuPreferences,
            specialRequirements,
            budget
        } = req.body;

        const quoteRef = `CTR${Date.now().toString().slice(-8)}`;
        const attachment = req.file ? req.file.path : null;

        // Save to database - FIXED: Actually save the request
        const cateringRequest = await CateringRequest.create({
            quoteRef,
            name,
            email,
            phone,
            eventDate,
            eventType,
            guestCount,
            venue,
            menuPreferences,
            specialRequirements,
            budget,
            attachment,
            status: 'pending'
        });

        // Send confirmation to customer
        const customerMailOptions = {
            from: process.env.SMTP_FROM,
            to: email,
            subject: 'Catering Quote Request Received - Afroflavours',
            html: `
                <h2>Catering Quote Request</h2>
                <p>Dear ${name},</p>
                <p>Thank you for your interest in Afroflavours catering services!</p>
                <p><strong>Quote Reference:</strong> ${quoteRef}</p>
                <p><strong>Event Date:</strong> ${new Date(eventDate).toLocaleDateString()}</p>
                <p><strong>Event Type:</strong> ${eventType}</p>
                <p><strong>Guest Count:</strong> ${guestCount}</p>
                <p>Our team will review your request and get back to you within 24-48 hours with a detailed quote.</p>
                <p>Best regards,<br>The Afroflavours Team</p>
            `
        };

        // Send notification to admin
        const adminMailOptions = {
            from: process.env.SMTP_FROM,
            to: process.env.ADMIN_EMAIL,
            subject: `New Catering Quote Request - ${quoteRef}`,
            html: `
                <h2>New Catering Quote Request</h2>
                <p><strong>Quote Reference:</strong> ${quoteRef}</p>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Phone:</strong> ${phone}</p>
                <p><strong>Event Date:</strong> ${new Date(eventDate).toLocaleDateString()}</p>
                <p><strong>Event Type:</strong> ${eventType}</p>
                <p><strong>Guest Count:</strong> ${guestCount}</p>
                <p><strong>Venue:</strong> ${venue}</p>
                ${menuPreferences ? `<p><strong>Menu Preferences:</strong> ${menuPreferences}</p>` : ''}
                ${specialRequirements ? `<p><strong>Special Requirements:</strong> ${specialRequirements}</p>` : ''}
                ${budget ? `<p><strong>Budget:</strong> ${budget}</p>` : ''}
                ${attachment ? `<p><strong>Attachment:</strong> ${attachment}</p>` : ''}
            `
        };

        // Send emails (wrapped in try-catch to not fail request if email fails)
        try {
            await transporter.sendMail(customerMailOptions);
            await transporter.sendMail(adminMailOptions);
        } catch (emailError) {
            console.error('Email sending error:', emailError);
            // Continue anyway - request is saved
        }

        res.status(201).json({
            success: true,
            message: 'Catering quote request submitted successfully',
            quoteRef,
            request: cateringRequest
        });

    } catch (error) {
        console.error('Catering quote error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit catering request',
            error: error.message
        });
    }
});

// GET /api/catering/packages - Get catering packages
router.get('/packages', async (req, res) => {
    try {
        const packages = [
            {
                id: 1,
                name: 'Bronze Package',
                description: 'Perfect for intimate gatherings',
                minGuests: 10,
                maxGuests: 30,
                pricePerPerson: 35,
                includes: ['Appetizers', 'Main Course', 'Soft Drinks', 'Setup & Cleanup']
            },
            {
                id: 2,
                name: 'Silver Package',
                description: 'Ideal for medium-sized events',
                minGuests: 31,
                maxGuests: 75,
                pricePerPerson: 45,
                includes: ['Appetizers', 'Two Main Courses', 'Dessert', 'Soft Drinks', 'Setup & Cleanup', 'Decorations']
            },
            {
                id: 3,
                name: 'Gold Package',
                description: 'Premium experience for large events',
                minGuests: 76,
                maxGuests: 200,
                pricePerPerson: 60,
                includes: ['Appetizers', 'Multiple Main Courses', 'Dessert', 'Full Bar', 'DJ/Entertainment', 'Setup & Cleanup', 'Premium Decorations']
            }
        ];

        res.json({ success: true, packages });

    } catch (error) {
        console.error('Packages error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch packages' });
    }
});

// POST /api/catering/send-quote - Send quote to client
router.post('/send-quote', async (req, res) => {
    try {
        const { quoteRef, quotedAmount } = req.body;

        if (!quoteRef || !quotedAmount) {
            return res.status(400).json({
                success: false,
                message: 'Quote reference and amount are required'
            });
        }

        const request = await CateringRequest.findOne({ quoteRef });
        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Request not found'
            });
        }

        request.quotedAmount = quotedAmount;
        request.status = 'quoted';
        await request.save();

        // Send email to client
        const mailOptions = {
            from: process.env.SMTP_FROM,
            to: request.email,
            subject: `Your Catering Quote - ${quoteRef}`,
            html: `
                <h2>Your Catering Quote</h2>
                <p>Dear ${request.name},</p>
                <p>Thank you for your patience. We're pleased to provide you with a quote for your event.</p>
                <p><strong>Event Details:</strong></p>
                <ul>
                    <li>Date: ${new Date(request.eventDate).toLocaleDateString()}</li>
                    <li>Type: ${request.eventType}</li>
                    <li>Guests: ${request.guestCount}</li>
                    <li>Venue: ${request.venue}</li>
                </ul>
                <p><strong>Quoted Amount:</strong> $${quotedAmount}</p>
                <p>This quote is valid for 14 days. Please contact us if you have any questions or would like to proceed with booking.</p>
                <p>Best regards,<br/>Afroflavours Team</p>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch (emailError) {
            console.error('Email error:', emailError);
        }

        res.json({
            success: true,
            message: 'Quote sent successfully',
            request
        });

    } catch (error) {
        console.error('Send quote error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send quote',
            error: error.message
        });
    }
});

// POST /api/catering/update-status - Update request status
router.post('/update-status', async (req, res) => {
    try {
        const { quoteRef, status } = req.body;

        if (!quoteRef || !status) {
            return res.status(400).json({
                success: false,
                message: 'Quote reference and status are required'
            });
        }

        const request = await CateringRequest.findOne({ quoteRef });
        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Request not found'
            });
        }

        request.status = status;
        await request.save();

        res.json({
            success: true,
            message: `Request marked as ${status}`,
            request
        });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update status',
            error: error.message
        });
    }
});

module.exports = router;