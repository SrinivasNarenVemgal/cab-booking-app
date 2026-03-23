const { query } = require('../config/db');

// ─── GET /api/drivers/me ──────────────────────────────────────────────────────
const getMyProfile = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT d.*, u.name, u.email, u.phone, u.avatar FROM drivers d
       JOIN users u ON d.user_id = u.id WHERE d.user_id = $1`,
      [req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Driver profile not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

// ─── PATCH /api/drivers/availability ─────────────────────────────────────────
const toggleAvailability = async (req, res, next) => {
  try {
    const { is_available } = req.body;
    const result = await query(
      'UPDATE drivers SET is_available = $1 WHERE user_id = $2 RETURNING id, is_available',
      [is_available, req.user.id]
    );
    res.json({ success: true, message: `You are now ${is_available ? 'online' : 'offline'}`, data: result.rows[0] });
  } catch (err) { next(err); }
};

// ─── PATCH /api/drivers/location ─────────────────────────────────────────────
const updateLocation = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    await query(
      'UPDATE drivers SET current_lat = $1, current_lng = $2 WHERE user_id = $3',
      [lat, lng, req.user.id]
    );
    res.json({ success: true, message: 'Location updated' });
  } catch (err) { next(err); }
};

// ─── GET /api/drivers/earnings ────────────────────────────────────────────────
const getEarnings = async (req, res, next) => {
  try {
    const { period = 'week' } = req.query;
    const intervals = { today: '1 day', week: '7 days', month: '30 days' };
    const interval = intervals[period] || '7 days';

    const dResult = await query('SELECT id FROM drivers WHERE user_id = $1', [req.user.id]);
    if (!dResult.rows.length) return res.status(404).json({ success: false, message: 'Driver not found' });
    const driverId = dResult.rows[0].id;

    const result = await query(
      `SELECT 
        COALESCE(SUM(amount), 0) as total_earnings,
        COUNT(*) as total_rides,
        COALESCE(AVG(amount), 0) as avg_per_ride,
        DATE_TRUNC('day', created_at) as date,
        SUM(amount) as daily_earnings
       FROM payments
       WHERE driver_id = $1 AND created_at >= NOW() - INTERVAL '${interval}' AND status = 'completed'
       GROUP BY DATE_TRUNC('day', created_at)
       ORDER BY date DESC`,
      [driverId]
    );

    const summary = await query(
      `SELECT 
        COALESCE(SUM(amount), 0) as total,
        COUNT(*) as count
       FROM payments WHERE driver_id = $1 AND status = 'completed'
         AND created_at >= NOW() - INTERVAL '${interval}'`,
      [driverId]
    );

    res.json({
      success: true,
      data: {
        period,
        summary: {
          totalEarnings: parseFloat(summary.rows[0].total),
          totalRides: parseInt(summary.rows[0].count),
        },
        dailyBreakdown: result.rows,
      },
    });
  } catch (err) { next(err); }
};

// ─── GET /api/drivers/pending-rides ──────────────────────────────────────────
const getPendingRides = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT r.*, u.name as rider_name, u.phone as rider_phone, u.avatar as rider_avatar
       FROM rides r
       JOIN users u ON r.rider_id = u.id
       WHERE r.status = 'requested' AND r.driver_id IS NULL
       ORDER BY r.created_at ASC`,
      []
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

// ─── GET /api/drivers/:id (public) ───────────────────────────────────────────
const getDriverPublic = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT d.id, d.vehicle_model, d.vehicle_plate, d.vehicle_type, d.rating, d.total_rides,
        u.name, u.avatar FROM drivers d JOIN users u ON d.user_id = u.id WHERE d.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Driver not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

module.exports = { getMyProfile, toggleAvailability, updateLocation, getEarnings, getPendingRides, getDriverPublic };
