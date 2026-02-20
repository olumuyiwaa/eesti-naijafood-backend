const express = require("express");
const router = express.Router();

// Import models
const Booking = require("../models/Booking");
const CateringRequest = require("../models/CateringRequest");
const Message = require("../models/Message");
const Review = require("../models/Review");
const Order = require("../models/Order");

// GET /api/admin/dashboard
router.get("/", async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Bookings
        const todayBookings = await Booking.countDocuments({
            date: { $gte: today }
        });
        // Orders
        const todayOrders = await Order.countDocuments({
            date: { $gte: today }
        });

        const totalBookings = await Booking.countDocuments();
        const totalOrders = await Order.countDocuments();
        const pendingBookings = await Booking.countDocuments({ status: "pending" });
        const pendingOrders = await Order.countDocuments({ status: "pending" });

        // Catering Requests
        const cateringRequests = await CateringRequest.countDocuments();
        const pendingCatering = await CateringRequest.countDocuments({ status: "pending" });

        // Messages
        const unreadMessages = await Message.countDocuments({ isRead: false });

        // Reviews
        const pendingReviews = await Review.countDocuments({ status: "pending" });
        const avgRatingData = await Review.aggregate([
            { $match: { status: "approved" } },
            { $group: { _id: null, avgRating: { $avg: "$rating" } } }
        ]);

        const avgRating = avgRatingData[0]?.avgRating || 0;

        // Recent data
        const recentBookings = await Booking.find().sort({ createdAt: -1 }).limit(5);
        const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5);
        const recentCatering = await CateringRequest.find().sort({ createdAt: -1 }).limit(5);

        console.log({
            success: true,
            stats: {
                bookings: {
                    today: todayBookings,
                    total: totalBookings,
                    pending: pendingBookings
                },
                orders: {
                    today: todayOrders,
                    total: totalOrders,
                    pending: pendingOrders
                },
                catering: {
                    requests: cateringRequests,
                    pending: pendingCatering
                },
                messages: {
                    unread: unreadMessages
                },
                reviews: {
                    pending: pendingReviews,
                    average: Number(avgRating.toFixed(1))
                }
            },
            recentBookings,
            recentOrders,
            recentCatering
        });
        res.json({
            success: true,
            stats: {
                bookings: {
                    today: todayBookings,
                    total: totalBookings,
                    pending: pendingBookings
                },
                orders: {
                    today: todayOrders,
                    total: totalOrders,
                    pending: pendingOrders
                },
                catering: {
                    requests: cateringRequests,
                    pending: pendingCatering
                },
                messages: {
                    unread: unreadMessages
                },
                reviews: {
                    pending: pendingReviews,
                    average: Number(avgRating.toFixed(1))
                }
            },
            recentBookings,
            recentOrders,
            recentCatering
        });
    } catch (err) {
        console.error("Dashboard error:", err);
        res.status(500).json({ success: false, message: "Dashboard error" });
    }
});

module.exports = router;
