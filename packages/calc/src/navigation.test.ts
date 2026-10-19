import { describe, expect, it } from "vitest";
import { bearingAndDistance, timeToMark } from "./navigation";

// Degrees, minutes, seconds to decimal degrees.
const dms = (d: number, m: number, s: number) => Math.sign(d || 1) * (Math.abs(d) + m / 60 + s / 3600);
const NM_PER_KM = 1 / 1.852;
// One degree of a great circle on the mean Earth, in nautical miles.
const ONE_DEGREE_NM = (2 * Math.PI * 6_371_008.8) / 360 / 1852;

describe("bearingAndDistance", () => {
  it("matches the published Land's End to John o' Groats example", () => {
    // Movable Type, "Calculate distance, bearing and more between Latitude/Longitude points":
    // 50°03′59″N 005°42′53″W to 58°38′38″N 003°04′12″W is 968.9 km, initial bearing 009°07′11″.
    const landsEnd = { lat: dms(50, 3, 59), lon: -dms(5, 42, 53) };
    const johnOGroats = { lat: dms(58, 38, 38), lon: -dms(3, 4, 12) };
    const { bearing, distanceNm } = bearingAndDistance(landsEnd, johnOGroats);
    expect(distanceNm).toBeCloseTo(968.9 * NM_PER_KM, 0);
    expect(Math.abs(distanceNm / NM_PER_KM - 968.9)).toBeLessThan(0.1);
    expect(bearing).toBeCloseTo(dms(9, 7, 11), 3);
  });

  it("is one degree of arc due north along a meridian, and due east along the equator", () => {
    expect(bearingAndDistance({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toEqual({
      bearing: 0,
      distanceNm: expect.closeTo(ONE_DEGREE_NM, 9),
    });
    const east = bearingAndDistance({ lat: 0, lon: 0 }, { lat: 0, lon: 1 });
    expect(east.bearing).toBeCloseTo(90, 9);
    expect(east.distanceNm).toBeCloseTo(ONE_DEGREE_NM, 9);
  });

  it("gives the reverse bearing going back along a meridian or the equator", () => {
    expect(bearingAndDistance({ lat: 1, lon: 0 }, { lat: 0, lon: 0 }).bearing).toBeCloseTo(180, 9);
    expect(bearingAndDistance({ lat: 0, lon: 1 }, { lat: 0, lon: 0 }).bearing).toBeCloseTo(270, 9);
  });

  it("goes the short way across the antimeridian", () => {
    const { bearing, distanceNm } = bearingAndDistance({ lat: 0, lon: 179.5 }, { lat: 0, lon: -179.5 });
    expect(bearing).toBeCloseTo(90, 9);
    expect(distanceNm).toBeCloseTo(ONE_DEGREE_NM, 9);
  });

  it("works at harbour scale: a mark 0.5 nm north-east", () => {
    // 0.5 nm at 045° from 41°N 71°W: each component is 0.5 / √2 nm.
    const from = { lat: 41, lon: -71 };
    const leg = 0.5 / Math.SQRT2;
    const to = { lat: 41 + leg / 60, lon: -71 + leg / 60 / Math.cos((41 * Math.PI) / 180) };
    const { bearing, distanceNm } = bearingAndDistance(from, to);
    expect(distanceNm).toBeCloseTo(0.5, 3);
    expect(bearing).toBeCloseTo(45, 1);
  });

  it("has no bearing when already at the mark", () => {
    expect(bearingAndDistance({ lat: 41.5, lon: -71.3 }, { lat: 41.5, lon: -71.3 })).toEqual({ bearing: null, distanceNm: 0 });
  });

  it("refuses positions that don't exist", () => {
    expect(() => bearingAndDistance({ lat: 91, lon: 0 }, { lat: 0, lon: 0 })).toThrow("latitude");
    expect(() => bearingAndDistance({ lat: 0, lon: 0 }, { lat: 0, lon: -180.5 })).toThrow("longitude");
    expect(() => bearingAndDistance({ lat: NaN, lon: 0 }, { lat: 0, lon: 0 })).toThrow("latitude");
  });
});

describe("timeToMark", () => {
  it("is distance over speed, with the arrival time", () => {
    expect(timeToMark(6, 4, "2026-07-04T14:00:00Z")).toEqual({ minutes: 90, eta: "2026-07-04T15:30:00Z" });
  });

  it("rounds the arrival to the second and keeps the instant whatever the zone", () => {
    expect(timeToMark(1, 7, "2026-07-04T10:00:00-04:00")).toEqual({
      minutes: expect.closeTo(8.5714, 4),
      eta: "2026-07-04T14:08:34Z",
    });
  });

  it("is zero when already there", () => {
    expect(timeToMark(0, 5, "2026-07-04T14:00:00Z")).toEqual({ minutes: 0, eta: "2026-07-04T14:00:00Z" });
  });

  it("has no answer when the boat is barely moving", () => {
    expect(timeToMark(3, 0, "2026-07-04T14:00:00Z")).toBeNull();
    expect(timeToMark(3, 0.05, "2026-07-04T14:00:00Z")).toBeNull();
    expect(timeToMark(3, 0.1, "2026-07-04T14:00:00Z")).not.toBeNull();
  });

  it("refuses nonsense", () => {
    expect(() => timeToMark(-1, 5, "2026-07-04T14:00:00Z")).toThrow("Distance");
    expect(() => timeToMark(1, -5, "2026-07-04T14:00:00Z")).toThrow("Speed");
    expect(() => timeToMark(1, 5, "2026-07-04T14:00:00")).toThrow("time zone");
  });
});
