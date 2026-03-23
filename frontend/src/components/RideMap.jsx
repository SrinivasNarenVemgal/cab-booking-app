import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom marker icons
const makeIcon = (color, emoji) =>
  L.divIcon({
    html: `<div style="background:${color};width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${emoji}</div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

const pickupIcon = makeIcon('#22c55e', '📍');
const dropoffIcon = makeIcon('#ef4444', '🏁');
const driverIcon = makeIcon('#f59e0b', '🚖');

// Auto-fit bounds when markers change
function BoundsFitter({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(positions, { padding: [40, 40] });
    } else if (positions.length === 1) {
      map.setView(positions[0], 14);
    }
  }, [positions, map]);
  return null;
}

const RideMap = ({
  pickup,     // { lat, lng, address }
  dropoff,    // { lat, lng, address }
  driverPos,  // { lat, lng }
  height = '400px',
  className = '',
}) => {
  const defaultCenter = [17.385, 78.4867]; // Hyderabad

  const positions = [
    pickup   && [pickup.lat,   pickup.lng],
    dropoff  && [dropoff.lat,  dropoff.lng],
    driverPos && [driverPos.lat, driverPos.lng],
  ].filter(Boolean);

  const center = positions.length ? positions[0] : defaultCenter;

  const routePositions = [
    pickup   && [pickup.lat,   pickup.lng],
    dropoff  && [dropoff.lat,  dropoff.lng],
  ].filter(Boolean);

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height, width: '100%' }}
      className={`rounded-2xl ${className}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {pickup && (
        <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
          <Popup>📍 Pickup: {pickup.address}</Popup>
        </Marker>
      )}

      {dropoff && (
        <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon}>
          <Popup>🏁 Drop: {dropoff.address}</Popup>
        </Marker>
      )}

      {driverPos && (
        <Marker position={[driverPos.lat, driverPos.lng]} icon={driverIcon}>
          <Popup>🚖 Driver is here</Popup>
        </Marker>
      )}

      {routePositions.length === 2 && (
        <Polyline
          positions={routePositions}
          color="#f59e0b"
          weight={4}
          dashArray="10 6"
          opacity={0.8}
        />
      )}

      {positions.length > 0 && <BoundsFitter positions={positions} />}
    </MapContainer>
  );
};

export default RideMap;
