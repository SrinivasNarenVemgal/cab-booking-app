const crypto  = require('crypto');
const { query } = require('../config/db');

// ─── POST /api/payments/create-order ─────────────────────────────────────────
const createOrder = async (req, res, next) => {
  try {
    const { ride_id } = req.body;
    const rideResult = await query(
      'SELECT * FROM rides WHERE id = $1 AND rider_id = $2',
      [ride_id, req.user.id]
    );
    if (!rideResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }
    const ride = rideResult.rows[0];
    const amount = Math.round(parseFloat(ride.final_fare || ride.estimated_fare) * 100);
    const orderId = 'ORDER_' + crypto.randomBytes(8).toString('hex').toUpperCase();

    res.json({
      success: true,
      data: {
        order: { id: orderId, amount, currency: 'INR' }
      }
    });
  } catch (err) { next(err); }
};

// ─── POST /api/payments/verify ────────────────────────────────────────────────
const verifyPayment = async (req, res, next) => {
  try {
    const { ride_id, razorpay_payment_id } = req.body;
    await query(
      `UPDATE payments SET status = 'completed' WHERE ride_id = $1`,
      [ride_id]
    );
    await query(`UPDATE rides SET payment_status = 'completed' WHERE id = $1`, [ride_id]);
    res.json({ success: true, message: 'Payment verified' });
  } catch (err) { next(err); }
};

// ─── POST /api/payments/cash ──────────────────────────────────────────────────
const recordCash = async (req, res, next) => {
  try {
    const { ride_id } = req.body;
    const rideResult = await query('SELECT * FROM rides WHERE id = $1 AND rider_id = $2', [ride_id, req.user.id]);
    if (!rideResult.rows.length) return res.status(404).json({ success: false, message: 'Ride not found' });
    const ride = rideResult.rows[0];

    // Insert or update payment record
    await query(
      `INSERT INTO payments (ride_id, rider_id, amount, method, status)
       VALUES ($1, $2, $3, 'cash', 'completed')
       ON CONFLICT DO NOTHING`,
      [ride.id, ride.rider_id, ride.final_fare || ride.estimated_fare]
    );
    await query(
      `UPDATE rides SET payment_status = 'completed', payment_method = 'cash' WHERE id = $1`,
      [ride_id]
    );
    res.json({ success: true, message: 'Cash payment recorded' });
  } catch (err) { next(err); }
};

// ─── POST /api/payments/mock-complete ────────────────────────────────────────
const mockComplete = async (req, res, next) => {
  try {
    const { ride_id, method = 'card' } = req.body;
    const rideResult = await query('SELECT * FROM rides WHERE id = $1', [ride_id]);
    if (!rideResult.rows.length) return res.status(404).json({ success: false, message: 'Ride not found' });
    const ride = rideResult.rows[0];
    const txnId = 'TXN' + Date.now().toString().slice(-10);

    await query(
      `INSERT INTO payments (ride_id, rider_id, amount, method, status, stripe_charge_id)
       VALUES ($1, $2, $3, $4, 'completed', $5)
       ON CONFLICT DO NOTHING`,
      [ride.id, ride.rider_id, ride.final_fare || ride.estimated_fare, method, txnId]
    );
    await query(`UPDATE rides SET payment_status = 'completed' WHERE id = $1`, [ride_id]);

    res.json({ success: true, message: 'Payment completed', data: { txnId, amount: ride.final_fare || ride.estimated_fare } });
  } catch (err) { next(err); }
};

// ─── GET /api/payments/history ────────────────────────────────────────────────
const getPaymentHistory = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.*, r.pickup_address, r.dropoff_address, r.vehicle_type
       FROM payments p JOIN rides r ON p.ride_id = r.id
       WHERE p.rider_id = $1 ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

// Legacy aliases
const stripeWebhook       = (req, res) => res.json({ received: true });
const createPaymentIntent = createOrder;
const confirmPayment      = verifyPayment;

module.exports = {
  createOrder, verifyPayment, recordCash, mockComplete,
  getPaymentHistory, stripeWebhook, createPaymentIntent, confirmPayment
};
