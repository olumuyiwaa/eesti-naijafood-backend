const Stripe = require('stripe');
const Order = require('../models/Order');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

exports.createCheckoutSession = async (req, res) => {
    try {
        const { items, customerEmail } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'Cart is empty' });
        }

        // Create order in DB first (status: pending)
        const order = await Order.create({
            customerEmail,
            customerName: "Guest User",
            items,
            totalAmount: items.reduce((acc, item) => acc + item.price * item.quantity, 0),
            status: 'pending'
        });

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: customerEmail,
            line_items: items.map(item => ({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: item.name,
                        images: [item.image]
                    },
                    unit_amount: Math.round(item.price * 100)
                },
                quantity: item.quantity
            })),
            mode: 'payment',
            success_url: `${process.env.CLIENT_URL}/success?orderId=${order._id}`,
            cancel_url: `${process.env.CLIENT_URL}/cart`,
            metadata: {
                orderId: order._id.toString()
            }
        });

        res.status(200).json({ url: session.url });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Stripe session failed' });
    }
};

// Get all orders
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .sort({ createdAt: -1 }); // newest first

        res.status(200).json({
            count: orders.length,
            orders
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
};
