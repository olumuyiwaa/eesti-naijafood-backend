const Stripe = require('stripe');
const Order = require('../models/Order');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

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
        console.error('Webhook signature verification failed.', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // 🔥 Payment successful
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        const orderId = session.metadata.orderId;

        await Order.findByIdAndUpdate(orderId, {
            status: 'paid'
        });

        console.log('Order marked as paid:', orderId);
    }

    res.json({ received: true });
};
