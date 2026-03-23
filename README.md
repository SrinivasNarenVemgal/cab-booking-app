# 🚖 CabApp — Full-Stack Ride Hailing Platform

> A production-ready Uber/Ola clone built from scratch using Node.js, React, PostgreSQL and Socket.IO

[![Live Demo](https://img.shields.io/badge/Live%20Demo-srinivas--cabapp.vercel.app-brightgreen)](https://srinivas-cabapp.vercel.app)
[![Backend](https://img.shields.io/badge/Backend%20API-onrender.com-blue)](https://cabapp-backend.onrender.com/health)
[![GitHub](https://img.shields.io/badge/GitHub-SrinivasNarenVemgal-black)](https://github.com/SrinivasNarenVemgal/cab-booking-app)

---

## 🌐 Live Links

| Service | URL |
|---------|-----|
| 🌐 Frontend (Live App) | https://srinivas-cabapp.vercel.app |
| ⚡ Backend API | https://cabapp-backend.onrender.com |
| 🏥 Health Check | https://cabapp-backend.onrender.com/health |
| 💻 GitHub Repo | https://github.com/SrinivasNarenVemgal/cab-booking-app |

> ⚠️ The backend is hosted on Render's free tier. It sleeps after 15 minutes of inactivity.
> First request after sleep may take 30–50 seconds to respond. This is normal for free hosting.

---

## 📌 What Is This Project?

CabApp is a fully functional ride-hailing platform — similar to Ola or Uber — where:

- **Riders** can register, book rides, track their driver live on a map, pay using card/UPI/cash, and download PDF receipts
- **Drivers** can go online/offline, receive ride requests in real-time, verify rider OTP before starting, and track their daily/weekly earnings
- **Admins** can monitor all users, rides, payments, and handle support tickets from a dashboard

This is not just a UI demo — it has a real backend, real database, real-time WebSocket communication, and is fully deployed online.

---

## 🏗️ Tech Stack

| Layer | Technology | Why This Was Chosen |
|-------|-----------|---------------------|
| Backend | Node.js 20 + Express.js | Lightweight, fast, great for real-time apps |
| Frontend | React 18 + Tailwind CSS | Component-based, fast to build, looks great |
| Database | PostgreSQL 16 | Reliable SQL database, perfect for relational ride/payment data |
| Cache | Redis 7 | In-memory storage, used for fast session/data caching |
| Authentication | JWT + bcrypt | Industry-standard secure login with hashed passwords |
| Real-Time | Socket.IO (WebSockets) | Enables live updates without page refresh |
| Maps | Leaflet + OpenStreetMap | Free and open-source (Google Maps charges $200+/month) |
| Email | Nodemailer (Gmail SMTP) | Send ride confirmations and receipts via email |
| PDF | PDFKit | Generate and download ride receipts as PDF files |
| Containerisation | Docker + Docker Compose | Run all services together with one command |
| Reverse Proxy | Nginx | Routes frontend/backend traffic, handles WebSocket upgrades |
| CI/CD | GitHub Actions | Automatically deploys when code is pushed to GitHub |
| Frontend Host | Vercel | Free, global CDN, perfect for React apps |
| Backend Host | Render | Free tier, auto-deploys from GitHub |

---

## ✨ Features

### 🔐 User Authentication
- Separate registration flows for Riders and Drivers
- JWT access tokens (valid 7 days) + refresh tokens (valid 30 days)
- Auto token refresh — user stays logged in without re-entering password
- bcrypt password hashing with 12 salt rounds
- Role-based access control — Rider, Driver, and Admin each see different pages
- Protected API routes — unauthorized requests are rejected

### 🗺️ Ride Booking
- Enter pickup and drop-off location with coordinates
- One-click GPS auto-detect for current location
- Fare estimation for all 4 vehicle types at once (Sedan, SUV, Auto, Bike)
- Fare calculation using the **Haversine formula** — calculates real distance between two GPS coordinates on Earth
- Surge pricing during peak hours (morning 8–10am, evening 6–9pm) — 1.5x multiplier applied automatically
- Promo code support with discount types (percentage or flat amount)
- Payment method selection — Card or Cash before booking
- OTP generated at booking time for ride security

### 🚖 Driver Dashboard
- Toggle online/offline with one button
- Real-time ride request notifications via Socket.IO
- View all pending ride requests with pickup, drop, fare details
- Accept ride — uses atomic database transaction to prevent two drivers accepting the same ride
- OTP verification before starting (rider shares 4-digit OTP, driver enters it)
- GPS location broadcasting every 5 seconds when ride is active
- Complete ride button to end the trip
- Weekly/monthly earnings breakdown with daily chart
- Personal stats: total rides, average rating, total earnings

### 📡 Real-Time Communication
- Rider gets instant notification when driver accepts
- Live driver location shown on rider's map
- Ride status updates in real-time: requested → accepted → in_progress → completed
- SOS button broadcasts emergency alert to admin
- Chat messages between rider and driver (in-ride)
- Socket.IO rooms — each ride has its own room so only relevant users get updates

### 💳 Payment System
- Card payment form with auto-formatting (card number, expiry, CVV)
- Test card fill with one click for demo purposes
- UPI payment with GPay / PhonePe / Paytm / BHIM options
- Wallet payments — Paytm Wallet, Amazon Pay, Mobikwik, Ola Money
- Cash payment option — confirm directly with driver
- Processing animation → success screen with unique Transaction ID
- Payment history stored in database

### 🧾 Ride History & Receipts
- Full paginated ride history with filter by status
- Each completed ride shows distance, duration, fare, driver name
- PDF receipt download — professionally formatted with fare breakdown
- Pay Now button for unpaid completed rides

### ⭐ Rating System
- 1–5 star rating popup after every completed ride
- Optional text comment/feedback
- Average rating calculated and displayed on driver profile
- Rating shown on driver dashboard and public profile

### 🛡️ Admin Panel
- Real-time overview stats: total users, rides, revenue, drivers online
- Users table — view all riders and drivers with active/suspended status
- Suspend or activate any user account instantly
- All rides table — monitor every booking with status filter
- Revenue report — daily earnings breakdown
- Support tickets — view all tickets, reply to users, mark as resolved

---

## 🐳 Docker — Why We Used It

### The Problem Without Docker

Imagine you build an app that needs Node.js, PostgreSQL, Redis, and Nginx all running at the same time. On your laptop, you install them manually. But when you deploy to a server, the versions are different, the configs are different, and things break. This is the famous "works on my machine" problem.

### What Docker Does

Docker packages each service into an isolated **container** — like a mini virtual machine with just enough to run that one service. Each container has the exact version and config you specified.

```
docker compose up --build
         ↓ spins up all 5 containers automatically:

┌──────────────────────────────────────────────┐
│              Nginx (Port 80)                 │
│     Routes all traffic to right service      │
│                   ↓                          │
│  ┌────────────┐  ┌────────────────────────┐  │
│  │  Frontend  │  │   Backend (Node.js)    │  │
│  │  (React)   │  │   Port 5000            │  │
│  └────────────┘  └────────────────────────┘  │
│                         ↓                    │
│  ┌────────────┐  ┌─────────────┐             │
│  │ PostgreSQL │  │    Redis    │             │
│  │  Port 5432 │  │  Port 6379  │             │
│  └────────────┘  └─────────────┘             │
└──────────────────────────────────────────────┘
```

### Alternatives to Docker

| Tool | What It Does | Best For |
|------|-------------|----------|
| **PM2** | Runs Node.js processes, auto-restarts on crash | Simple Node-only apps |
| **Heroku** | Platform-as-a-service, no Docker needed | Quick deploys, small projects |
| **Railway** | Auto-detects your stack and deploys | Fast prototyping |
| **Render** | Free tier hosting, GitHub auto-deploy | Hobby projects (what we use) |
| **Vercel** | Optimised for frontend React/Next.js apps | Frontend deployment (what we use) |
| **AWS EC2** | Full Linux server, total control | Production apps, large scale |
| **DigitalOcean** | Simple affordable VPS | Budget production deployment |
| **Google Cloud Run** | Runs Docker containers serverlessly | Scalable container deployment |

### Why We Still Used Docker Even With Render/Vercel

Docker is used for **local development** on your own PC. It lets anyone clone the repo and run the entire app with one command — no manual installs needed. The cloud deployment (Render + Vercel) handles production.

---

## 🚀 Running Locally

### Option 1 — Docker (Easiest, one command)

Requirements: Docker Desktop installed

```bash
# Clone the project
git clone https://github.com/SrinivasNarenVemgal/cab-booking-app.git
cd cab-booking-app

# Copy environment file and fill in values
cp .env.example .env
notepad .env

# Start all 5 services with one command
docker compose up --build

# App is live at http://localhost
```

To stop:
```bash
docker compose down
```

### Option 2 — Manual (Without Docker)

Requirements: Node.js 20+, PostgreSQL 16+, Redis (optional)

```bash
# ── Step 1: Database ──────────────────────────────────
# Create database in PostgreSQL
psql -U postgres -c "CREATE DATABASE cabapp;"
psql -U postgres -d cabapp -f database/init.sql

# ── Step 2: Backend ───────────────────────────────────
cd backend
cp .env.example .env
# Edit .env with your DB credentials and JWT secret
npm install
npm run dev
# Backend runs at http://localhost:5000

# ── Step 3: Frontend (new terminal) ──────────────────
cd frontend
cp .env.example .env
# Edit .env with backend URL
npm install
npm run dev
# Frontend runs at http://localhost:3000
```

---

## ☁️ Cloud Deployment (How This App Is Hosted)

### Architecture

```
User's Browser
      ↓
Vercel (Frontend - React app)
      ↓ API calls
Render (Backend - Node.js API)
      ↓
Render PostgreSQL (Database)
```

### Frontend → Vercel

Vercel is the best platform for React apps. It connects directly to GitHub and deploys automatically on every push.

1. Go to https://vercel.com → Login with GitHub
2. Import the `cab-booking-app` repo
3. Set Root Directory: `frontend`
4. Add environment variables:
   ```
   VITE_API_URL=https://cabapp-backend.onrender.com/api
   VITE_SOCKET_URL=https://cabapp-backend.onrender.com
   ```
5. Deploy → get a live URL instantly

### Backend → Render

1. Go to https://render.com → New Web Service
2. Connect GitHub repo
3. Set Root Directory: `backend`
4. Build Command: `npm install`
5. Start Command: `node src/index.js`
6. Add environment variables (DB connection, JWT secrets)
7. Deploy

### Database → Render PostgreSQL

1. Render Dashboard → New → PostgreSQL
2. Free tier gives 1GB storage, 90 days
3. Copy the Internal Database URL → paste as `DATABASE_URL` in backend env vars
4. Run schema: connect and execute `database/init.sql`

### Alternative: Deploy Everything on Railway

Railway can host all services in one place:
1. Go to https://railway.app → New Project → Deploy from GitHub
2. Add PostgreSQL service → Add Redis service
3. Set environment variables
4. Railway auto-detects Node.js and deploys

---

## 📁 Project Structure Explained

```
cab-booking-app/
│
├── backend/                      ← Node.js Express API
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js             ← PostgreSQL connection pool (supports DATABASE_URL)
│   │   │   └── logger.js         ← Winston logger (info/error/debug levels)
│   │   │
│   │   ├── controllers/          ← Business logic for each feature
│   │   │   ├── authController.js     → register, login, refresh, profile
│   │   │   ├── rideController.js     → book, accept, start, complete, cancel
│   │   │   ├── driverController.js   → availability, location, earnings
│   │   │   ├── paymentController.js  → payment processing, history
│   │   │   ├── ratingController.js   → submit rating, get driver ratings
│   │   │   └── adminController.js    → stats, users, rides, tickets
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.js           ← JWT verification + role checking
│   │   │   └── errorHandler.js   ← Global error handling (Postgres errors, JWT errors)
│   │   │
│   │   ├── routes/
│   │   │   └── index.js          ← All API routes connected to controllers
│   │   │
│   │   ├── services/
│   │   │   ├── fareService.js    ← Haversine formula, surge pricing, vehicle rates
│   │   │   ├── socketService.js  ← Socket.IO event handlers, room management
│   │   │   ├── emailService.js   ← Welcome email, ride confirmation, receipt
│   │   │   └── pdfService.js     ← PDF receipt generation with PDFKit
│   │   │
│   │   └── index.js              ← Express app + Socket.IO server setup
│   │
│   ├── Dockerfile                ← Backend container config
│   ├── package.json
│   └── .env.example              ← All required environment variables
│
├── frontend/                     ← React 18 + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx        ← Responsive nav with role-based links
│   │   │   └── RideMap.jsx       ← Leaflet map with pickup/dropoff/driver markers
│   │   │
│   │   ├── context/
│   │   │   ├── AuthContext.jsx   ← Global user state, login/logout/token management
│   │   │   └── SocketContext.jsx ← Socket.IO connection, event helpers
│   │   │
│   │   ├── pages/
│   │   │   ├── Login.jsx          ← Email/password login form
│   │   │   ├── Register.jsx       ← Rider or Driver registration with vehicle details
│   │   │   ├── BookRide.jsx       ← Location input, fare estimates, booking form
│   │   │   ├── ActiveRide.jsx     ← Live ride tracking, OTP display, SOS
│   │   │   ├── DriverDashboard.jsx← Online toggle, ride requests, earnings
│   │   │   ├── RideHistory.jsx    ← Past rides with filter and PDF download
│   │   │   ├── Payment.jsx        ← Card/UPI/Wallet/Cash payment options
│   │   │   ├── AdminDashboard.jsx ← Stats, users, rides, support tickets
│   │   │   ├── Profile.jsx        ← Edit profile, change password
│   │   │   └── NotFound.jsx       ← 404 page
│   │   │
│   │   ├── utils/
│   │   │   └── api.js            ← Axios instance with auto token refresh interceptor
│   │   │
│   │   ├── App.jsx               ← Routes + role-based route guards
│   │   ├── main.jsx              ← React app entry point
│   │   └── index.css             ← Tailwind + custom component classes
│   │
│   ├── Dockerfile                ← Multi-stage: build React → serve with Nginx
│   ├── vite.config.js            ← Vite build config with proxy
│   ├── tailwind.config.js
│   └── package.json
│
├── database/
│   └── init.sql                  ← 8 tables, indexes, triggers, seed admin user
│
├── nginx/
│   └── nginx.conf                ← Reverse proxy, WebSocket upgrade, rate limiting
│
├── .github/workflows/
│   └── deploy.yml                ← CI/CD: test → build → deploy on push to main
│
├── docker-compose.yml            ← Orchestrates all 5 Docker containers
├── .env.example                  ← Template for all environment variables
└── README.md                     ← This file
```

---

## 🗄️ Database Design

### Tables and Relationships

```
users (id, name, email, password, role, phone, is_active)
   │
   ├──→ drivers (id, user_id, vehicle_model, vehicle_plate, rating, earnings)
   │
   ├──→ rides (id, rider_id, driver_id, pickup, dropoff, status, otp, fare)
   │              │
   │              ├──→ payments (id, ride_id, amount, method, status)
   │              │
   │              ├──→ ratings (id, ride_id, driver_rating, rider_rating)
   │              │
   │              └──→ support_tickets (id, ride_id, subject, status)
   │
   ├──→ notifications (id, user_id, title, message, is_read)
   │
   └──→ promo_codes (id, code, discount_type, discount_value)
```

### Key Design Decisions
- UUID primary keys (not integers) — prevents ID enumeration attacks
- Soft deletes via `is_active` flag — data is preserved, not deleted
- `updated_at` auto-triggers — database automatically tracks last update time
- Indexed on `rider_id`, `driver_id`, `status` — fast query performance
- Parameterised queries throughout — prevents SQL injection

---

## 🌐 API Reference

### Auth Routes
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | No | Register rider or driver |
| POST | /api/auth/login | No | Login, returns JWT tokens |
| POST | /api/auth/refresh | No | Get new access token |
| GET | /api/auth/profile | Yes | Get logged-in user profile |
| PATCH | /api/auth/profile | Yes | Update name/phone |
| POST | /api/auth/change-password | Yes | Change password securely |

### Ride Routes
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/rides/estimate | Yes | Fare for all vehicle types |
| POST | /api/rides/book | Rider | Book ride, notifies drivers |
| GET | /api/rides/active | Yes | Get current in-progress ride |
| GET | /api/rides/history | Yes | Paginated ride history |
| POST | /api/rides/:id/accept | Driver | Accept ride (atomic lock) |
| POST | /api/rides/:id/start | Driver | Start with OTP verification |
| POST | /api/rides/:id/complete | Driver | Mark ride completed |
| POST | /api/rides/:id/cancel | Yes | Cancel with reason |
| GET | /api/rides/:id/receipt | Rider | Download PDF receipt |

### Driver Routes
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/drivers/me | Driver | Profile + vehicle + stats |
| PATCH | /api/drivers/availability | Driver | Toggle online/offline |
| PATCH | /api/drivers/location | Driver | Update GPS coordinates |
| GET | /api/drivers/earnings | Driver | Earnings by period |
| GET | /api/drivers/pending-rides | Driver | Available ride requests |

### Payment Routes
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/payments/mock-complete | Rider | Complete demo payment |
| POST | /api/payments/cash | Rider | Record cash payment |
| GET | /api/payments/history | Rider | All payment records |

### Admin Routes (Admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/stats | Dashboard statistics |
| GET | /api/admin/users | All users with filter |
| PATCH | /api/admin/users/:id/suspend | Suspend or activate user |
| GET | /api/admin/rides | All rides with filter |
| GET | /api/admin/revenue | Daily revenue report |
| GET | /api/admin/support-tickets | All support tickets |
| PATCH | /api/admin/support-tickets/:id | Reply to ticket |

---

## 🔒 Security Implementation

| Feature | Implementation |
|---------|---------------|
| Password storage | bcrypt with 12 salt rounds |
| Authentication | JWT access token (7d) + refresh token (30d) |
| Token refresh | Auto-refresh via Axios interceptor |
| Route protection | authenticate middleware on all private routes |
| Role enforcement | authorize('rider'/'driver'/'admin') middleware |
| SQL injection | Parameterised queries with node-postgres |
| Rate limiting | 200 requests per 15 minutes per IP |
| Security headers | Helmet.js (XSS, CSRF, clickjacking protection) |
| CORS | Restricted to frontend domain |
| Race conditions | Atomic SQL transactions for ride acceptance |

---

## 🔑 Environment Variables Reference

### Backend (.env)
```env
# Server
PORT=5000
NODE_ENV=development

# Database (use DATABASE_URL for Render, or individual vars for local)
DATABASE_URL=postgresql://user:password@host/dbname
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cabapp
DB_USER=cabuser
DB_PASSWORD=your_password

# JWT Secrets (minimum 32 characters each)
JWT_SECRET=your_super_secret_key_minimum_32_characters
JWT_REFRESH_SECRET=your_refresh_secret_minimum_32_chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Email (Gmail with App Password)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_char_app_password

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost/api
VITE_SOCKET_URL=http://localhost
```

---

## 👤 Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@cabapp.com | Admin@123 |
| Rider | Register at /register | Your choice |
| Driver | Register at /register | Your choice |

---

## 🧪 How to Test the Full Flow

1. Open two browser tabs
2. **Tab 1** → Register as Rider (Sam)
3. **Tab 2** → Register as Driver (Chaitu) with vehicle details
4. **Tab 2** → Go to `/driver` → Click toggle to go Online
5. **Tab 1** → Go to `/book` → Click "Use demo locations" → See Prices → Book
6. **Tab 2** → See ride request appear in Requests tab → Click Accept
7. **Tab 1** → Go to `/ride/active` → See the big yellow OTP number
8. **Tab 2** → Click "Start Ride" → Enter OTP → Click OK
9. **Tab 2** → Click "Complete Ride ✓"
10. **Tab 1** → Rate the driver → Go to History → Click Pay Now

---

## 🎯 How to Explain This in an Interview

### Simple explanation (30 seconds):
> "I built a cab booking app like Ola or Uber. Riders can book rides, drivers accept them, and everything updates in real-time using WebSockets. The app has JWT authentication, live maps, OTP verification, payment processing, and an admin dashboard. It's fully deployed — frontend on Vercel, backend on Render."

### Technical depth (2 minutes):
> "The backend is a Node.js REST API using Express with Socket.IO for WebSocket communication. PostgreSQL stores all relational data — users, rides, payments, ratings. I used the Haversine formula to calculate GPS distances for fare calculation, with surge pricing during peak hours. For ride acceptance, I used atomic database transactions to prevent race conditions where two drivers might accept the same ride simultaneously. Authentication uses JWT with refresh tokens, and passwords are hashed with bcrypt at 12 rounds. The entire stack runs in Docker with 5 containers orchestrated by Docker Compose."

### Key technical terms to know:
- **Haversine formula** — math to calculate distance between two GPS points on Earth
- **WebSockets** — persistent two-way connection (unlike HTTP which is one request-one response)
- **Atomic transaction** — database operation that either fully succeeds or fully rolls back
- **JWT** — signed token that proves identity without querying the database on every request
- **Docker container** — isolated package with code + dependencies + runtime, runs same anywhere
- **Nginx** — reverse proxy that routes incoming requests to the right service
- **Rate limiting** — blocks users who make too many requests (prevents abuse)

---

## 📈 What Can Be Added Next

| Feature | How to add |
|---------|-----------|
| Real payments | Razorpay (after KYC approval) or PayU |
| Google Maps | Replace Leaflet with Google Maps API (needs billing) |
| SMS OTP | Twilio or MSG91 for real SMS |
| Google OAuth | Passport.js with Google Strategy |
| Push notifications | Firebase Cloud Messaging |
| Ride scheduling | Add scheduled_at field to rides table |
| Surge pricing map | Heat map of busy areas |
| Driver document upload | Multer + S3 storage |
| Multiple stops | Array of waypoints in rides table |

---

## 📄 License

MIT License — Free to use, modify, and deploy for personal or commercial projects.

---

*Built with Node.js · React · PostgreSQL · Socket.IO · Docker*

*Live at → https://srinivas-cabapp.vercel.app*
