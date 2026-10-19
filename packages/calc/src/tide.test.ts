import { describe, expect, it } from "vitest";
import { tideHeightAt, type TideExtreme } from "./tide";

// Made-up high and low waters for the sample boat's made-up home port, in metres. Not a real
// station's predictions.
const low1: TideExtreme = { time: "2026-07-04T03:00:00Z", height: 0.3, type: "low" };
const high1: TideExtreme = { time: "2026-07-04T09:12:00Z", height: 2.1, type: "high" };
const low2: TideExtreme = { time: "2026-07-04T15:25:00Z", height: 0.4, type: "low" };
const high2: TideExtreme = { time: "2026-07-04T21:37:00Z", height: 2.2, type: "high" };
const day = [low1, high1, low2, high2];

// The time a fraction of the way from one instant to another.
const between = (a: string, b: string, fraction: number) =>
  new Date(Date.parse(a) + (Date.parse(b) - Date.parse(a)) * fraction).toISOString();

describe("tideHeightAt", () => {
  it("is the predicted height at each high and low water", () => {
    for (const e of day) expect(tideHeightAt(day, e.time).height).toBeCloseTo(e.height, 10);
  });

  it("is half way between low and high at mid-tide", () => {
    expect(tideHeightAt(day, "2026-07-04T06:06:00Z").height).toBeCloseTo(1.2, 10);
  });

  it("follows the cosine curve at the quarter points", () => {
    // (1 - cos 45°) / 2 = 0.146447 and (1 - cos 135°) / 2 = 0.853553 of the 1.8 m range.
    const quarter = between(low1.time, high1.time, 0.25);
    const threeQuarters = between(low1.time, high1.time, 0.75);
    expect(tideHeightAt(day, quarter).height).toBeCloseTo(0.3 + 1.8 * 0.1464466, 6);
    expect(tideHeightAt(day, threeQuarters).height).toBeCloseTo(0.3 + 1.8 * 0.8535534, 6);
  });

  it("stays within 2% of the range of the rule of twelfths, hour by hour", () => {
    // Rule of twelfths: 1, 2, 3, 3, 2, 1 twelfths of the range in each sixth of the time.
    const twelfths = [0, 1, 3, 6, 9, 11, 12];
    const range = 2.1 - 0.4;
    for (let sixth = 0; sixth <= 6; sixth++) {
      const at = between(high1.time, low2.time, sixth / 6);
      const expected = 2.1 - (range * twelfths[sixth]!) / 12;
      expect(Math.abs(tideHeightAt(day, at).height - expected)).toBeLessThanOrEqual(0.02 * range);
    }
  });

  it("only goes up on the flood and down on the ebb", () => {
    let last = -Infinity;
    for (let i = 0; i <= 60; i++) {
      const h = tideHeightAt(day, between(low1.time, high1.time, i / 60)).height;
      expect(h).toBeGreaterThanOrEqual(last);
      last = h;
    }
    for (let i = 0; i <= 60; i++) {
      const h = tideHeightAt(day, between(high1.time, low2.time, i / 60)).height;
      expect(h).toBeLessThanOrEqual(last);
      last = h;
    }
  });

  it("says whether the tide is rising or falling, and between which extremes", () => {
    expect(tideHeightAt(day, "2026-07-04T12:00:00Z")).toMatchObject({ trend: "falling", previous: high1, next: low2 });
    expect(tideHeightAt(day, "2026-07-04T18:00:00Z")).toMatchObject({ trend: "rising", previous: low2, next: high2 });
    // Exactly at a high water, the tide is about to fall.
    expect(tideHeightAt(day, high1.time)).toMatchObject({ trend: "falling", previous: high1, next: low2 });
    // At the last cached extreme, the interval that ends there.
    expect(tideHeightAt(day, high2.time)).toMatchObject({ trend: "rising", previous: low2, next: high2 });
  });

  it("reads times in any time zone as the same instant", () => {
    const utc = tideHeightAt(day, "2026-07-04T12:00:00Z").height;
    expect(tideHeightAt(day, "2026-07-04T08:00:00-04:00").height).toBeCloseTo(utc, 10);
  });

  it("refuses times outside the cached predictions", () => {
    expect(() => tideHeightAt(day, "2026-07-04T02:59:00Z")).toThrow("outside the cached predictions");
    expect(() => tideHeightAt(day, "2026-07-05T00:00:00Z")).toThrow("outside the cached predictions");
  });

  it("refuses predictions it can't trust", () => {
    expect(() => tideHeightAt(day.slice(0, 1), low1.time)).toThrow("at least two");
    expect(() => tideHeightAt([high1, low1], low1.time)).toThrow("time order");
    expect(() => tideHeightAt([low1, { ...high1, type: "low" }], low1.time)).toThrow("Two low waters");
    expect(() => tideHeightAt([low1, { ...high1, height: 0.2 }], low1.time)).toThrow("High water at or below");
    expect(() => tideHeightAt([low1, { ...high1, height: NaN }], low1.time)).toThrow("Not a height");
  });

  it("refuses times without a time zone, which would depend on the phone's settings", () => {
    expect(() => tideHeightAt(day, "2026-07-04T12:00:00")).toThrow("time zone");
    expect(() => tideHeightAt(day, "noon")).toThrow("time zone");
    expect(() => tideHeightAt([{ ...low1, time: "2026-07-04 03:00" }, high1], high1.time)).toThrow("time zone");
  });
});
