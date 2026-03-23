const { query } = require('../config/db');

// ─── POST /api/ratings ────────────────────────────────────────────────────────
const submitRating = async (req, res, next) => {
  try {
    const { ride_id, driver_rating, rider_rating, rider_comment, driver_comment } = req.body;

    // Verify ride is completed
    const rideResult = await query(
      'SELECT * FROM rides WHERE id = $1 AND status = $2',
      [ride_id, 'completed']
    );

    if (!rideResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Completed ride not found' });
    }

    const ride = rideResult.rows[0];

    // Check if already rated
    const existingRating = await query('SELECT id FROM ratings WHERE ride_id = $1', [ride_id]);
    if (existingRating.rows.length) {
      return res.status(409).json({ success: false, message: 'Ride already rated' });
    }

    // Insert rating
    const result = await query(
      `INSERT INTO ratings (ride_id, rider_id, driver_id, rider_rating, driver_rating, rider_comment, driver_comment)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [ride_id, ride.rider_id, ride.driver_id, rider_rating, driver_rating, rider_comment, driver_comment]
    );

    // Update driver's average rating
    if (driver_rating && ride.driver_id) {
      await query(
        `UPDATE drivers SET rating = (
          SELECT COALESCE(AVG(driver_rating::DECIMAL), 0) FROM ratings WHERE driver_id = $1 AND driver_rating IS NOT NULL
        ) WHERE id = $1`,
        [ride.driver_id]
      );
    }

    res.status(201).json({ success: true, message: 'Rating submitted', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/ratings/driver/:driverId ───────────────────────────────────────
const getDriverRatings = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT r.*, u.name as rider_name, u.avatar as rider_avatar
       FROM ratings r
       JOIN users u ON r.rider_id = u.id
       WHERE r.driver_id = $1 AND r.driver_rating IS NOT NULL
       ORDER BY r.created_at DESC
       LIMIT 20`,
      [req.params.driverId]
    );

    const avgResult = await query(
      'SELECT AVG(driver_rating)::DECIMAL(3,2) as avg_rating, COUNT(*) as total FROM ratings WHERE driver_id = $1',
      [req.params.driverId]
    );

    res.json({
      success: true,
      data: {
        ratings: result.rows,
        average: parseFloat(avgResult.rows[0].avg_rating) || 0,
        total: parseInt(avgResult.rows[0].total),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { submitRating, getDriverRatings };
