const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');

// ─── Auth Routes ──────────────────────────────────────────────────────────────
const authRouter = express.Router();
const authController = require('../controllers/authController');
authRouter.post('/register',        authController.register);
authRouter.post('/login',           authController.login);
authRouter.post('/refresh',         authController.refreshToken);
authRouter.get('/profile',          authenticate, authController.getProfile);
authRouter.patch('/profile',        authenticate, authController.updateProfile);
authRouter.post('/change-password', authenticate, authController.changePassword);

// ─── Ride Routes ──────────────────────────────────────────────────────────────
const rideRouter = express.Router();
const rideController = require('../controllers/rideController');
rideRouter.get('/estimate',       authenticate, rideController.getEstimate);
rideRouter.get('/active',         authenticate, rideController.getActiveRide);
rideRouter.get('/history',        authenticate, rideController.getRideHistory);
rideRouter.get('/:id',            authenticate, rideController.getRideById);
rideRouter.get('/:id/receipt',    authenticate, rideController.downloadReceipt);
rideRouter.post('/book',          authenticate, rideController.bookRide);
rideRouter.post('/:id/accept',    authenticate, rideController.acceptRide);
rideRouter.post('/:id/start',     authenticate, rideController.startRide);
rideRouter.post('/:id/complete',  authenticate, rideController.completeRide);
rideRouter.post('/:id/cancel',    authenticate, rideController.cancelRide);

// ─── Driver Routes ────────────────────────────────────────────────────────────
const driverRouter = express.Router();
const driverController = require('../controllers/driverController');
driverRouter.get('/me',             authenticate, authorize('driver'), driverController.getMyProfile);
driverRouter.get('/earnings',       authenticate, authorize('driver'), driverController.getEarnings);
driverRouter.get('/pending-rides',  authenticate, authorize('driver'), driverController.getPendingRides);
driverRouter.patch('/availability', authenticate, authorize('driver'), driverController.toggleAvailability);
driverRouter.patch('/location',     authenticate, authorize('driver'), driverController.updateLocation);
driverRouter.get('/:id',            authenticate, driverController.getDriverPublic);

// ─── Payment Routes ───────────────────────────────────────────────────────────
const paymentRouter = express.Router();
const paymentController = require('../controllers/paymentController');
paymentRouter.post('/create-order',    authenticate, paymentController.createOrder);
paymentRouter.post('/create-intent',   authenticate, paymentController.createOrder);
paymentRouter.post('/verify',          authenticate, paymentController.verifyPayment);
paymentRouter.post('/confirm',         authenticate, paymentController.verifyPayment);
paymentRouter.post('/cash',            authenticate, paymentController.recordCash);
paymentRouter.post('/mock-complete',   authenticate, paymentController.mockComplete);
paymentRouter.get('/history',          authenticate, paymentController.getPaymentHistory);
paymentRouter.post('/webhook',         express.raw({ type: 'application/json' }), paymentController.stripeWebhook);

// ─── Rating Routes ────────────────────────────────────────────────────────────
const ratingRouter = express.Router();
const ratingController = require('../controllers/ratingController');
ratingRouter.post('/',                  authenticate, ratingController.submitRating);
ratingRouter.get('/driver/:driverId',   authenticate, ratingController.getDriverRatings);

// ─── Admin Routes ─────────────────────────────────────────────────────────────
const adminRouter = express.Router();
const adminController = require('../controllers/adminController');
adminRouter.use(authenticate, authorize('admin'));
adminRouter.get('/stats',                   adminController.getDashboardStats);
adminRouter.get('/users',                   adminController.getAllUsers);
adminRouter.patch('/users/:id/suspend',     adminController.suspendUser);
adminRouter.get('/rides',                   adminController.getAllRides);
adminRouter.get('/revenue',                 adminController.getRevenuReport);
adminRouter.get('/support-tickets',         adminController.getSupportTickets);
adminRouter.patch('/support-tickets/:id',   adminController.replyTicket);

module.exports = { authRouter, rideRouter, driverRouter, paymentRouter, ratingRouter, adminRouter };
