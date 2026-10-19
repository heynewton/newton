/**
 * Course to steer: the heading that keeps the boat on its track to a mark, corrected for the
 * tidal stream and for leeway, by the vector triangle navigators draw on the chart. Angles are
 * degrees true; speeds are knots. The track usually comes from bearingAndDistance.
 */

export interface TidalStream {
  /** The direction the stream flows toward, degrees true. */
  set: number;
  /** Its rate, knots. */
  drift: number;
}

export interface Leeway {
  /** How far the wind pushes the boat off its heading, degrees. Set by the owner per point of sail at first. */
  degrees: number;
  /** The side the wind comes from. Wind on the starboard side pushes the boat to port, and the other way round. */
  windOn: "port" | "starboard";
}

export interface CourseToSteerInput {
  /** The track to make good over the ground, degrees true. */
  track: number;
  /** Speed through the water, knots. */
  boatSpeed: number;
  tide?: TidalStream;
  leeway?: Leeway;
}

export type CourseToSteer =
  | {
      ok: true;
      /** The heading to steer, degrees true, 0 to 360. */
      heading: number;
      /** Expected speed over the ground along the track, knots. */
      speedOverGround: number;
      /** Degrees added for the stream (negative: steer to port of the track). */
      tideCorrection: number;
      /** Degrees added for leeway (into the wind). */
      leewayCorrection: number;
    }
  /** The stream across the track is faster than the boat, or the stream against it is: the track can't be held. */
  | { ok: false; reason: "stream_too_strong" };

const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const normalize = (angle: number) => ((angle % 360) + 360) % 360;
// An angle difference in (-180, 180].
const signed = (angle: number) => {
  const a = normalize(angle);
  return a > 180 ? a - 360 : a;
};

function checkAngle(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0 || value >= 360) throw new Error(`${name} must be 0 to less than 360 degrees: ${value}`);
}

export function courseToSteer({ track, boatSpeed, tide, leeway }: CourseToSteerInput): CourseToSteer {
  checkAngle(track, "Track");
  if (!Number.isFinite(boatSpeed) || boatSpeed <= 0) throw new Error(`Boat speed must be more than 0: ${boatSpeed}`);
  if (tide) {
    checkAngle(tide.set, "Set");
    if (!Number.isFinite(tide.drift) || tide.drift < 0) throw new Error(`Drift must be 0 or more: ${tide.drift}`);
  }
  if (leeway && (!Number.isFinite(leeway.degrees) || leeway.degrees < 0 || leeway.degrees > 45)) {
    throw new Error(`Leeway must be 0 to 45 degrees: ${leeway.degrees}`);
  }

  // Split the stream into its parts across and along the track (across: positive to starboard).
  const offTrack = rad(signed((tide?.set ?? track) - track));
  const drift = tide?.drift ?? 0;
  const across = drift * Math.sin(offTrack);
  const along = drift * Math.cos(offTrack);
  if (Math.abs(across) > boatSpeed) return { ok: false, reason: "stream_too_strong" };

  // Point the boat's water track upstream just enough to cancel the cross-track stream.
  const angle = Math.asin(across / boatSpeed);
  const speedOverGround = boatSpeed * Math.cos(angle) + along;
  if (speedOverGround <= 0) return { ok: false, reason: "stream_too_strong" };
  const tideCorrection = angle === 0 ? 0 : -deg(angle);

  // Leeway sets the boat downwind of its heading, so steer that much into the wind.
  const leewayCorrection = leeway ? (leeway.windOn === "starboard" ? leeway.degrees : -leeway.degrees) : 0;

  return {
    ok: true,
    heading: normalize(track + tideCorrection + leewayCorrection),
    speedOverGround,
    tideCorrection,
    leewayCorrection,
  };
}
