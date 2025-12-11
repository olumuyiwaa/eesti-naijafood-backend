// routes/contact.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const Message = require("../models/Message");


const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Contact form validation
const contactValidation = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').optional().trim(),
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('message').trim().notEmpty().withMessage('Message is required').isLength({ min: 10 }).withMessage('Message must be at least 10 characters')
];

// Submit contact form
router.post("/", contactValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { name, email, phone, subject, message } = req.body;

        // 1️⃣ Save message to MongoDB
        const savedMessage = await Message.create({
            name,
            email,
            phone,
            subject,
            message
        });

        // 2️⃣ Send email to admin
        const adminMailOptions = {
            from: process.env.SMTP_FROM,
            to: process.env.ADMIN_EMAIL,
            subject: `Contact Form: ${subject}`,
            html: `
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Message:</strong></p>
                <p>${message.replace(/\n/g, "<br>")}</p>
            `
        };

        // 3️⃣ Send confirmation to user
        const userMailOptions = {
            from: process.env.SMTP_FROM,
            to: email,
            subject: "We received your message - Afroflavours",
            html: `
                <h2>Thank you for contacting us!</h2>
                <p>Dear ${name},</p>
                <p>We've received your message and will reply soon.</p>
                <p><strong>Your message:</strong></p>
                <p>${message.replace(/\n/g, "<br>")}</p>
                <p>Best regards,<br>Afroflavours Team</p>
            `
        };

        try {
            await transporter.sendMail(adminMailOptions);
            await transporter.sendMail(userMailOptions);
        } catch (emailError) {
            console.error('Email error:', emailError);
        }

        res.status(200).json({
            success: true,
            message: "Your message has been sent and saved successfully",
            data: savedMessage
        });

    } catch (error) {
        console.error("Contact form error:", error);
        res.status(500).json({ success: false, message: "Failed to send message" });
    }
});

// Get contact information
router.get('/info', async (req, res) => {
    try {
        const contactInfo = {
            phone: '+64 21 XXX XXXX',
            email: 'info@afroflavours.co.nz',
            address: {
                street: 'TBC',
                city: 'Auckland',
                country: 'New Zealand',
                postcode: 'XXXX'
            },
            hours: {
                monday: '11:00 AM - 10:00 PM',
                tuesday: '11:00 AM - 10:00 PM',
                wednesday: '11:00 AM - 10:00 PM',
                thursday: '11:00 AM - 11:30 PM',
                friday: '11:00 AM - 11:30 PM',
                saturday: '11:00 AM - 11:30 PM',
                sunday: '11:00 AM - 11:30 PM'
            },
            africanExperience: {
                days: ['Thursday', 'Friday', 'Saturday', 'Sunday'],
                time: '9:00 PM - 11:30 PM'
            },
            social: {
                facebook: 'https://facebook.com/afroflavours',
                instagram: 'https://instagram.com/afroflavours',
                tiktok: 'https://tiktok.com/@afroflavours',
                youtube: 'https://youtube.com/@afroflavours'
            }
        };

        res.json({ success: true, contactInfo });
    } catch (error) {
        console.error('Contact info error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch contact info' });
    }
});

module.exports = router;