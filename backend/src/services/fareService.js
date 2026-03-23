// ─── Fare Calculation Service ────────────────────────────────────────────────
// Uses Haversine formula for distance + time-based pricing

const PRICING = {
  sedan: { base: 40, perKm: 12, perMin: 1.5, minFare: 60 },
  suv:   { base: 60, perKm: 18, perMin: 2.0, minFare: 100 },
  auto:  { base: 25, perKm: 8,  perMin: 1.0, minFare: 40 },
  bike:  { base: 15, perKm: 5,  perMin: 0.5, minFare: 25 },
};

const SURGE_HOURS = [
  { start: 8, end: 10 },   // Morning rush
  { start: 18, end: 21 },  // Evening rush
];

// Haversine formula: returns distance in KM
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius KM
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

// Estimate duration in minutes (avg speed 25 km/h in city)
function estimateDuration(distanceKm) {
  const avgSpeedKmh = 25;
  return Math.ceil((distanceKm / avgSpeedKmh) * 60);
}

// Check if current time is surge hour
function isSurgeHour() {
  const hour = new Date().getHours();
  return SURGE_HOURS.some((h) => hour >= h.start && hour < h.end);
}

function calculateFare(pickupLat, pickupLng, dropoffLat, dropoffLng, vehicleType = 'sedan') {
  const pricing = PRICING[vehicleType] || PRICING.sedan;
  const distanceKm = haversineDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
  const durationMin = estimateDuration(distanceKm);

  let fare = pricing.base + pricing.perKm * distanceKm + pricing.perMin * durationMin;

  // Apply surge pricing (1.5x during rush hours)
  if (isSurgeHour()) {
    fare *= 1.5;
  }

  // Apply minimum fare
  fare = Math.max(fare, pricing.minFare);

  return {
    distanceKm: parseFloat(distanceKm.toFixed(2)),
    durationMinutes: durationMin,
    estimatedFare: parseFloat(fare.toFixed(2)),
    breakdown: {
      baseFare: pricing.base,
      distanceFare: parseFloat((pricing.perKm * distanceKm).toFixed(2)),
      timeFare: parseFloat((pricing.perMin * durationMin).toFixed(2)),
      surgeFactor: isSurgeHour() ? 1.5 : 1.0,
    },
    vehicleType,
    currency: 'INR',
  };
}

// Get fare estimates for all vehicle types
function getAllFareEstimates(pickupLat, pickupLng, dropoffLat, dropoffLng) {
  return Object.keys(PRICING).map((vType) =>
    calculateFare(pickupLat, pickupLng, dropoffLat, dropoffLng, vType)
  );
}

module.exports = { calculateFare, getAllFareEstimates, haversineDistance };
