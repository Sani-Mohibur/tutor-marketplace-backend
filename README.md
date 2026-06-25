# Tutor Marketplace — Backend

A robust, role-based REST API powering a tutor-student marketplace platform — with integrated **Stripe payments**, **Cloudinary image uploads**, and **email-based password reset**.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma ORM](https://img.shields.io/badge/Prisma_ORM-5A67D8?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Better Auth](https://img.shields.io/badge/Better_Auth-000000?style=for-the-badge&logo=brandfolder&logoColor=orange)
![Stripe](https://img.shields.io/badge/Stripe-635BFF?style=for-the-badge&logo=stripe&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)

## 🌐 Live Links

- **Backend API Server:** [https://tutor-marketplace-backend.onrender.com](https://tutor-marketplace-backend.onrender.com)
- **Frontend UI Client:** [https://tutor-marketplace-sani.vercel.app](https://tutor-marketplace-sani.vercel.app)

> ⚠️ **Important Note:** This repository contains the backend service layer only. To experience the full application, it must be paired with the corresponding user interface. You can find the frontend repository here: [tutor-marketpalace](https://github.com/Sani-Mohibur/tutor-marketplace-frontend)

---

## 📚 Table of Contents

- [Overview](#overview)
- [What's New](#whats-new)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Data Models](#data-models)
- [API Reference](#api-reference)
  - [Authentication](#authentication-better-auth)
  - [Tutor (Public)](#tutor-public)
  - [Availability](#availability)
  - [Bookings](#bookings)
  - [Payments (Stripe)](#payments-stripe)
  - [Reviews](#reviews)
  - [Profile](#profile)
  - [Admin](#admin)
- [Authentication & Authorization](#authentication--authorization)
- [Stripe Payment Integration](#stripe-payment-integration)
- [Cloudinary Image Uploads](#cloudinary-image-uploads)
- [Forgot / Reset Password](#forgot--reset-password)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running the Server](#running-the-server)
- [Scripts](#scripts)
- [Deployment](#deployment)

---

## Overview

**SkillBridge** is a full-stack tutoring marketplace platform. This repository contains the backend API server that handles:

- **User authentication** via `better-auth` (email/password with session cookies)
- **Role-based access control** for three user types: `student`, `tutor`, and `admin`
- **Tutor discovery** — search and filter verified tutors by skill, category, and rating
- **Availability management** — tutors post time slots; students browse and book them
- **Booking lifecycle** — pending → confirmed → completed / cancelled, with Stripe payment data support
- **Stripe Checkout payments** — two payment flows (book-then-pay & pay-to-book), webhook handling, receipt generation with downloadable PDFs
- **Cloudinary profile images** — users upload profile pictures via Cloudinary with automatic face-cropping
- **Forgot / Reset Password** — email-based password reset flow using Nodemailer with Gmail OAuth2 authentication
- **Review system** — one review per completed booking; tutor ratings aggregated automatically
- **Admin control panel** — platform-wide stats, user management, tutor verification, and category control

---

## What's New

### 💳 Stripe Payment Integration

- **Two checkout flows:** "book-then-pay" (for `both` / `stripe` payment slots) and "pay-to-book" (stripe-only slots where the booking is created after payment succeeds)
- **Stripe Webhooks** — a dedicated `/api/webhook` endpoint processes `checkout.session.completed` events to confirm payments and create bookings automatically
- **Payment receipts** — students can fetch receipt details and download a beautifully styled PDF receipt (generated server-side with Puppeteer)
- **Idempotent processing** — duplicate webhook deliveries are safely handled

### 🖼️ Cloudinary Image Uploads

- **Profile photo uploads** — students and tutors can upload profile images via a new `/api/profile/upload-image` endpoint
- **Multer + Cloudinary stream** — images are processed in-memory (up to 10 MB, images only) and uploaded to Cloudinary with automatic face-aware cropping (`400×400`, `gravity: face`)
- **Stored in database** — the Cloudinary `secure_url` is saved to the `User.image` field

### 🔑 Forgot / Reset Password

- **Forgot Password flow** — uses better-auth's built-in `sendResetPassword` hook to send a styled HTML reset email
- **Transactional Email Service** — emails are sent using Nodemailer with Gmail OAuth2 (replaced Brevo for the final production implementation)
- **Token-based reset** — the reset link redirects to the frontend's `/reset-password?token=...` page where users set a new password

> ⚠️ **Known Issue:** The forgot password flow works correctly on localhost but may experience issues on Render due to SMTP-related restrictions in hosted environments. As an alternative solution, Brevo is reliable on Render and requires Brevo credentials to be configured.

---

## Tech Stack

| Layer          | Technology                                |
| -------------- | ----------------------------------------- |
| Runtime        | Node.js (ESM)                             |
| Language       | TypeScript 6                              |
| Framework      | Express.js 5                              |
| ORM            | Prisma 7 (`prisma-client-js`)             |
| Database       | PostgreSQL (Neon serverless)              |
| Authentication | better-auth 1.6                           |
| Payments       | Stripe (Checkout Sessions + Webhooks)     |
| Image Uploads  | Cloudinary + Multer (in-memory streaming) |
| Email Service  | Nodemailer + Gmail OAuth2 Authentication  |
| PDF Generation | Puppeteer (headless Chrome)               |
| HTTP Logging   | Morgan                                    |
| Cross-Origin   | CORS (credentials + cookie support)       |
| Dev Server     | tsx (watch mode)                          |

---

## Project Structure

```
skill-bridge-backend/
├── prisma/
│   ├── schema/                  # Split Prisma schema files
│   │   ├── schema.prisma        # Generator & datasource config
│   │   ├── auth.prisma          # User, Session, Account, Verification
│   │   ├── tutorProfile.prisma  # TutorProfile model
│   │   ├── studentProfile.prisma# StudentProfile model
│   │   ├── availability.prisma  # Availability slots (+ paymentMethod)
│   │   ├── booking.prisma       # Booking model (+ payment fields)
│   │   ├── review.prisma        # Review model
│   │   └── category.prisma      # Category model
│   ├── migrations/              # Prisma migration history
│   └── seed.ts                  # Database seeder (admin account)
├── src/
│   ├── constants/               # Shared constants (user roles, etc.)
│   ├── errors/                  # Custom error classes
│   ├── lib/
│   │   ├── auth.ts              # better-auth config (+ reset password hook)
│   │   ├── cloudinary.ts        # Cloudinary SDK configuration
│   │   ├── email.ts             # Gmail OAuth2 email service (verify + reset)
│   │   ├── prisma.ts            # Prisma client singleton
│   │   └── stripe.ts            # Stripe SDK initialization
│   ├── middlewares/
│   │   ├── auth.middleware.ts   # requireAuth() — role-gated guard
│   │   └── globalErrorHandler.ts# Centralized error handler
│   ├── modules/
│   │   ├── admin/               # Admin dashboard module
│   │   ├── availability/        # Tutor slot management
│   │   ├── booking/             # Booking lifecycle
│   │   ├── payment/             # Stripe payment module (NEW)
│   │   │   ├── payment.route.ts
│   │   │   ├── payment.controller.ts
│   │   │   └── payment.service.ts
│   │   ├── profile/             # User profile management (+ image upload)
│   │   ├── review/              # Review & rating system
│   │   └── tutor/               # Public tutor discovery
│   ├── utils/                   # Shared utility functions
│   ├── app.ts                   # Express app factory (+ webhook route)
│   └── server.ts                # HTTP server & DB bootstrap
├── .env                         # Environment variables (not committed)
├── tsconfig.json
└── package.json
```

---

## Data Models

| Model            | Key Fields                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| `User`           | `id`, `name`, `email`, `image`, `role` (student/tutor/admin), `banned`                           |
| `TutorProfile`   | `bio`, `skills[]`, `pricePerHour`, `rating`, `isVerified`, `isFeatured`                          |
| `StudentProfile` | `bio`, `education`, `interests[]`, `phone`, `address`                                            |
| `Availability`   | `slot` (DateTime), `title`, `subject`, `pricePerHour`, `isBooked`, `status`, **`paymentMethod`** |
| `Booking`        | `status`, **`paymentStatus`**, **`amount`**, **`currency`**, **`stripeCheckoutSessionId`**       |
| `Review`         | `rating` (Int), `comment`, linked 1:1 to a completed Booking                                     |
| `Category`       | Linked to `TutorProfile`                                                                         |
| `Verification`   | `identifier`, `value`, `expiresAt` — used by better-auth for password reset tokens               |

### New Fields Highlight

- **`Availability.paymentMethod`** — `"cash"` | `"stripe"` | `"both"` — controls which payment flow applies to a slot
- **`Booking.paymentStatus`** — `"unpaid"` | `"paid"` | `"cash"` — tracks payment state
- **`Booking.amount`** / **`Booking.currency`** — stores the paid amount and currency after Stripe checkout
- **`Booking.stripeCheckoutSessionId`** — links a booking to its Stripe Checkout session (unique)

---

## API Reference

All responses follow JSON format. Protected routes require a valid session cookie issued by `better-auth`.

### Authentication (better-auth)

Handled internally by better-auth at `/api/auth/*`. The library manages sessions via secure HTTP-only cookies.

| Method | Endpoint                    | Description               |
| ------ | --------------------------- | ------------------------- |
| POST   | `/api/auth/sign-up/email`   | Register a new user       |
| POST   | `/api/auth/sign-in/email`   | Sign in with credentials  |
| POST   | `/api/auth/sign-out`        | Invalidate session        |
| GET    | `/api/auth/get-session`     | Get current session info  |
| POST   | `/api/auth/forget-password` | Send password reset email |
| POST   | `/api/auth/reset-password`  | Reset password with token |

> **Registration Note:** Pass `role: "student"` or `role: "tutor"` in the sign-up body. A corresponding profile (`StudentProfile` / `TutorProfile`) is auto-created via a database hook.

---

### Tutor (Public)

> No authentication required.

| Method | Endpoint                | Description                              |
| ------ | ----------------------- | ---------------------------------------- |
| GET    | `/api/tutor/search`     | Search & filter tutors (skills, rating…) |
| GET    | `/api/tutor/categories` | List all tutor categories                |
| GET    | `/api/tutor/:id`        | Get a single tutor's full profile        |

---

### Availability

| Method | Endpoint                             | Role    | Description                      |
| ------ | ------------------------------------ | ------- | -------------------------------- |
| GET    | `/api/availability`                  | Public  | All availability slots           |
| GET    | `/api/availability/upcoming`         | Public  | All future availability slots    |
| POST   | `/api/availability/create-slot`      | Tutor   | Create a new availability slot   |
| GET    | `/api/availability/my-slots`         | Tutor   | Tutor's own slots                |
| PUT    | `/api/availability/:id`              | Tutor   | Update a slot                    |
| DELETE | `/api/availability/:id`              | Tutor   | Delete a slot                    |
| GET    | `/api/availability/student-upcoming` | Student | Upcoming slots available to book |

---

### Bookings

| Method | Endpoint                                      | Role    | Description                          |
| ------ | --------------------------------------------- | ------- | ------------------------------------ |
| POST   | `/api/bookings/book`                          | Student | Book an availability slot            |
| DELETE | `/api/bookings/cancel/:id`                    | Student | Cancel a booking                     |
| GET    | `/api/bookings/student-list`                  | Student | All of the student's bookings        |
| GET    | `/api/bookings/student-stats`                 | Student | Student booking statistics           |
| POST   | `/api/bookings/complete`                      | Tutor   | Mark a booking as completed          |
| GET    | `/api/bookings/tutor-list`                    | Tutor   | All bookings for the tutor           |
| GET    | `/api/bookings/slot-students/:availabilityId` | Tutor   | Students enrolled in a specific slot |

---

### Payments (Stripe)

| Method | Endpoint                                    | Role    | Description                                                       |
| ------ | ------------------------------------------- | ------- | ----------------------------------------------------------------- |
| POST   | `/api/payments/create-checkout-session`     | Student | Create a Stripe Checkout session for an existing booking (`both`) |
| POST   | `/api/payments/create-direct-checkout`      | Student | Direct checkout for stripe-only slots (pay first, book after)     |
| GET    | `/api/payments/receipt/:sessionId`          | Student | Get payment receipt details by Stripe session ID                  |
| GET    | `/api/payments/receipt/:sessionId/download` | Student | Download a styled PDF receipt for the payment                     |
| POST   | `/api/webhook`                              | —       | Stripe webhook endpoint (raw body, no auth)                       |

> **Webhook Note:** The webhook route is registered separately in `app.ts` with `express.raw()` (before `express.json()`) to receive the raw body required for Stripe signature verification.

---

### Reviews

| Method | Endpoint                             | Role    | Description                             |
| ------ | ------------------------------------ | ------- | --------------------------------------- |
| GET    | `/api/reviews/tutor/:tutorProfileId` | Public  | All reviews for a tutor                 |
| POST   | `/api/reviews/add`                   | Student | Submit a review for a completed booking |
| GET    | `/api/reviews/my-reviews`            | Student | Student's submitted reviews             |

---

### Profile

| Method | Endpoint                    | Role            | Description                                                 |
| ------ | --------------------------- | --------------- | ----------------------------------------------------------- |
| GET    | `/api/profile/me`           | Student / Tutor | Get own profile (role-aware response)                       |
| PUT    | `/api/profile/update`       | Student / Tutor | Update own profile                                          |
| POST   | `/api/profile/upload-image` | Student / Tutor | Upload a profile image via Cloudinary (multipart/form-data) |

---

### Admin

> All endpoints require the `admin` role.

| Method | Endpoint                         | Description                           |
| ------ | -------------------------------- | ------------------------------------- |
| GET    | `/api/admin/stats`               | Platform-wide dashboard statistics    |
| GET    | `/api/admin/users`               | List all users                        |
| PATCH  | `/api/admin/users/:userId/ban`   | Toggle user ban status                |
| GET    | `/api/admin/tutors`              | List all tutors                       |
| PATCH  | `/api/admin/tutors/:id/featured` | Toggle tutor featured status          |
| PATCH  | `/api/admin/tutors/:id/verify`   | Toggle tutor verification status      |
| GET    | `/api/admin/bookings`            | View all bookings across the platform |
| GET    | `/api/admin/availabilities`      | View all availability slots           |
| POST   | `/api/admin/categories`          | Create a new tutor category           |
| DELETE | `/api/admin/categories/:id`      | Delete a category                     |

---

## Authentication & Authorization

This project uses **[better-auth](https://better-auth.vercel.app/)** for session management.

- Sessions are stored as **secure, HTTP-only cookies** (`sameSite: "none"`, `secure: true`)
- The `requireAuth(roles[])` middleware on each route validates the session and asserts the user's role
- **Banned users** are blocked at login via a `before` auth hook — a `FORBIDDEN` error is returned
- Upon registration, a `StudentProfile` or `TutorProfile` is **automatically created** in the `after` user-create database hook

---

## Stripe Payment Integration

SkillBridge supports two distinct Stripe payment flows based on the availability slot's `paymentMethod`:

### Flow 1: Book-then-Pay (`paymentMethod: "both"`)

1. Student books a slot → booking is created with `paymentStatus: "unpaid"`
2. Student initiates payment → `POST /api/payments/create-checkout-session` with `bookingId`
3. Stripe Checkout session is created → student is redirected to Stripe's hosted page
4. On successful payment → Stripe webhook fires `checkout.session.completed`
5. Backend updates `Booking.paymentStatus` to `"paid"` and stores amount/currency/session ID

### Flow 2: Pay-to-Book (`paymentMethod: "stripe"`)

1. Student clicks pay → `POST /api/payments/create-direct-checkout` with `availabilityId`
2. Stripe Checkout session is created (no booking yet) with `flow: "stripe-only"` metadata
3. On successful payment → Stripe webhook creates the booking automatically in a transaction
4. The slot is marked as booked and the booking is created with `paymentStatus: "paid"`

### Receipt & PDF Download

- After payment, students are redirected to `/payment-success?session_id={id}`
- Receipt details are fetched via `GET /api/payments/receipt/:sessionId`
- A downloadable PDF receipt is generated server-side using **Puppeteer** with a styled HTML template

---

## Cloudinary Image Uploads

- Profile images are uploaded via `POST /api/profile/upload-image` (multipart/form-data, field name: `image`)
- **Multer** handles the upload in-memory with a 10 MB limit and image-only file filter
- The image buffer is streamed to **Cloudinary** with face-aware auto-cropping: `{ width: 400, height: 400, crop: "fill", gravity: "face" }`
- Images are stored in the `skillbridge/profiles` folder on Cloudinary
- The resulting `secure_url` is saved to the `User.image` field in the database

---

## Forgot / Reset Password

The password reset flow uses better-auth's built-in `sendResetPassword` hook with **Gmail OAuth2** as the transactional email provider:

1. **User requests reset** — client calls `POST /api/auth/forget-password` with their email
2. **Backend generates a token** — better-auth creates a `Verification` record and triggers the `sendResetPassword` callback
3. **Email is sent** — a styled HTML email with a reset link is sent via Nodemailer using Gmail OAuth2: `{CLIENT_URL}/reset-password?token={token}`
4. **User resets password** — the frontend's `/reset-password` page calls `POST /api/auth/reset-password` with the token and new password

> ⚠️ **Known Issue:** The forgot password email flow works correctly on localhost but may have delivery issues on Render. The implementation was migrated from Nodemailer (Gmail OAuth2) to Brevo's HTTP API to work around OAuth limitations in hosted environments.

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10
- A **PostgreSQL** database (local or hosted — [Neon](https://neon.tech) recommended)
- A **Stripe** account (for payment processing)
- A **Cloudinary** account (for image uploads)
- A **Brevo / Gmail OAuth2** account (for transactional emails — optional, only needed for password reset)

### Installation

```bash
git clone https://github.com/Sani-Mohibur/skill-bridge-backend.git
cd skill-bridge-backend
npm install
```

### Environment Variables

Create a `.env` file in the project root. Use the table below as a reference:

```env
# Server
PORT=5000

# PostgreSQL connection (pooled & direct for Prisma)
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST-DIRECT/DB?sslmode=require"

# Better Auth
BETTER_AUTH_SECRET=your_random_secret_here
BETTER_AUTH_URL=http://localhost:5000/api/auth

# CORS — URL of the frontend application
CLIENT_URL=http://localhost:3000

# Used by the database seeder & auth
BACKEND_URL=http://localhost:5000

# Cloudinary (image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Stripe (payments)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Gmail OAuth2 (password reset)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_google_refresh_token
EMAIL_USER=[your_gmail_address@gmail.com](mailto:your_gmail_address@gmail.com)

# Brevo (optional alternative)
BREVO_API_KEY=your_brevo_api_key
EMAIL_USER=[your_verified_sender_email@example.com](mailto:your_verified_sender_email@example.com)

```

| Variable                | Description                                         | Required    |
| ----------------------- | --------------------------------------------------- | ----------- |
| `PORT`                  | Port the server listens on                          | ✅          |
| `DATABASE_URL`          | Pooled PostgreSQL connection string (Prisma)        | ✅          |
| `DIRECT_URL`            | Direct (non-pooled) connection for migrations       | ✅          |
| `BETTER_AUTH_SECRET`    | Secret key for signing auth tokens                  | ✅          |
| `BETTER_AUTH_URL`       | Public base URL of the auth endpoint                | ✅          |
| `CLIENT_URL`            | Allowed CORS origin (frontend URL)                  | ✅          |
| `BACKEND_URL`           | Backend's own base URL (used by seeder & auth)      | ✅          |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name                               | ✅          |
| `CLOUDINARY_API_KEY`    | Cloudinary API key                                  | ✅          |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret                               | ✅          |
| `STRIPE_SECRET_KEY`     | Stripe secret key (from Stripe Dashboard)           | ✅          |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret                       | ✅          |
| `BREVO_API_KEY`         | Brevo (Sendinblue) API key for transactional emails | ⚠️ Optional |
| `EMAIL_USER`            | Verified sender email address in Brevo              | ⚠️ Optional |

> ⚠️ `BREVO_API_KEY` and `EMAIL_USER` are only required if you want the forgot/reset password email flow to work. Without them, the rest of the application functions normally.

### Database Setup

```bash
# Run all pending migrations
npm run db:migrate

# Generate the Prisma client
npm run db:generate

# Seed the database (creates the admin account)
npm run db:seed
```

> **Prisma Studio** — Inspect and manage your data visually:
>
> ```bash
> npm run db:studio
> ```

### Running the Server

```bash
# Development (hot-reload via tsx)
npm run dev

# Production build
npm run build
npm start
```

Server starts at `http://localhost:5000`.  
Health check: `GET /` → `{ "status": "OK", "timestamp": "..." }`

---

## Scripts

| Script        | Command                   | Description                              |
| ------------- | ------------------------- | ---------------------------------------- |
| `dev`         | `tsx watch src/server.ts` | Start dev server with hot-reload         |
| `build`       | `tsc`                     | Compile TypeScript to `dist/`            |
| `start`       | `node dist/src/server.js` | Run compiled production build            |
| `db:migrate`  | `npx prisma migrate dev`  | Create & run a new migration             |
| `db:generate` | `npx prisma generate`     | Regenerate Prisma client after changes   |
| `db:studio`   | `npx prisma studio`       | Open Prisma Studio GUI                   |
| `db:seed`     | `npx prisma db seed`      | Seed the database with the admin account |

---

## Deployment

The backend is configured for deployment on **[Render](https://render.com)**.

**Live URL:** `https://tutor-marketplace-backend.onrender.com`

For production, update these environment variables:

```env
BETTER_AUTH_URL=https://tutor-marketplace-backend.onrender.com/api/auth
CLIENT_URL=https://tutor-marketplace-sani.vercel.app
BACKEND_URL=https://tutor-marketplace-sani.vercel.app
```

> ⚠️ **Important:** `BETTER_AUTH_URL` must point to the backend's own deployed URL (not the frontend) to avoid auth state mismatch in cross-origin deployments.

Additionally, ensure the following are set in Render's environment:

```env
# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret  # Use the Render webhook endpoint URL

# Email (Brevo)
BREVO_API_KEY=your_brevo_api_key
EMAIL_USER=your_verified_sender_email@example.com
```

> 💡 **Stripe Webhook URL:** When deploying, create a webhook endpoint in the [Stripe Dashboard](https://dashboard.stripe.com/webhooks) pointing to `https://your-render-url.onrender.com/api/webhook` and listening for `checkout.session.completed` events. Use the generated webhook signing secret as `STRIPE_WEBHOOK_SECRET`.
