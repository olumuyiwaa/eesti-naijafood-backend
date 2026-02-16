// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');
const orderRoutes = require('./routes/orderRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

require('dotenv').config();

const connectDB = require('./config/database');

const app = express();


// ⭐ REQUIRED for Render / proxies
app.set('trust proxy', 1);


// Middleware
app.use(helmet());
app.use(cors());
// Stripe webhook must use raw body
app.use('/api/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));


// ⭐ Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);



// ⭐ Auto-seed admin (runs once only)
async function ensureAdmin() {
    const username = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!username || !password) {
        console.log('⚠️ ADMIN_EMAIL or ADMIN_PASSWORD missing. Skipping seed.');
        return;
    }

    const count = await Admin.countDocuments();

    if (count > 0) {
        console.log('✅ Admin already exists');
        return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await Admin.create({
        username,
        passwordHash,
    });

    console.log('✅ Default admin created');
}



// Routes
app.use("/api/admin", require("./routes/adminAuth"));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/catering', require('./routes/catering'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/events', require('./routes/events'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/newsletter', require('./routes/newsletter'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/site-details', require('./routes/siteDetails'));
app.use("/api/admin/dashboard", require("./routes/adminDashboard"));
app.use('/api/orders', orderRoutes);
app.use('/api/webhook', webhookRoutes);


// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});


// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});


// 404
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});



const PORT = process.env.PORT || 5001;


// ⭐ Start app only after DB + seed ready
(async () => {
    try {
        await connectDB();
        await ensureAdmin();

        app.listen(PORT, () => {
            console.log(`🚀 Afroflavours API running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });

    } catch (err) {
        console.error('❌ Startup failed:', err);
        process.exit(1);
    }
})();
