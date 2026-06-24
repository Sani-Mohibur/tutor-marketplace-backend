# SkillBridge — Backend

A robust, role-based REST API powering a tutor-student marketplace platform.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma ORM](https://img.shields.io/badge/Prisma_ORM-5A67D8?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Better Auth](https://img.shields.io/badge/Better_Auth-000000?style=for-the-badge&logo=brandfolder&logoColor=orange)

## 🌐 Live Links

- **Backend API Server:** [https://skill-bridge-backend-x2sb.onrender.com](https://skill-bridge-backend-x2sb.onrender.com)
- **Frontend UI Client:** [https://skillbridge-sani.vercel.app](https://skillbridge-sani.vercel.app)

> ⚠️ **Important Note:** This repository contains the backend service layer only. To experience the full application, it must be paired with the corresponding user interface. You can find the frontend repository here: [skill-bridge](https://github.com/Sani-Mohibur/skill-bridge)

---

## 📚 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Data Models](#data-models)
- [API Reference](#api-reference)
  - [Authentication](#authentication-better-auth)
  - [Tutor (Public)](#tutor-public)
  - [Availability](#availability)
  - [Bookings](#bookings)
  - [Reviews](#reviews)
  - [Profile](#profile)
  - [Admin](#admin)
- [Authentication & Authorization](#authentication--authorization)
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
- **Review system** — one review per completed booking; tutor ratings aggregated automatically
- **Admin control panel** — platform-wide stats, user management, tutor verification, and category control

---

## Tech Stack

| Layer          | Technology                          |
| -------------- | ----------------------------------- |
| Runtime        | Node.js (ESM)                       |
| Language       | TypeScript 6                        |
| Framework      | Express.js 5                        |
| ORM            | Prisma 7 (`prisma-client-js`)       |
| Database       | PostgreSQL (Neon serverless)        |
| Authentication | better-auth 1.6                     |
| HTTP Logging   | Morgan                              |
| Cross-Origin   | CORS (credentials + cookie support) |
| Dev Server     | tsx (watch mode)                    |

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
│   │   ├── availability.prisma  # Availability slots
│   │   ├── booking.prisma       # Booking model
│   │   ├── review.prisma        # Review model
│   │   └── category.prisma      # Category model
│   ├── migrations/              # Prisma migration history
│   └── seed.ts                  # Database seeder (admin account)
├── src/
│   ├── constants/               # Shared constants (user roles, etc.)
│   ├── errors/                  # Custom error classes
│   ├── lib/
│   │   ├── auth.ts              # better-auth configuration
│   │   └── prisma.ts            # Prisma client singleton
│   ├── middlewares/
│   │   ├── auth.middleware.ts   # requireAuth() — role-gated guard
│   │   └── globalErrorHandler.ts# Centralized error handler
│   ├── modules/
│   │   ├── admin/               # Admin dashboard module
│   │   ├── availability/        # Tutor slot management
│   │   ├── booking/             # Booking lifecycle
│   │   ├── profile/             # User profile management
│   │   ├── review/              # Review & rating system
│   │   └── tutor/               # Public tutor discovery
│   ├── utils/                   # Shared utility functions
│   ├── app.ts                   # Express app factory
│   └── server.ts                # HTTP server & DB bootstrap
├── .env                         # Environment variables (not committed)
├── tsconfig.json
└── package.json
```

---

## Data Models

| Model            | Key Fields                                                                    |
| ---------------- | ----------------------------------------------------------------------------- |
| `User`           | `id`, `name`, `email`, `role` (student/tutor/admin), `banned`                 |
| `TutorProfile`   | `bio`, `skills[]`, `pricePerHour`, `rating`, `isVerified`, `isFeatured`       |
| `StudentProfile` | `bio`, `education`, `interests[]`, `phone`, `address`                         |
| `Availability`   | `slot` (DateTime), `title`, `subject`, `pricePerHour`, `isBooked`, `status`   |
| `Booking`        | `status` (pending/confirmed/completed/cancelled), `amount`, `stripeSessionId` |
| `Review`         | `rating` (Int), `comment`, linked 1:1 to a completed Booking                  |
| `Category`       | Linked to `TutorProfile`                                                      |

---

## API Reference

All responses follow JSON format. Protected routes require a valid session cookie issued by `better-auth`.

### Authentication (better-auth)

Handled internally by better-auth at `/api/auth/*`. The library manages sessions via secure HTTP-only cookies.

| Method | Endpoint                  | Description              |
| ------ | ------------------------- | ------------------------ |
| POST   | `/api/auth/sign-up/email` | Register a new user      |
| POST   | `/api/auth/sign-in/email` | Sign in with credentials |
| POST   | `/api/auth/sign-out`      | Invalidate session       |
| GET    | `/api/auth/get-session`   | Get current session info |

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

### Reviews

| Method | Endpoint                             | Role    | Description                             |
| ------ | ------------------------------------ | ------- | --------------------------------------- |
| GET    | `/api/reviews/tutor/:tutorProfileId` | Public  | All reviews for a tutor                 |
| POST   | `/api/reviews/add`                   | Student | Submit a review for a completed booking |
| GET    | `/api/reviews/my-reviews`            | Student | Student's submitted reviews             |

---

### Profile

| Method | Endpoint              | Role            | Description                           |
| ------ | --------------------- | --------------- | ------------------------------------- |
| GET    | `/api/profile/me`     | Student / Tutor | Get own profile (role-aware response) |
| PUT    | `/api/profile/update` | Student / Tutor | Update own profile                    |

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

## Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10
- A **PostgreSQL** database (local or hosted — [Neon](https://neon.tech) recommended)

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

# Used by the database seeder
BACKEND_URL=http://localhost:5000
```

| Variable             | Description                                   | Required |
| -------------------- | --------------------------------------------- | -------- |
| `PORT`               | Port the server listens on                    | ✅       |
| `DATABASE_URL`       | Pooled PostgreSQL connection string (Prisma)  | ✅       |
| `DIRECT_URL`         | Direct (non-pooled) connection for migrations | ✅       |
| `BETTER_AUTH_SECRET` | Secret key for signing auth tokens            | ✅       |
| `BETTER_AUTH_URL`    | Public base URL of the auth endpoint          | ✅       |
| `CLIENT_URL`         | Allowed CORS origin (frontend URL)            | ✅       |
| `BACKEND_URL`        | Backend's own base URL (used by seeder)       | ✅       |

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

**Live URL:** `https://skill-bridge-backend-x2sb.onrender.com`

For production, update these environment variables:

```env
BETTER_AUTH_URL=https://skill-bridge-backend-x2sb.onrender.com/api/auth
CLIENT_URL=https://skillbridge-sani.vercel.app
BACKEND_URL=https://skill-bridge-backend-x2sb.onrender.com
```

> ⚠️ **Important:** `BETTER_AUTH_URL` must point to the backend's own deployed URL (not the frontend) to avoid auth state mismatch in cross-origin deployments.
