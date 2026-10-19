/**
 * Bearing, distance and time to a mark from the boat's position (phone GPS in Phase 2). Great
 * circle on a spherical Earth, which over the distances a sailing boat covers in a day is within
 * a fraction of a percent of the ellipsoid: well under GPS and chart error.
 */

export interface Position {
  /** Decimal degrees, north positive. */
  lat: number;
  /** Decimal degrees, east positive. */
  lon: number;
}

/** Mean Earth radius (IUGG), in metres. */
const EARTH_RADIUS_M = 6_371_008.8;
const METRES_PER_NM = 1852;

const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

function checkPosition(p: Position, name: string): void {
  if (!Number.isFinite(p.lat) || p.lat < -90 || p.lat > 90) throw new Error(`${name}: latitude must be -90 to 90: ${p.lat}`);
  if (!Number.isFinite(p.lon) || p.lon < -180 || p.lon > 180) throw new Error(`${name}: longitude must be -180 to 180: ${p.lon}`);
}

export interface BearingAndDistance {
  /** Initial great-circle bearing in degrees true, 0 to 360. Null when the two positions are the same. */
  bearing: number | null;
  /** Nautical miles. */
  distanceNm: number;
}

/** The initial bearing (degrees true) and distance (nautical miles) from one position to another. */
export function bearingAndDistance(from: Position, to: Position): BearingAndDistance {
  checkPosition(from, "from");
  checkPosition(to, "to");
  const φ1 = rad(from.lat);
  const φ2 = rad(to.lat);
  const Δφ = φ2 - φ1;
  const Δλ = rad(to.lon - from.lon);

  // Haversine: well behaved for short distances, where the spherical law of cosines isn't.
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const distanceM = 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  if (distanceM === 0) return { bearing: null, distanceNm: 0 };

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const bearing = (deg(Math.atan2(y, x)) + 360) % 360;
  return { bearing, distanceNm: distanceM / METRES_PER_NM };
}

/** Below this speed over ground, the boat is treated as stopped and there is no ETA. */
export const MIN_SPEED_KNOTS = 0.1;

export interface TimeToMark {
  minutes: number;
  /** ISO 8601 instant, to the second. */
  eta: string;
}

/**
 * Time en route and arrival time at the current speed over ground, or null when the boat is
 * barely moving (there is no honest ETA then, and "infinity" isn't one).
 */
export function timeToMark(distanceNm: number, speedKnots: number, now: string): TimeToMark | null {
  if (!Number.isFinite(distanceNm) || distanceNm < 0) throw new Error(`Distance must be 0 or more: ${distanceNm}`);
  if (!Number.isFinite(speedKnots) || speedKnots < 0) throw new Error(`Speed must be 0 or more: ${speedKnots}`);
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(now) || Number.isNaN(Date.parse(now))) {
    throw new Error(`Not an ISO instant with a time zone: "${now}"`);
  }
  if (speedKnots < MIN_SPEED_KNOTS) return null;
  const minutes = (distanceNm / speedKnots) * 60;
  const eta = new Date(Math.round((Date.parse(now) + minutes * 60_000) / 1000) * 1000);
  return { minutes, eta: eta.toISOString().replace(".000Z", "Z") };
}
