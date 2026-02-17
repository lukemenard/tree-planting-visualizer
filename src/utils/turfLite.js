/**
 * Lightweight turf-like utilities to avoid importing the full turf library.
 * Only includes what we need: destination point calculation.
 */

const EARTH_RADIUS_KM = 6371;

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad) {
  return (rad * 180) / Math.PI;
}

/**
 * Calculate a destination point given a start point, distance, and bearing.
 * @param {[number, number]} from - [lng, lat]
 * @param {number} distanceKm - distance in kilometers
 * @param {number} bearingDeg - bearing in degrees (0 = north, 90 = east)
 * @returns {[number, number]} [lng, lat] of destination
 */
export function destination(from, distanceKm, bearingDeg) {
  const lat1 = toRadians(from[1]);
  const lng1 = toRadians(from[0]);
  const bearing = toRadians(bearingDeg);
  const angularDist = distanceKm / EARTH_RADIUS_KM;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDist) +
    Math.cos(lat1) * Math.sin(angularDist) * Math.cos(bearing)
  );

  const lng2 = lng1 + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDist) * Math.cos(lat1),
    Math.cos(angularDist) - Math.sin(lat1) * Math.sin(lat2)
  );

  return [toDegrees(lng2), toDegrees(lat2)];
}
