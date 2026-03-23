# 🚖 CabApp — Full-Stack Ride Hailing Platform

A production-ready Uber-clone built with **Node.js + React + PostgreSQL + Socket.IO + Stripe**.

---

## 🏗️ Tech Stack

| Layer       | Technology                                      |
|-------------|-------------------------------------------------|
| Backend     | Node.js 20, Express.js, Socket.IO               |
| Frontend    | React 18, Tailwind CSS, Leaflet Maps            |
| Database    | PostgreSQL 16                                   |
| Cache       | Redis 7                                         |
| Auth        | JWT (access + refresh tokens), bcrypt           |
| Payments    | Stripe (Payment Intents + Webhooks)             |
| Real-Time   | Socket.IO (WebSockets)                          |
| Email       | Nodemailer (Gmail SMTP)                         |
| PDF         | PDFKit                                          |
| Deployment  | Docker + Docker Compose + Nginx                 |
| CI/CD       | GitHub Actions                                  |

---

## ✨ Features

- 🔐 **Auth** — JWT login, refresh tokens, role-based access (Rider / Driver / Admin)
- 🗺️ **Booking** — Location input, fare estimation, vehicle selection, promo codes
- 🚗 **Driver** — Accept/reject rides, OTP verification, toggle availability, earnings
- 📡 **Real-Time** — Live ride status, driver location tracking via Socket.IO
- 💳 **Payments** — Stripe card payments with webhook verification
- 🧾 **Receipts** — PDF receipt generation + email delivery
- ⭐ **Ratings** — Post-ride 1–5 star rating system
- 🛡️ **Admin** — User management, suspend accounts, ride monitoring, support tickets
- 🐳 **Docker** — Full containerised setup with one command

---

## 🚀 Quick Start

### Option 1 — Docker (Recommended)

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/cab-booking-app.git
cd cab-booking-app

# 2. Set up environment
cp .env.example .env
# Edit .env with your Stripe keys, email credentials, etc.

# 3. Start everything with one command
docker compose up --build

# App is now running at:
#   Frontend  → http://localhost
#   Backend   → http://localhost/api
#   WebSocket → http://localhost/socket.io
```

### Option 2 — Local Development

**Prerequisites:** Node.js 20+, PostgreSQL 16+, Redis (optional)

```bash
# ── Backend ──────────────────────────────────────────
cd backend
cp .env.example .env
# Fill in your .env values
npm install
npm run dev         # Starts on http://localhost:5000

# ── Frontend ─────────────────────────────────────────
cd ../frontend
cp .env.example .env
npm install
npm start           # Starts on http://localhost:3000

