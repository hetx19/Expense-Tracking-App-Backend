# Expense Tracker Backend

[![Integration CI](https://github.com/hetx19/Expense-Tracking-App-Backend/actions/workflows/integration.yml/badge.svg)](https://github.com/hetx19/Expense-Tracking-App-Backend/actions/workflows/integration.yml)

A Node.js and Express REST API for tracking personal expenses and income, with JWT authentication, MongoDB storage, and Cloudinary-backed profile image uploads.

## Overview

The API lets a user register, sign in, and manage their own expense and income records. Each user's data is isolated and scoped to their account. In addition to CRUD operations on transactions, the API exposes a dashboard endpoint that aggregates totals and recent activity, and endpoints to export expenses or income to an Excel file.

## Features

- **Authentication** — JWT-based signup and sign-in, with passwords hashed using `bcryptjs`.
- **Expense & income tracking** — Create, list, and delete transactions, each scoped to the authenticated user.
- **Dashboard summary** — Aggregated balance, income/expense totals, and recent transactions.
- **Excel export** — Download expenses or income as an `.xlsx` file.
- **Profile images** — Upload and update a profile picture via Cloudinary.
- **Security middleware** — [Helmet](https://helmetjs.github.io/) HTTP headers, [CORS](https://github.com/expressjs/cors) restricted to a configured origin, and tiered rate limiting ([`express-rate-limit`](https://github.com/express-rate-limit/express-rate-limit)) — a stricter limit on auth routes, a looser one everywhere else.
- **Structured logging** — [Pino](https://getpino.io/) request/response logging via `pino-http`, with an `x-request-id` generated (or echoed back, if the client sent one) on every request for log correlation.
- **Centralized error handling** — A single Express error-handling middleware normalizes all thrown errors into a consistent JSON response and hides internal details in production.
- **Startup config validation** — Environment variables are parsed and validated with [Zod](https://zod.dev/) at boot; the process exits immediately if required variables are missing or malformed.

## Tech Stack

| Layer        | Technology                               |
| ------------ | ---------------------------------------- |
| Runtime      | Node.js, Express 5                       |
| Database     | MongoDB via Mongoose                     |
| Auth         | `jsonwebtoken`, `bcryptjs`               |
| Validation   | Zod (environment configuration)          |
| File uploads | Multer + Cloudinary                      |
| Logging      | Pino, `pino-http`                        |
| Security     | Helmet, `express-rate-limit`, CORS       |
| Testing      | Jest, Supertest, `mongodb-memory-server` |

## Prerequisites

- Node.js 18 or later (CI runs against 18.x, 20.x, and 22.x)
- npm
- A MongoDB instance (local or a hosted URI such as MongoDB Atlas)
- A Cloudinary account (required for the image upload endpoints)

## Installation

```bash
git clone https://github.com/hetx19/Expense-Tracking-App-Backend.git
cd Expense-Tracking-App-Backend
npm install
```

## Configuration

Copy the example environment file and fill in real values:

```bash
cp .env.example .env
```

`config/env.js` validates these variables on startup with Zod; the server refuses to start if any required value is missing or invalid.

| Variable                | Description                                      | Required                       |
| ----------------------- | ------------------------------------------------ | ------------------------------ |
| `PORT`                  | Port the server listens on                       | No — defaults to `5001`        |
| `NODE_ENV`              | `development`, `production`, or `test`           | No — defaults to `development` |
| `CLIENT_URL`            | Allowed origin for CORS                          | Yes                            |
| `MONGO_URI`             | MongoDB connection string                        | Yes                            |
| `JWT_SECRET`            | Secret used to sign JWTs (minimum 32 characters) | Yes                            |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name                            | Yes                            |
| `CLOUDINARY_API_KEY`    | Cloudinary API key                               | Yes                            |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret                            | Yes                            |

Tests load configuration from `.env.test` instead of `.env` (selected automatically when `NODE_ENV=test`).

## Usage

Start the development server (auto-restarts on file changes via `nodemon`):

```bash
npm run dev
```

Start the production server:

```bash
npm start
```

By default the API is available at `http://localhost:5001`.

## Project Structure

```text
.
├── app.js                  # Express app: middleware and route wiring
├── server.js                # Process entry point: connects to MongoDB, starts the server
├── config/
│   ├── env.js                # Zod-validated environment configuration
│   ├── db.js                  # MongoDB connection
│   └── cloudinary.js          # Cloudinary client configuration
├── controllers/              # Request handlers for auth, expense, income, dashboard
├── routes/                   # Express routers, mounted under /api/v1/*
├── middleware/
│   ├── auth.js                 # JWT verification (route protection)
│   ├── upload.js                # Multer configuration for image uploads
│   ├── rateLimiters.js          # Global and auth-specific rate limiters
│   └── errorHandler.js          # Centralized error-handling middleware
├── validators/                # Zod request-validation schemas (see note below)
├── models/                    # Mongoose schemas: User, Expense, Income
├── utils/
│   ├── AppError.js              # Custom operational-error class
│   ├── asyncHandler.js          # Wraps async route handlers for error propagation
│   └── logger.js                # Pino logger instance
└── test/                      # Jest + Supertest test suites
```

> **Note:** `validators/` contains Zod schemas for request bodies, but they are not yet wired into the route handlers — request-level validation currently happens with manual checks inside the controllers. Environment variable validation (`config/env.js`) is the only Zod validation active at runtime today.

## API Overview

All routes are mounted under `/api/v1`. Routes marked **Auth** require a valid `Authorization: Bearer <token>` header.

### Auth (`/api/v1/auth`)

| Method | Path            | Auth | Description               |
| ------ | --------------- | ---- | ------------------------- |
| `POST` | `/signup`       | No   | Register a new user       |
| `POST` | `/signin`       | No   | Sign in and receive a JWT |
| `POST` | `/upload-image` | Yes  | Upload a profile image    |

### Users (`/api/v1/users`)

| Method   | Path        | Auth | Description                            |
| -------- | ----------- | ---- | -------------------------------------- |
| `GET`    | `/me`       | Yes  | Get the current user's profile         |
| `PUT`    | `/me`       | Yes  | Update name, email, or password        |
| `DELETE` | `/me`       | Yes  | Delete the current user and their data |
| `PUT`    | `/me/image` | Yes  | Replace the current profile image      |

### Expenses (`/api/v1/expenses`) and Income (`/api/v1/incomes`)

Both resources expose the same shape:

| Method   | Path        | Auth | Description                               |
| -------- | ----------- | ---- | ----------------------------------------- |
| `GET`    | `/`         | Yes  | List all records for the current user     |
| `POST`   | `/`         | Yes  | Create a record                           |
| `DELETE` | `/:id`      | Yes  | Delete a record owned by the current user |
| `GET`    | `/download` | Yes  | Export records to an `.xlsx` file         |

### Dashboard (`/api/v1/dashboard`)

| Method | Path | Auth | Description                               |
| ------ | ---- | ---- | ----------------------------------------- |
| `GET`  | `/`  | Yes  | Aggregated totals and recent transactions |

## Testing

Tests use Jest and Supertest, with `mongodb-memory-server` providing an isolated in-memory MongoDB instance — no external database is required to run the suite.

```bash
npm test
```

This runs the full suite with coverage enabled (`jest --coverage`) and writes an HTML report to `coverage/lcov-report/index.html`.

To run tests in watch mode:

```bash
npx jest --watch
```

<!-- TODO: Add npm run lint / npm run format once linting and formatting tooling is added to the project. -->

## Deployment

A `vercel.json` is included, configuring the app to run as a Vercel serverless function backed by `server.js`. No other deployment target is currently configured.

<!-- TODO: Document any additional production deployment steps (e.g. required Vercel project settings, MongoDB Atlas network access) once finalized. -->

## Troubleshooting

- **Server exits immediately on startup** — Check the console output for `❌ Invalid environment configuration`; this means one or more required variables in `.env` are missing or invalid. Compare against `.env.example`.
- **CORS errors from the frontend** — Confirm `CLIENT_URL` in `.env` exactly matches the origin the frontend is served from (including protocol and port).
- **Image upload requests fail** — Verify the three `CLOUDINARY_*` variables are set correctly; uploads depend on a valid Cloudinary connection.
- **Tests hang or fail to start** — `mongodb-memory-server` downloads a MongoDB binary on first run. If your environment blocks outbound network access, this download will fail; run tests somewhere with unrestricted network access, or pre-seed the binary cache.

## License

ISC (see `package.json`).
