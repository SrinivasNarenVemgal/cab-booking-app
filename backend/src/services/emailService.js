const nodemailer = require('nodemailer');
const logger = require('../config/logger');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'CabApp <no-reply@cabapp.com>',
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error(`Email failed to ${to}: ${err.message}`);
    // Don't throw — email failure shouldn't break the app flow
  }
};

// ─── Email Templates ─────────────────────────────────────────────────────────

const sendWelcomeEmail = (user) =>
  sendEmail({
    to: user.email,
    subject: '🚖 Welcome to CabApp!',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;background:#f9f9f9;border-radius:10px;">
        <h2 style="color:#f59e0b;">🚖 Welcome to CabApp, ${user.name}!</h2>
        <p>Your account has been created successfully.</p>
        <p>Start booking rides in seconds — safe, fast, and affordable.</p>
        <a href="${process.env.FRONTEND_URL}/login" style="background:#f59e0b;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">Start Riding</a>
        <p style="color:#888;margin-top:24px;font-size:12px;">If you didn't create this account, please ignore this email.</p>
      </div>
    `,
  });

const sendRideConfirmationEmail = (user, ride) =>
  sendEmail({
    to: user.email,
    subject: `🚗 Ride Confirmed — OTP: ${ride.otp}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;background:#f9f9f9;border-radius:10px;">
        <h2 style="color:#f59e0b;">Ride Confirmed!</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px;color:#555;">📍 Pickup</td><td style="padding:8px;font-weight:bold;">${ride.pickup_address}</td></tr>
          <tr><td style="padding:8px;color:#555;">🏁 Drop</td><td style="padding:8px;font-weight:bold;">${ride.dropoff_address}</td></tr>
          <tr><td style="padding:8px;color:#555;">💰 Estimated Fare</td><td style="padding:8px;font-weight:bold;">₹${ride.estimated_fare}</td></tr>
          <tr><td style="padding:8px;color:#555;">🔑 OTP</td><td style="padding:8px;font-size:24px;font-weight:bold;color:#f59e0b;">${ride.otp}</td></tr>
        </table>
        <p style="color:#555;margin-top:16px;">Share OTP with your driver to start the ride.</p>
      </div>
    `,
  });

const sendRideReceiptEmail = (user, ride, payment) =>
  sendEmail({
    to: user.email,
    subject: `🧾 Ride Receipt — ₹${payment.amount}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;background:#f9f9f9;border-radius:10px;">
        <h2 style="color:#f59e0b;">🧾 Your Receipt</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px;color:#555;">Ride ID</td><td style="padding:8px;">${ride.id}</td></tr>
          <tr><td style="padding:8px;color:#555;">From</td><td style="padding:8px;">${ride.pickup_address}</td></tr>
          <tr><td style="padding:8px;color:#555;">To</td><td style="padding:8px;">${ride.dropoff_address}</td></tr>
          <tr><td style="padding:8px;color:#555;">Distance</td><td style="padding:8px;">${ride.distance_km} km</td></tr>
          <tr><td style="padding:8px;color:#555;">Duration</td><td style="padding:8px;">${ride.duration_minutes} mins</td></tr>
          <tr style="background:#fff3cd;"><td style="padding:8px;font-weight:bold;">Total Paid</td><td style="padding:8px;font-weight:bold;color:#f59e0b;">₹${payment.amount}</td></tr>
        </table>
        <p style="color:#555;margin-top:16px;">Thank you for riding with CabApp! 🚖</p>
      </div>
    `,
  });

module.exports = { sendWelcomeEmail, sendRideConfirmationEmail, sendRideReceiptEmail, sendEmail };
