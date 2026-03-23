require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const logger = require('./config/logger');
const { pool } = require('./config/db');
const { initSocket } = require('./services/socketService');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { authRouter, rideRouter, driverRouter, paymentRouter, ratingRouter, adminRouter } = require('./routes');
const rideController = require('./controllers/rideController');

// ─── App Setup ────────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// Ensure logs directory
if (!fs.existsSync('logs')) fs.mkdirSync('logs');
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// ─── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

initSocket(io);
rideController.setIO(io);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// Raw body for Stripe webhook BEFORE express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  message: { success: false, message: 'Too many requests, try again later.' },
});
app.use('/api', limiter);

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/rides', rideRouter);
app.use('/api/drivers', driverRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/ratings', ratingRouter);
app.use('/api/admin', adminRouter);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(`🚖 CabApp Backend running on port ${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`📡 WebSocket ready`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await pool.end();
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
});

module.exports = { app, io };
