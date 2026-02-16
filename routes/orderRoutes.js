const express = require('express');
const router = express.Router();

const {
    createCheckoutSession,
    getAllOrders
} = require('../controllers/orderController');

// Create Stripe checkout session
router.post('/checkout', createCheckoutSession);

// Get all orders
router.get('/', getAllOrders);

module.exports = router;