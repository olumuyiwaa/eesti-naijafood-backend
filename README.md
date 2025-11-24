# Afroflavours Backend API

Node.js backend API for Afroflavours African restaurant and bar website.

## Features

- 🍽️ **Menu Management** - Full menu with categories, dish of the week
- 📅 **Booking System** - Table reservations, events, African Experience nights
- 🎉 **Catering Services** - Quote requests with file upload support
- 📧 **Contact & Newsletter** - Contact form and newsletter subscriptions
- ⭐ **Reviews & Testimonials** - Customer review system with moderation
- 🎵 **Events Management** - African Experience nights and special events
- 🔒 **Security** - Rate limiting, helmet, input validation
- 📨 **Email Notifications** - Automated confirmations via Nodemailer

## Tech Stack

- **Runtime:** Node.js 16+
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Email:** Nodemailer
- **Validation:** Express Validator
- **Security:** Helmet, CORS, Rate Limiting
- **File Upload:** Multer

## Prerequisites

- Node.js 16.x or higher
- MongoDB (local or Atlas)
- SMTP email service (Gmail, SendGrid, etc.)

## Installation

### 1. Clone and Install Dependencies

```bash
# Install dependencies
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/afroflavours
JWT_SECRET=your_secret_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@afroflavours.co.nz
ADMIN_EMAIL=admin@afroflavours.co.nz
```

### 3. Create Required Directories

```bash
mkdir -p uploads/catering
```

### 4. Start MongoDB

```bash
# If using local MongoDB
mongod

# Or use MongoDB Atlas connection string in .env
```

### 5. Run the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

Server will run on `http://localhost:5000`

## API Endpoints

### Bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bookings/availability?date=YYYY-MM-DD` - Check available slots
- `DELETE /api/bookings/:bookingRef` - Cancel booking

### Catering
- `POST /api/catering/quote` - Request catering quote (with file upload)
- `GET /api/catering/packages` - Get catering packages

### Menu
- `GET /api/menu` - Get full menu
- `GET /api/menu/:category` - Get menu by category
- `GET /api/menu/special/dish-of-the-week` - Get current dish of the week

### Events
- `GET /api/events/upcoming` - Get upcoming events
- `GET /api/events/gallery` - Get event photo gallery
- `GET /api/events/african-experience` - Get African Experience schedule

### Contact
- `POST /api/contact` - Submit contact form
- `GET /api/contact/info` - Get contact information and hours

### Newsletter
- `POST /api/newsletter/subscribe` - Subscribe to newsletter
- `POST /api/newsletter/unsubscribe` - Unsubscribe from newsletter

### Reviews
- `POST /api/reviews` - Submit review
- `GET /api/reviews` - Get approved reviews
- `GET /api/reviews/stats` - Get review statistics

## Database Models

### Booking
- bookingRef, name, email, phone
- date, time, guests
- bookingType (dine-in, event, african-experience)
- status (pending, confirmed, cancelled, completed)

### CateringRequest
- quoteRef, name, email, phone
- eventDate, eventType, guestCount, venue
- menuPreferences, specialRequirements, budget
- status (pending, quoted, accepted, declined)

### MenuItem
- name, description, category, price, image
- dietary flags (vegetarian, vegan, spicy, gluten-free)
- availability, dishOfWeek status

### Review
- name, email, rating (1-5), title, comment
- visitDate, status (pending, approved, rejected)

### Newsletter
- email, name, isActive
- subscribedAt, unsubscribedAt

### Event
- title, description, date, time, type
- genre (Afrobeat, Amapiano, Highlife, etc.)
- capacity, bookingsCount

## Email Configuration

### Gmail Setup
1. Enable 2-Factor Authentication
2. Generate App Password: Google Account → Security → App passwords
3. Use app password in `SMTP_PASS`

### SendGrid/Other SMTP
Update SMTP settings in `.env` accordingly.

## File Upload

Catering quote requests support file attachments:
- **Allowed types:** PDF, DOC, DOCX, JPG, JPEG, PNG
- **Max size:** 5MB
- **Storage:** `uploads/catering/`

## Security Features

- **Helmet.js** - HTTP header security
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - 100 requests per 15 minutes per IP
- **Input Validation** - Express Validator
- **XSS Protection** - Clean user input

## Development

```bash
# Run with nodemon (auto-restart)
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

## Production Deployment

### Environment Variables
Set `NODE_ENV=production` and configure:
- MongoDB Atlas connection string
- Production SMTP settings
- Secure JWT_SECRET
- CORS_ORIGIN with production domain

### Recommendations
- Use PM2 for process management
- Set up SSL/TLS certificates
- Configure reverse proxy (Nginx)
- Enable MongoDB backups
- Set up monitoring and logging

### Quick PM2 Setup
```bash
npm install -g pm2
pm2 start server.js --name afroflavours-api
pm2 startup
pm2 save
```

## Project Structure

```
afroflavours-backend/
├── config/
│   └── database.js          # MongoDB connection
├── models/
│   ├── Booking.js
│   ├── CateringRequest.js
│   ├── MenuItem.js
│   ├── Review.js
│   ├── Newsletter.js
│   └── Event.js
├── routes/
│   ├── bookings.js
│   ├── catering.js
│   ├── menu.js
│   ├── events.js
│   ├── contact.js
│   ├── newsletter.js
│   └── reviews.js
├── uploads/
│   └── catering/            # File uploads
├── .env.example
├── .gitignore
├── package.json
├── server.js                # Main entry point
└── README.md
```

## Third-Party Integrations (Future)

- **DoorDash API** - Online ordering integration
- **Uber Eats API** - Online ordering integration
- **Stripe** - Payment processing for deposits/prepayments
- **Google Maps** - Location services

## API Testing

Use Postman or cURL:

```bash
# Health check
curl http://localhost:5000/health

# Get menu
curl http://localhost:5000/api/menu

# Create booking
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+64211234567",
    "date": "2025-11-20",
    "time": "19:00",
    "guests": 4,
    "bookingType": "dine-in"
  }'
```

## Support

For issues or questions:
- Email: dev@afroflavours.com
- Documentation: [API Docs](https://docs.afroflavours.com)

## License

MIT License - See LICENSE file for details

---

**Built with ❤️ for Afroflavours - Bringing African Culture to Auckland**# afroflavours-backend
