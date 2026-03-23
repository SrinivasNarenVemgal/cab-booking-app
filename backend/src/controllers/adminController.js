const { query } = require('../config/db');

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
const getDashboardStats = async (req, res, next) => {
  try {
    const [users, rides, payments, drivers] = await Promise.all([
      query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE role='rider') as riders, COUNT(*) FILTER (WHERE role='driver') as drivers FROM users`),
      query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='completed') as completed, COUNT(*) FILTER (WHERE status='cancelled') as cancelled, COUNT(*) FILTER (WHERE status IN ('requested','accepted','in_progress')) as active FROM rides`),
      query(`SELECT COALESCE(SUM(amount),0) as total_revenue, COUNT(*) as total_payments FROM payments WHERE status='completed'`),
      query(`SELECT COUNT(*) FILTER (WHERE is_available=true) as online FROM drivers`),
    ]);

    res.json({
      success: true,
      data: {
        users: users.rows[0],
        rides: rides.rows[0],
        payments: payments.rows[0],
        driversOnline: parseInt(drivers.rows[0].online),
      },
    });
  } catch (err) { next(err); }
};

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params = [];

    if (role) { params.push(role); where += ` AND role = $${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length})`; }

    params.push(limit, offset);
    const result = await query(
      `SELECT id, name, email, phone, role, is_active, is_verified, created_at FROM users ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

// ─── PATCH /api/admin/users/:id/suspend ──────────────────────────────────────
const suspendUser = async (req, res, next) => {
  try {
    const { is_active } = req.body;
    await query('UPDATE users SET is_active = $1 WHERE id = $2', [is_active, req.params.id]);
    res.json({ success: true, message: `User ${is_active ? 'activated' : 'suspended'}` });
  } catch (err) { next(err); }
};

// ─── GET /api/admin/rides ─────────────────────────────────────────────────────
const getAllRides = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;
    const where = status ? `WHERE r.status = '${status}'` : '';

    const result = await query(
      `SELECT r.*, u.name as rider_name, du.name as driver_name
       FROM rides r
       LEFT JOIN users u ON r.rider_id = u.id
       LEFT JOIN drivers d ON r.driver_id = d.id
       LEFT JOIN users du ON d.user_id = du.id
       ${where}
       ORDER BY r.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

// ─── GET /api/admin/revenue ───────────────────────────────────────────────────
const getRevenuReport = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT DATE_TRUNC('day', created_at) as date, SUM(amount) as revenue, COUNT(*) as transactions
       FROM payments WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE_TRUNC('day', created_at)
       ORDER BY date ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

// ─── GET /api/admin/support-tickets ──────────────────────────────────────────
const getSupportTickets = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT t.*, u.name as user_name, u.email FROM support_tickets t
       JOIN users u ON t.user_id = u.id ORDER BY t.created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

// ─── PATCH /api/admin/support-tickets/:id ────────────────────────────────────
const replyTicket = async (req, res, next) => {
  try {
    const { admin_reply, status } = req.body;
    await query(
      'UPDATE support_tickets SET admin_reply = $1, status = $2 WHERE id = $3',
      [admin_reply, status || 'resolved', req.params.id]
    );
    res.json({ success: true, message: 'Ticket updated' });
  } catch (err) { next(err); }
};

module.exports = { getDashboardStats, getAllUsers, suspendUser, getAllRides, getRevenuReport, getSupportTickets, replyTicket };
