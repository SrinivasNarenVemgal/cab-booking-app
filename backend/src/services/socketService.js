const logger = require('../config/logger');

// Map: userId -> socketId
const userSockets = new Map();
// Map: driverId -> { socketId, lat, lng }
const driverLocations = new Map();

function initSocket(io) {
  io.on('connection', (socket) => {
    logger.info(`🔌 Socket connected: ${socket.id}`);

    // ── Register user/driver ─────────────────────────────────────────────
    socket.on('register', ({ userId, role }) => {
      userSockets.set(userId, socket.id);
      socket.userId = userId;
      socket.role = role;
      logger.info(`👤 Registered ${role}: ${userId}`);

      if (role === 'driver') {
        socket.join('drivers');
      }
    });

    // ── Driver location update ───────────────────────────────────────────
    socket.on('driver:location', ({ driverId, lat, lng, rideId }) => {
      driverLocations.set(driverId, { lat, lng, socketId: socket.id });

      // Broadcast to rider if in a ride
      if (rideId) {
        socket.to(`ride:${rideId}`).emit('driver:location:update', { lat, lng, driverId });
      }
    });

    // ── Join a ride room ─────────────────────────────────────────────────
    socket.on('join:ride', ({ rideId }) => {
      socket.join(`ride:${rideId}`);
      logger.info(`🚗 Socket ${socket.id} joined ride room: ${rideId}`);
    });

    // ── Leave ride room ──────────────────────────────────────────────────
    socket.on('leave:ride', ({ rideId }) => {
      socket.leave(`ride:${rideId}`);
    });

    // ── SOS alert ────────────────────────────────────────────────────────
    socket.on('sos:alert', ({ rideId, userId, lat, lng }) => {
      logger.warn(`🆘 SOS from ${userId} on ride ${rideId}`);
      io.to('admins').emit('sos:alert', { rideId, userId, lat, lng, time: new Date() });
    });

    // ── Chat message in ride ─────────────────────────────────────────────
    socket.on('chat:message', ({ rideId, senderId, message }) => {
      socket.to(`ride:${rideId}`).emit('chat:message', {
        senderId,
        message,
        time: new Date().toISOString(),
      });
    });

    // ── Disconnect ───────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      if (socket.userId) {
        userSockets.delete(socket.userId);
        driverLocations.delete(socket.userId);
        logger.info(`🔴 Disconnected: ${socket.userId}`);
      }
    });
  });
}

// ── Emit helpers ──────────────────────────────────────────────────────────────

function emitToUser(io, userId, event, data) {
  const socketId = userSockets.get(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
    return true;
  }
  return false;
}

function emitToRide(io, rideId, event, data) {
  io.to(`ride:${rideId}`).emit(event, data);
}

function emitToAllDrivers(io, event, data) {
  io.to('drivers').emit(event, data);
}

function getDriverLocation(driverId) {
  return driverLocations.get(driverId) || null;
}

function getOnlineUsers() {
  return [...userSockets.keys()];
}

module.exports = {
  initSocket,
  emitToUser,
  emitToRide,
  emitToAllDrivers,
  getDriverLocation,
  getOnlineUsers,
};
