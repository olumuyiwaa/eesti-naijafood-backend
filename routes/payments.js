// routes/payments.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer').default || require('nodemailer');
const Booking = require('../models/Booking'); // Assuming you have a Booking model
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);



// Create payment intent for booking deposit
router.post('/create-booking-payment', async (req, res) => {
    try {
        const { bookingRef, amount, email, name } = req.body;

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: 'nzd',
            metadata: {
                bookingRef,
                type: 'booking_deposit',
                customerEmail: email,
                customerName: name
            },
            receipt_email: email,
            description: `Booking deposit for ${bookingRef}`
        });

        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });

    } catch (error) {
        console.error('Payment intent creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create payment intent',
            error: error.message
        });
    }
});

// Create payment intent for catering deposit
router.post('/create-catering-payment', async (req, res) => {
    try {
        const { quoteRef, amount, email, name, eventDate } = req.body;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: 'nzd',
            metadata: {
                quoteRef,
                type: 'catering_deposit',
                customerEmail: email,
                customerName: name,
                eventDate
            },
            receipt_email: email,
            description: `Catering deposit for ${quoteRef}`
        });

        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });

    } catch (error) {
        console.error('Catering payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create payment intent',
            error: error.message
        });
    }
});

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            await handleSuccessfulPayment(paymentIntent);
            break;

        case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            await handleFailedPayment(failedPayment);
            break;

        case 'charge.refunded':
            const refund = event.data.object;
            await handleRefund(refund);
            break;

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
});

// Handle successful payment
async function handleSuccessfulPayment(paymentIntent) {
    const { bookingRef, quoteRef, type, customerEmail, customerName } = paymentIntent.metadata;

    if (type === 'booking_deposit') {
        await Booking.findOneAndUpdate({ _id: bookingRef }, { status: 'confirmed' });

        await resend.emails.send({
            from: process.env.SMTP_FROM || 'onboarding@resend.dev',
            to: customerEmail,
            subject: 'Payment Confirmed - Afroflavours Booking',
            html: `<h2>Payment Confirmed!</h2><p>Dear ${customerName}, your booking is confirmed.</p>`
        });
    } else if (type === 'catering_deposit') {
        await resend.emails.send({
            from: process.env.SMTP_FROM || 'onboarding@resend.dev',
            to: customerEmail,
            subject: 'Catering Deposit Confirmed - Afroflavours',
            html: `<h2>Deposit Received!</h2><p>Dear ${customerName}, your catering deposit is processed.</p>`
        });
    }
}

// Handle failed payment
async function handleFailedPayment(paymentIntent) {
    const { customerEmail, customerName, bookingRef, quoteRef } = paymentIntent.metadata;

    await resend.emails.send({
        from: process.env.SMTP_FROM || 'onboarding@resend.dev',
        to: customerEmail,
        subject: 'Payment Failed - Afroflavours',
        html: `<h2>Payment Failed</h2><p>Dear ${customerName}, unfortunately payment failed.</p>`
    });
}

// Handle refund
async function handleRefund(charge) {
    console.log('Refund processed:', charge.id);
    // Update database and send notification
}

// Get payment details
router.get('/payment/:paymentIntentId', async (req, res) => {
    try {
        const { paymentIntentId } = req.params;

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        res.json({
            success: true,
            payment: {
                id: paymentIntent.id,
                amount: paymentIntent.amount / 100,
                status: paymentIntent.status,
                created: new Date(paymentIntent.created * 1000),
                metadata: paymentIntent.metadata
            }
        });

    } catch (error) {
        console.error('Payment retrieval error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve payment' });
    }
});

// Create refund
router.post('/refund', async (req, res) => {
    try {
        const { paymentIntentId, amount, reason } = req.body;

        const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            amount: amount ? Math.round(amount * 100) : undefined, // Partial or full refund
            reason: reason || 'requested_by_customer'
        });

        res.json({
            success: true,
            refund: {
                id: refund.id,
                amount: refund.amount / 100,
                status: refund.status
            }
        });

    } catch (error) {
        console.error('Refund error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process refund',
            error: error.message
        });
    }
});

// Get all payments (admin)
router.get('/admin/payments', async (req, res) => {
    try {
        const { limit = 10, starting_after } = req.query;

        const payments = await stripe.paymentIntents.list({
            limit: parseInt(limit),
            starting_after: starting_after
        });

        const formattedPayments = payments.data.map(payment => ({
            id: payment.id,
            amount: payment.amount / 100,
            status: payment.status,
            currency: payment.currency,
            customer: payment.metadata.customerName,
            email: payment.metadata.customerEmail,
            reference: payment.metadata.bookingRef || payment.metadata.quoteRef,
            type: payment.metadata.type,
            created: new Date(payment.created * 1000)
        }));

        res.json({
            success: true,
            payments: formattedPayments,
            hasMore: payments.has_more
        });

    } catch (error) {
        console.error('Admin payments error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch payments' });
    }
});

// Get payment statistics (admin)
router.get('/admin/payment-stats', async (req, res) => {
    try {
        const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);

        const payments = await stripe.paymentIntents.list({
            limit: 100,
            created: { gte: thirtyDaysAgo }
        });

        const stats = {
            totalRevenue: 0,
            successfulPayments: 0,
            failedPayments: 0,
            pendingPayments: 0,
            refundedAmount: 0,
            bookingDeposits: 0,
            cateringDeposits: 0
        };

        payments.data.forEach(payment => {
            if (payment.status === 'succeeded') {
                stats.totalRevenue += payment.amount / 100;
                stats.successfulPayments++;

                if (payment.metadata.type === 'booking_deposit') {
                    stats.bookingDeposits += payment.amount / 100;
                } else if (payment.metadata.type === 'catering_deposit') {
                    stats.cateringDeposits += payment.amount / 100;
                }
            } else if (payment.status === 'failed') {
                stats.failedPayments++;
            } else {
                stats.pendingPayments++;
            }
        });

        res.json({ success: true, stats });

    } catch (error) {
        console.error('Payment stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
});

module.exports = router;