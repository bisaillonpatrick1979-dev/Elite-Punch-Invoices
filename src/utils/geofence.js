export const DEFAULT_PUNCH_RADIUS_METERS = 25;

export function hasGpsPoint(item = {}) {
  return Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude));
}

export function distanceMeters(pointA, pointB) {
  const earthRadius = 6371000;
  const lat1 = Number(pointA.latitude) * Math.PI / 180;
  const lat2 = Number(pointB.latitude) * Math.PI / 180;
  const deltaLat = (Number(pointB.latitude) - Number(pointA.latitude)) * Math.PI / 180;
  const deltaLon = (Number(pointB.longitude) - Number(pointA.longitude)) * Math.PI / 180;
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getBrowserPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GPS non disponible sur cet appareil."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, capturedAt: new Date().toISOString() }),
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  });
}

export function checkGeofence({ target, position, radiusMeters = DEFAULT_PUNCH_RADIUS_METERS }) {
  if (!hasGpsPoint(target)) return { required: false, allowed: true, distance: null, radiusMeters };
  if (!position) return { required: true, allowed: false, distance: null, radiusMeters };
  const distance = distanceMeters(position, target);
  return { required: true, allowed: distance <= Number(radiusMeters || DEFAULT_PUNCH_RADIUS_METERS), distance, radiusMeters: Number(radiusMeters || DEFAULT_PUNCH_RADIUS_METERS) };
}
