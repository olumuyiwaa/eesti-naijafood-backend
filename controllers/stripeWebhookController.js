const Stripe = require('stripe');
const Order = require('../models/Order');
const Booking = require('../models/Booking');
const { Resend } = require('resend');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

exports.handleStripeWebhook = async (req, res) => {
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

    try {
        switch (event.type) {

            // ✅ ORDER CHECKOUT SUCCESS
            case 'checkout.session.completed': {
                const session = event.data.object;

                if (session.payment_status === 'paid') {
                    const orderId = session.metadata.orderId;

                    await Order.findByIdAndUpdate(orderId, {
                        status: 'paid'
                    });

                    console.log('Order marked as paid:', orderId);
                }
                break;
            }

            // ✅ DEPOSIT SUCCESS
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object;
                const { bookingRef, type, customerEmail, customerName } = paymentIntent.metadata;

                if (type === 'booking_deposit') {
                    await Booking.findByIdAndUpdate(bookingRef, {
                        status: 'confirmed'
                    });

                    await resend.emails.send({
                        from: process.env.SMTP_FROM,
                        to: customerEmail,
                        subject: 'Booking Payment Confirmed',
                        html: `<h2>Payment Confirmed</h2><p>Dear ${customerName}, your booking is confirmed.</p>`
                    });
                }

                if (type === 'catering_deposit') {
                    await resend.emails.send({
                        from: process.env.SMTP_FROM,
                        to: customerEmail,
                        subject: 'Catering Deposit Confirmed',
                        html: `<h2>Deposit Received</h2><p>Dear ${customerName}, your catering deposit is confirmed.</p>`
                    });
                }

                break;
            }

            // ❌ PAYMENT FAILED
            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object;
                console.log('Payment failed:', paymentIntent.id);
                break;
            }

            // 💰 REFUND
            case 'charge.refunded': {
                const charge = event.data.object;
                console.log('Refund processed:', charge.id);
                break;
            }

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        res.json({ received: true });

    } catch (error) {
        console.error('Webhook handling error:', error);
        res.status(500).json({ error: 'Webhook handler failed' });
    }
};
