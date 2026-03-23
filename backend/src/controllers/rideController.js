const { query, getClient } = require('../config/db');
const { calculateFare, getAllFareEstimates } = require('../services/fareService');
const { emitToUser, emitToRide, emitToAllDrivers } = require('../services/socketService');
const { sendRideConfirmationEmail } = require('../services/emailService');
const { generateReceiptPDF } = require('../services/pdfService');
const crypto = require('crypto');

let io; // set via setIO()
const setIO = (socketIO) => { io = socketIO; };

// ─── Generate 4-digit OTP ─────────────────────────────────────────────────────
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

// ─── GET /api/rides/estimate ──────────────────────────────────────────────────
const getEstimate = async (req, res, next) => {
  try {
    const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng } = req.query;

    if (!pickup_lat || !pickup_lng || !dropoff_lat || !dropoff_lng) {
      return res.status(400).json({ success: false, message: 'All coordinates are required' });
    }

    const estimates = getAllFareEstimates(
      parseFloat(pickup_lat), parseFloat(pickup_lng),
      parseFloat(dropoff_lat), parseFloat(dropoff_lng)
    );

    res.json({ success: true, data: estimates });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/rides/book ─────────────────────────────────────────────────────
const bookRide = async (req, res, next) => {
  try {
    const {
      pickup_address, pickup_lat, pickup_lng,
      dropoff_address, dropoff_lat, dropoff_lng,
      vehicle_type = 'sedan', payment_method = 'card',
      promo_code,
    } = req.body;

    // Calculate fare
    const fareData = calculateFare(
      parseFloat(pickup_lat), parseFloat(pickup_lng),
      parseFloat(dropoff_lat), parseFloat(dropoff_lng),
      vehicle_type
    );

    let finalFare = fareData.estimatedFare;

    // Apply promo code if provided
    if (promo_code) {
      const promo = await query(
        `SELECT * FROM promo_codes WHERE code = $1 AND is_active = true AND (valid_till IS NULL OR valid_till > NOW()) AND used_count < max_uses`,
        [promo_code.toUpperCase()]
      );
      if (promo.rows.length) {
        const p = promo.rows[0];
        finalFare = p.discount_type === 'percentage'
          ? finalFare * (1 - p.discount_value / 100)
          : Math.max(finalFare - p.discount_value, 0);

        await query('UPDATE promo_codes SET used_count = used_count + 1 WHERE id = $1', [p.id]);
      }
    }

    const otp = generateOTP();

    // Create ride
    const result = await query(
      `INSERT INTO rides (rider_id, pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng, vehicle_type, estimated_fare, distance_km, duration_minutes, payment_method, status, otp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'requested', $13)
       RETURNING *`,
      [req.user.id, pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng,
       vehicle_type, finalFare.toFixed(2), fareData.distanceKm, fareData.durationMinutes, payment_method, otp]
    );

    const ride = result.rows[0];

    // Notify all available drivers via socket
    emitToAllDrivers(io, 'new:ride:request', {
      rideId: ride.id,
      pickup: { address: pickup_address, lat: pickup_lat, lng: pickup_lng },
      dropoff: { address: dropoff_address, lat: dropoff_lat, lng: dropoff_lng },
      fare: finalFare.toFixed(2),
      vehicleType: vehicle_type,
      fareBreakdown: fareData.breakdown,
    });

    // Send confirmation email (non-blocking)
    const userResult = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    sendRideConfirmationEmail(userResult.rows[0], ride);

    res.status(201).json({
      success: true,
      message: 'Ride requested successfully',
      data: { ride, fareDetails: fareData },
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/rides/:id/accept (Driver) ──────────────────────────────────────
const acceptRide = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Get driver record
    const driverResult = await client.query('SELECT * FROM drivers WHERE user_id = $1', [req.user.id]);
    if (!driverResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }
    const driver = driverResult.rows[0];

    // Lock + update ride atomically
    const rideResult = await client.query(
      `UPDATE rides SET status = 'accepted', driver_id = $1 WHERE id = $2 AND status = 'requested' RETURNING *`,
      [driver.id, req.params.id]
    );

    if (!rideResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Ride already accepted or not available' });
    }

    const ride = rideResult.rows[0];

    // Set driver unavailable
    await client.query('UPDATE drivers SET is_available = false WHERE id = $1', [driver.id]);
    await client.query('COMMIT');

    // Get driver details to send to rider
    const driverUser = await query('SELECT id, name, phone, avatar FROM users WHERE id = $1', [req.user.id]);

    // Notify rider via socket
    emitToUser(io, ride.rider_id, 'ride:accepted', {
      rideId: ride.id,
      driver: { ...driverUser.rows[0], ...driver },
      status: 'accepted',
    });

    res.json({ success: true, message: 'Ride accepted', data: ride });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ─── POST /api/rides/:id/start (Driver) ───────────────────────────────────────
const startRide = async (req, res, next) => {
  try {
    const { otp } = req.body;

    const rideResult = await query(
      `SELECT r.*, d.user_id as driver_user_id FROM rides r
       JOIN drivers d ON r.driver_id = d.id
       WHERE r.id = $1 AND d.user_id = $2 AND r.status = 'accepted'`,
      [req.params.id, req.user.id]
    );

    if (!rideResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Ride not found or not accepted' });
    }

    const ride = rideResult.rows[0];

    if (ride.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    const updated = await query(
      `UPDATE rides SET status = 'in_progress', started_at = NOW() WHERE id = $1 RETURNING *`,
      [ride.id]
    );

    emitToRide(io, ride.id, 'ride:started', { rideId: ride.id, status: 'in_progress' });

    res.json({ success: true, message: 'Ride started', data: updated.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/rides/:id/complete (Driver) ────────────────────────────────────
const completeRide = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const rideResult = await client.query(
      `SELECT r.*, d.id as driver_db_id, d.total_earnings, d.total_rides FROM rides r
       JOIN drivers d ON r.driver_id = d.id
       WHERE r.id = $1 AND d.user_id = $2 AND r.status = 'in_progress'`,
      [req.params.id, req.user.id]
    );

    if (!rideResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Active ride not found' });
    }

    const ride = rideResult.rows[0];
    const finalFare = ride.estimated_fare;

    // Mark ride complete
    await client.query(
      `UPDATE rides SET status = 'completed', final_fare = $1, completed_at = NOW(), payment_status = 'completed' WHERE id = $2`,
      [finalFare, ride.id]
    );

    // Create payment record
    await client.query(
      `INSERT INTO payments (ride_id, rider_id, driver_id, amount, method, status)
       VALUES ($1, $2, $3, $4, $5, 'completed')`,
      [ride.id, ride.rider_id, ride.driver_db_id, finalFare, ride.payment_method]
    );

    // Update driver stats
    await client.query(
      `UPDATE drivers SET is_available = true, total_earnings = total_earnings + $1, total_rides = total_rides + 1 WHERE id = $2`,
      [finalFare, ride.driver_db_id]
    );

    await client.query('COMMIT');

    emitToRide(io, ride.id, 'ride:completed', {
      rideId: ride.id,
      finalFare,
      status: 'completed',
    });

    res.json({ success: true, message: 'Ride completed', data: { rideId: ride.id, finalFare } });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ─── POST /api/rides/:id/cancel ───────────────────────────────────────────────
const cancelRide = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const rideResult = await query(
      `SELECT * FROM rides WHERE id = $1 AND (rider_id = $2 OR EXISTS (
        SELECT 1 FROM drivers d WHERE d.id = rides.driver_id AND d.user_id = $2
      ))`,
      [req.params.id, req.user.id]
    );

    if (!rideResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    const ride = rideResult.rows[0];

    if (['completed', 'cancelled'].includes(ride.status)) {
      return res.status(400).json({ success: false, message: 'Ride cannot be cancelled' });
    }

    await query(
      `UPDATE rides SET status = 'cancelled', cancelled_by = $1, cancel_reason = $2 WHERE id = $3`,
      [req.user.role, reason, ride.id]
    );

    // Free driver if assigned
    if (ride.driver_id) {
      await query('UPDATE drivers SET is_available = true WHERE id = $1', [ride.driver_id]);
    }

    emitToRide(io, ride.id, 'ride:cancelled', {
      rideId: ride.id,
      cancelledBy: req.user.role,
      reason,
    });

    res.json({ success: true, message: 'Ride cancelled' });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/rides/history ───────────────────────────────────────────────────
const getRideHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = req.user.role === 'driver'
      ? `r.driver_id = (SELECT id FROM drivers WHERE user_id = $1)`
      : `r.rider_id = $1`;

    if (status) whereClause += ` AND r.status = '${status}'`;

    const result = await query(
      `SELECT r.*, 
        u.name as rider_name, u.phone as rider_phone,
        du.name as driver_name, du.phone as driver_phone,
        d.vehicle_model, d.vehicle_plate, d.rating as driver_rating
       FROM rides r
       LEFT JOIN users u ON r.rider_id = u.id
       LEFT JOIN drivers d ON r.driver_id = d.id
       LEFT JOIN users du ON d.user_id = du.id
       WHERE ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM rides r WHERE ${whereClause}`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/rides/:id ───────────────────────────────────────────────────────
const getRideById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT r.*, 
        u.name as rider_name, u.phone as rider_phone, u.avatar as rider_avatar,
        du.name as driver_name, du.phone as driver_phone,
        d.vehicle_model, d.vehicle_plate, d.vehicle_type, d.rating as driver_rating,
        pay.amount as paid_amount, pay.status as pay_status
       FROM rides r
       LEFT JOIN users u ON r.rider_id = u.id
       LEFT JOIN drivers d ON r.driver_id = d.id
       LEFT JOIN users du ON d.user_id = du.id
       LEFT JOIN payments pay ON pay.ride_id = r.id
       WHERE r.id = $1`,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/rides/:id/receipt (PDF) ────────────────────────────────────────
const downloadReceipt = async (req, res, next) => {
  try {
    const rideResult = await query('SELECT * FROM rides WHERE id = $1 AND rider_id = $2', [req.params.id, req.user.id]);
    if (!rideResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }
    const ride = rideResult.rows[0];

    const payResult = await query('SELECT * FROM payments WHERE ride_id = $1', [ride.id]);
    if (!payResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const userResult = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const pdfBuffer = await generateReceiptPDF(ride, payResult.rows[0], userResult.rows[0]);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${ride.id.slice(0, 8)}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/rides/active ────────────────────────────────────────────────────
const getActiveRide = async (req, res, next) => {
  try {
    let whereClause = req.user.role === 'driver'
      ? `r.driver_id = (SELECT id FROM drivers WHERE user_id = $1) AND r.status NOT IN ('completed', 'cancelled')`
      : `r.rider_id = $1 AND r.status NOT IN ('completed', 'cancelled')`;

    const result = await query(
      `SELECT r.*, 
        du.name as driver_name, du.phone as driver_phone,
        d.vehicle_model, d.vehicle_plate, d.current_lat as driver_lat, d.current_lng as driver_lng
       FROM rides r
       LEFT JOIN drivers d ON r.driver_id = d.id
       LEFT JOIN users du ON d.user_id = du.id
       WHERE ${whereClause}
       ORDER BY r.created_at DESC LIMIT 1`,
      [req.user.id]
    );

    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    next(err);
  }
};

module.exports = { setIO, getEstimate, bookRide, acceptRide, startRide, completeRide, cancelRide, getRideHistory, getRideById, downloadReceipt, getActiveRide };
