// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();


const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Connect to database
const connectDB = require('./config/database');
connectDB();

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

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


// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`🚀 Afroflavours API running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});