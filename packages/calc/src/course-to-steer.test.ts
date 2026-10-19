import { describe, expect, it } from "vitest";
import { courseToSteer, type CourseToSteerInput, type Leeway } from "./course-to-steer";

const rad = (d: number) => (d * Math.PI) / 180;

// Where the boat actually goes over the ground: its heading, less leeway, plus the stream. The
// independent check that a course to steer really makes good the track.
function groundTrack(heading: number, input: CourseToSteerInput): { direction: number; speed: number } {
  const leeway = input.leeway ? (input.leeway.windOn === "starboard" ? -input.leeway.degrees : input.leeway.degrees) : 0;
  const water = rad(heading + leeway);
  let east = input.boatSpeed * Math.sin(water);
  let north = input.boatSpeed * Math.cos(water);
  if (input.tide) {
    east += input.tide.drift * Math.sin(rad(input.tide.set));
    north += input.tide.drift * Math.cos(rad(input.tide.set));
  }
  return { direction: ((Math.atan2(east, north) * 180) / Math.PI + 360) % 360, speed: Math.hypot(east, north) };
}

function expectOk(input: CourseToSteerInput) {
  const result = courseToSteer(input);
  if (!result.ok) throw new Error(`expected a course, got ${result.reason}`);
  return result;
}

describe("courseToSteer", () => {
  it("is the track itself with no stream and no leeway", () => {
    expect(courseToSteer({ track: 37, boatSpeed: 5 })).toEqual({
      ok: true,
      heading: 37,
      speedOverGround: 5,
      tideCorrection: 0,
      leewayCorrection: 0,
    });
  });

  it("only changes the speed when the stream runs along the track", () => {
    expect(expectOk({ track: 90, boatSpeed: 5, tide: { set: 90, drift: 1.5 } })).toMatchObject({ heading: 90, speedOverGround: 6.5 });
    expect(expectOk({ track: 90, boatSpeed: 5, tide: { set: 270, drift: 1.5 } }).speedOverGround).toBeCloseTo(3.5, 10);
  });

  it("works the textbook example: track 090°, 5 kn, stream setting 180° at 2 kn", () => {
    // sin(angle) = 2 / 5, so steer 23.6° up-stream (to port, toward the north): 066.4°.
    // Speed over the ground: 5 cos 23.6° = 4.58 kn.
    const result = expectOk({ track: 90, boatSpeed: 5, tide: { set: 180, drift: 2 } });
    expect(result.heading).toBeCloseTo(66.42, 2);
    expect(result.tideCorrection).toBeCloseTo(-23.58, 2);
    expect(result.speedOverGround).toBeCloseTo(4.583, 3);
  });

  it("steers to starboard for a stream setting to port", () => {
    expect(expectOk({ track: 0, boatSpeed: 6, tide: { set: 270, drift: 1 } }).heading).toBeCloseTo(9.59, 2);
  });

  it("steers into the wind by the leeway", () => {
    const starboard: Leeway = { degrees: 5, windOn: "starboard" };
    const port: Leeway = { degrees: 5, windOn: "port" };
    expect(expectOk({ track: 90, boatSpeed: 5, leeway: starboard }).heading).toBe(95);
    expect(expectOk({ track: 90, boatSpeed: 5, leeway: port }).heading).toBe(85);
    expect(expectOk({ track: 2, boatSpeed: 5, leeway: port }).heading).toBe(357);
  });

  it.each([
    { track: 90, boatSpeed: 5, tide: { set: 180, drift: 2 } },
    { track: 225, boatSpeed: 4.2, tide: { set: 300, drift: 1.8 }, leeway: { degrees: 6, windOn: "port" as const } },
    { track: 350, boatSpeed: 6.5, tide: { set: 45, drift: 2.4 }, leeway: { degrees: 4, windOn: "starboard" as const } },
    { track: 10, boatSpeed: 3, tide: { set: 190, drift: 1 } },
  ])("makes good the track over the ground: %o", (input) => {
    const result = expectOk(input);
    const ground = groundTrack(result.heading, input);
    expect(Math.abs(((ground.direction - input.track + 540) % 360) - 180)).toBeLessThan(1e-9);
    expect(ground.speed).toBeCloseTo(result.speedOverGround, 9);
  });

  it("says the track can't be held when the stream is too strong", () => {
    expect(courseToSteer({ track: 90, boatSpeed: 3, tide: { set: 180, drift: 3.5 } })).toEqual({ ok: false, reason: "stream_too_strong" });
    expect(courseToSteer({ track: 90, boatSpeed: 3, tide: { set: 270, drift: 3 } })).toEqual({ ok: false, reason: "stream_too_strong" });
    expect(courseToSteer({ track: 90, boatSpeed: 3, tide: { set: 240, drift: 4 } })).toEqual({ ok: false, reason: "stream_too_strong" });
  });

  it("refuses nonsense", () => {
    expect(() => courseToSteer({ track: 360, boatSpeed: 5 })).toThrow("Track");
    expect(() => courseToSteer({ track: 90, boatSpeed: 0 })).toThrow("Boat speed");
    expect(() => courseToSteer({ track: 90, boatSpeed: 5, tide: { set: -1, drift: 1 } })).toThrow("Set");
    expect(() => courseToSteer({ track: 90, boatSpeed: 5, tide: { set: 10, drift: -1 } })).toThrow("Drift");
    expect(() => courseToSteer({ track: 90, boatSpeed: 5, leeway: { degrees: 50, windOn: "port" } })).toThrow("Leeway");
  });
});
