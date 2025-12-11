// routes/payments.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer').default || require('nodemailer');
const Booking = require('../models/Booking'); // Assuming you have a Booking model

// Create transporter - handle both CommonJS and ES modules
let transporter;
try {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
} catch (error) {
    console.error('Nodemailer setup error:', error);
    // Create a fallback transporter that logs instead of sending
    transporter = {
        sendMail: async (options) => {
            console.log('Email would be sent:', options);
            return { messageId: 'test-' + Date.now() };
        }
    };
}

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

    // Update database based on payment type
    if (type === 'booking_deposit') {
        // Update booking status to 'confirmed' and add payment info
        await Booking.findOneAndUpdate(
            { _id: bookingRef }, // Assuming bookingRef is the _id
            {
                status: 'confirmed',
                paymentStatus: 'paid',
                paymentIntentId: paymentIntent.id,
                amountPaid: paymentIntent.amount / 100
            }
        );

        // Send confirmation email
        await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: customerEmail,
            subject: 'Payment Confirmed - Afroflavours Booking',
            html: `
        <h2>Payment Confirmed!</h2>
        <p>Dear ${customerName},</p>
        <p>Your payment has been successfully processed.</p>
        <p><strong>Booking Reference:</strong> ${bookingRef}</p>
        <p><strong>Amount Paid:</strong> $${(paymentIntent.amount / 100).toFixed(2)} NZD</p>
        <p>Your booking is now confirmed. We look forward to serving you!</p>
        <p>Best regards,<br>The Afroflavours Team</p>
      `
        });
    } else if (type === 'catering_deposit') {
        // Update catering request
        // await CateringRequest.findOneAndUpdate(
        //   { quoteRef },
        //   {
        //     status: 'accepted',
        //     paymentStatus: 'deposit_paid',
        //     paymentIntentId: paymentIntent.id,
        //     depositPaid: paymentIntent.amount / 100
        //   }
        // );

        await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: customerEmail,
            subject: 'Catering Deposit Confirmed - Afroflavours',
            html: `
        <h2>Deposit Received!</h2>
        <p>Dear ${customerName},</p>
        <p>Your catering deposit has been successfully processed.</p>
        <p><strong>Quote Reference:</strong> ${quoteRef}</p>
        <p><strong>Deposit Paid:</strong> $${(paymentIntent.amount / 100).toFixed(2)} NZD</p>
        <p>Your catering booking is now secured. We'll be in touch with final details soon.</p>
        <p>Best regards,<br>The Afroflavours Team</p>
      `
        });
    }

    console.log('Payment successful:', paymentIntent.id);
}

// Handle failed payment
async function handleFailedPayment(paymentIntent) {
    const { customerEmail, customerName, bookingRef, quoteRef } = paymentIntent.metadata;

    await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: customerEmail,
        subject: 'Payment Failed - Afroflavours',
        html: `
      <h2>Payment Failed</h2>
      <p>Dear ${customerName},</p>
      <p>Unfortunately, your payment could not be processed.</p>
      <p><strong>Reference:</strong> ${bookingRef || quoteRef}</p>
      <p><strong>Reason:</strong> ${paymentIntent.last_payment_error?.message || 'Unknown error'}</p>
      <p>Please try again or contact us for assistance.</p>
      <p>Best regards,<br>The Afroflavours Team</p>
    `
    });

    console.error('Payment failed:', paymentIntent.id);
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