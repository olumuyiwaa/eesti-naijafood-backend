// routes/catering.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const { Resend } = require('resend');
const CateringRequest = require('../models/CateringRequest');

const resend = new Resend(process.env.RESEND_API_KEY);

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

        // Send notification to admin
        try {
            await resend.emails.send({
                from: process.env.SMTP_FROM || 'onboarding@resend.dev',
                to: email,
                subject: 'Catering Quote Request Received - Afroflavours',
                html: `<h2>Catering Quote Request</h2><p>Dear ${name}, thank you...</p>`
            });

            await resend.emails.send({
                from: process.env.SMTP_FROM || 'onboarding@resend.dev',
                to: process.env.ADMIN_EMAIL,
                subject: `New Catering Quote Request - ${quoteRef}`,
                html: `<h2>New Catering Quote Request</h2><p>Quote Reference: ${quoteRef}</p>`
            });
        } catch (emailError) {
            console.error('Resend error:', emailError);
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
        try {
            await resend.emails.send({
                from: process.env.SMTP_FROM || 'onboarding@resend.dev',
                to: request.email,
                subject: `Your Catering Quote - ${quoteRef}`,
                html: `<h2>Your Catering Quote</h2><p>Quoted Amount: $${quotedAmount}</p>`
            });
        } catch (emailError) {
            console.error('Resend error:', emailError);
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