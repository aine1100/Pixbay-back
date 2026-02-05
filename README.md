# Pixbay - Creative Services Marketplace API

A professional microservices-based API for a creative services marketplace, built with Node.js, Express, and Prisma.

## Tech Stack
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma v7+
- **Driver Adapter**: `@prisma/adapter-pg`

## Getting Started

### 1. Installation
```bash
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/pixbay"
JWT_SECRET="your_secret_key"
```

### 3. Database Migrations
Apply the schema to your local database:
```bash
npx prisma migrate dev --name init_marketplace
```

### 4. Running the App
```bash
npm start
```

## API Routes Documentation

### Auth Service
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/verify-otp` - Mobile OTP verification
- `POST /api/v1/auth/refresh-token` - Refresh session tokens
- `POST /api/v1/auth/logout` - Logout

### User Service
- `GET /api/v1/users/me` - Get current user profile
- `PUT /api/v1/users/me` - Update profile
- `GET /api/v1/users/me/bookings` - My booking history
- `POST /api/v1/users/me/saved-creators` - Favorite a creator

### Creator Service
- `GET /api/v1/creators` - List/Filter creators
- `GET /api/v1/creators/search` - Search by location/category
- `GET /api/v1/creators/:id` - Creator details & portfolio
- `POST /api/v1/creators/register` - Become a creator
- `PUT /api/v1/creators/:id` - Update professional profile

### Booking Service
- `POST /api/v1/bookings` - Request a booking
- `GET /api/v1/bookings/:id` - Booking status & details
- `PATCH /api/v1/bookings/:id/status` - Update status (Confirm/Cancel/Complete)
- `POST /api/v1/bookings/:id/check-in` - Location check-in for sessions

### Payment Service
- `POST /api/v1/payments/initiate` - Start Mobile Money payment
- `GET /api/v1/payments/transactions` - Transaction history
- `POST /api/v1/payments/webhook` - External payment gateway callback

### Chat Service
- `GET /api/v1/chats` - List active conversations
- `GET /api/v1/chats/:id/messages` - Get message history
- `POST /api/v1/chats/:id/messages` - Send message

### Media Service
- `POST /api/v1/media/upload` - Upload images/videos
- `GET /api/v1/media/presigned-url` - Secure media access

### Admin & Support
- `GET /api/v1/admin/creators/pending` - Review verification requests
- `PATCH /api/v1/admin/disputes/:id/resolve` - Resolve disputes
- `GET /api/v1/admin/analytics/revenue` - Platform statistics

## Database Schema
The database is managed via Prisma. You can find the implementation in `prisma/schema.prisma`. 
To explore the database visually, run:
```bash
npx prisma studio
```