# ── Database ─────────────────────────────────────────
# Create DB and run schema:
psql -U postgres -c "CREATE DATABASE cabapp;"
psql -U postgres -d cabapp -f database/init.sql
```

---

## 🔑 Environment Variables

### Root `.env` (for Docker Compose)

| Variable                     | Description                          |
|------------------------------|--------------------------------------|
| `DB_PASSWORD`                | PostgreSQL password                  |
| `JWT_SECRET`                 | JWT signing secret (min 32 chars)    |
| `JWT_REFRESH_SECRET`         | Refresh token secret                 |
| `STRIPE_SECRET_KEY`          | Stripe secret key (sk_test_...)      |
| `STRIPE_WEBHOOK_SECRET`      | Stripe webhook secret (whsec_...)    |
| `REACT_APP_STRIPE_PUBLIC_KEY`| Stripe publishable key (pk_test_...) |
| `EMAIL_USER`                 | Gmail address                        |
| `EMAIL_PASS`                 | Gmail App Password (16-char)         |

---

## 📁 Project Structure

```
cab-booking-app/
├── backend/
│   ├── src/
│   │   ├── config/          # DB, logger
│   │   ├── controllers/     # auth, rides, drivers, payments, ratings, admin
│   │   ├── middleware/      # auth (JWT), errorHandler
│   │   ├── routes/          # all API routes
│   │   ├── services/        # fare, email, socket, PDF
│   │   └── index.js         # app entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Navbar, RideMap
│   │   ├── context/         # AuthContext, SocketContext
│   │   ├── pages/           # Login, Register, BookRide, ActiveRide, etc.
│   │   ├── utils/           # api.js (axios)
│   │   └── App.jsx
│   ├── Dockerfile
│   └── package.json
├── database/
│   └── init.sql             # Full PostgreSQL schema + seed data
├── nginx/
│   └── nginx.conf           # Reverse proxy config
├── .github/workflows/
│   └── deploy.yml           # CI/CD pipeline
├── docker-compose.yml
└── .env.example
```

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint              | Description        |
|--------|-----------------------|--------------------|
| POST   | /api/auth/register    | Register user/driver|
| POST   | /api/auth/login       | Login              |
| POST   | /api/auth/refresh     | Refresh token      |
| GET    | /api/auth/profile     | Get profile        |
| PATCH  | /api/auth/profile     | Update profile     |

### Rides
| Method | Endpoint                  | Description           |
|--------|---------------------------|-----------------------|
| GET    | /api/rides/estimate       | Fare estimate         |
| POST   | /api/rides/book           | Book a ride           |
| GET    | /api/rides/active         | Get active ride       |
| GET    | /api/rides/history        | Ride history          |
| POST   | /api/rides/:id/accept     | Driver accepts ride   |
| POST   | /api/rides/:id/start      | Start ride (OTP)      |
| POST   | /api/rides/:id/complete   | Complete ride         |
| POST   | /api/rides/:id/cancel     | Cancel ride           |
| GET    | /api/rides/:id/receipt    | Download PDF receipt  |

### Driver
| Method | Endpoint                    | Description        |
|--------|-----------------------------|--------------------|
| GET    | /api/drivers/me             | Driver profile     |
| PATCH  | /api/drivers/availability   | Toggle online/offline|
| PATCH  | /api/drivers/location       | Update GPS location|
| GET    | /api/drivers/earnings       | Earnings report    |
| GET    | /api/drivers/pending-rides  | See ride requests  |

---

## 💳 Stripe Setup

1. Create account at [stripe.com](https://stripe.com)
2. Get API keys from **Developers → API Keys**
3. For webhooks: **Developers → Webhooks → Add endpoint**
   - URL: `https://yourdomain.com/api/payments/webhook`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`

---

## 📧 Gmail Setup

1. Enable 2-Factor Authentication on your Gmail account
2. Go to **Google Account → Security → App passwords**
3. Generate a 16-character app password
4. Use this as `EMAIL_PASS` (not your regular Gmail password)

---

## 🐳 Deployment to a VPS (e.g. AWS EC2 / DigitalOcean)

```bash
# On your server:
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER && newgrp docker

# Clone and configure
git clone https://github.com/yourusername/cab-booking-app.git /opt/cabapp
cd /opt/cabapp
cp .env.example .env
nano .env   # Fill in production values

# Start
docker compose up -d --build

# View logs
docker compose logs -f backend
```

---

## 🚀 Deploy to Railway

1. Push to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add PostgreSQL service + Redis service
4. Set environment variables from `.env.example`
5. Railway auto-builds and deploys on every push ✅

---

## 👤 Default Admin Account

After running `init.sql`, an admin account is seeded:
- **Email:** `admin@cabapp.com`
- **Password:** `Admin@123`
- **Change this immediately in production!**

---

## 🔒 Security Features

- JWT access tokens (7d) + refresh tokens (30d)
- bcrypt password hashing (12 rounds)
- Rate limiting on all API routes
- Helmet.js security headers
- Role-based access control
- SQL injection prevention (parameterised queries)
- Stripe webhook signature verification

---

## 📄 License

MIT — Free to use, modify, and deploy.
