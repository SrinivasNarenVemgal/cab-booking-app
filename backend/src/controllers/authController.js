const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { sendWelcomeEmail } = require('../services/emailService');

// ─── Generate Tokens ─────────────────────────────────────────────────────────
const generateTokens = (userId, role) => {
  const accessToken = jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
  return { accessToken, refreshToken };
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role = 'rider' } = req.body;

    // Validate role
    if (!['rider', 'driver'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // Check existing user
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const result = await query(
      `INSERT INTO users (name, email, password, phone, role, is_active, is_verified)
       VALUES ($1, $2, $3, $4, $5, true, false)
       RETURNING id, name, email, phone, role, created_at`,
      [name, email, hashedPassword, phone, role]
    );

    const user = result.rows[0];

    // If driver, create driver profile
    if (role === 'driver') {
      const { vehicle_model, vehicle_plate, vehicle_type, license_number } = req.body;
      if (!vehicle_model || !vehicle_plate || !license_number) {
        return res.status(400).json({ success: false, message: 'Driver details required' });
      }
      await query(
        `INSERT INTO drivers (user_id, vehicle_model, vehicle_plate, vehicle_type, license_number)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, vehicle_model, vehicle_plate, vehicle_type || 'sedan', license_number]
      );
    }

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.role);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user, accessToken, refreshToken },
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await query(
      'SELECT id, name, email, password, phone, role, is_active FROM users WHERE email = $1',
      [email]
    );

    if (!result.rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account suspended. Contact support.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.role);
    delete user.password;

    // Attach driver info if driver
    let driverInfo = null;
    if (user.role === 'driver') {
      const dResult = await query('SELECT * FROM drivers WHERE user_id = $1', [user.id]);
      driverInfo = dResult.rows[0] || null;
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: { user, driverInfo, accessToken, refreshToken },
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Refresh token required' });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const result = await query('SELECT id, role, is_active FROM users WHERE id = $1', [decoded.userId]);

    if (!result.rows.length || !result.rows[0].is_active) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const user = result.rows[0];
    const { accessToken, refreshToken: newRefresh } = generateTokens(user.id, user.role);

    res.json({ success: true, data: { accessToken, refreshToken: newRefresh } });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Refresh token expired, please login again' });
    }
    next(err);
  }
};

// ─── GET /api/auth/profile ────────────────────────────────────────────────────
const getProfile = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, name, email, phone, role, avatar, is_active, is_verified, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = result.rows[0];

    let driverInfo = null;
    if (user.role === 'driver') {
      const d = await query('SELECT * FROM drivers WHERE user_id = $1', [user.id]);
      driverInfo = d.rows[0] || null;
    }

    res.json({ success: true, data: { user, driverInfo } });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/auth/profile ──────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const result = await query(
      'UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone) WHERE id = $3 RETURNING id, name, email, phone, role',
      [name, phone, req.user.id]
    );
    res.json({ success: true, message: 'Profile updated', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/change-password ──────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const result = await query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password);

    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.id]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refreshToken, getProfile, updateProfile, changePassword };
