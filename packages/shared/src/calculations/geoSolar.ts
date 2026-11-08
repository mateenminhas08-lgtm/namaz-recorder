/**
 * Calculates approximate solar sunset for a given latitude, longitude and date.
 * Based on NOAA Solar Calculator equations.
 * Returns Date object of sunset on that day.
 */
export function calculateSunset(date: Date, latitude: number, longitude: number): Date {
  const startOfYear = new Date(Date.UTC(date.getFullYear(), 0, 1));
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)) + 1;

  // Fractional year in radians
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1 + (date.getUTCHours() - 12) / 24);

  // Equation of time in minutes
  const eqtime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));

  // Solar declination angle in radians
  const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);

  const latRad = latitude * Math.PI / 180;
  // Standard zenith for sunset: 90.8333 degrees (accounting for atmospheric refraction)
  const zenithRad = 90.8333 * Math.PI / 180;

  const cosHourAngle = (Math.cos(zenithRad) / (Math.cos(latRad) * Math.cos(decl))) - (Math.tan(latRad) * Math.tan(decl));

  // If sun never sets or rises (polar extremes)
  if (cosHourAngle > 1) {
    const fallback = new Date(date);
    fallback.setHours(18, 0, 0, 0);
    return fallback;
  }
  if (cosHourAngle < -1) {
    const fallback = new Date(date);
    fallback.setHours(20, 0, 0, 0);
    return fallback;
  }

  const hourAngleRad = Math.acos(cosHourAngle);
  const hourAngleDeg = hourAngleRad * 180 / Math.PI;

  // Sunset time in UTC minutes from midnight
  const sunsetUtcMinutes = 720 + 4 * (-longitude + hourAngleDeg) - eqtime;

  const sunsetDate = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0,
    0,
    0,
    0
  ));
  sunsetDate.setUTCMinutes(Math.round(sunsetUtcMinutes));
  return sunsetDate;
}

/**
 * Calculates exact distance in meters between two GPS coordinates using Haversine formula.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Determines whether user GPS is within the Masjid zone radius.
 */
export function isInsideMasjidZone(
  userLat: number,
  userLon: number,
  masjidLat: number,
  masjidLon: number,
  radiusMeters: number
): boolean {
  const distance = calculateHaversineDistanceMeters(userLat, userLon, masjidLat, masjidLon);
  return distance <= radiusMeters;
}
