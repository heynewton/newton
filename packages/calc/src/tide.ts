/**
 * Tide height at any time from the high and low waters a tide service predicts (NOAA's "hilo"
 * predictions, cached on the phone before leaving). Between two extremes the height follows half
 * a cosine wave: the cosine method that tide tables use for intermediate heights. Heights are in
 * whatever unit and datum the predictions use; the answer is in the same.
 */

export interface TideExtreme {
  /** When, as an ISO 8601 instant ("2026-07-04T09:12:00Z"). */
  time: string;
  /** Height above the predictions' datum. */
  height: number;
  type: "high" | "low";
}

export interface TideAt {
  height: number;
  /** "rising" toward a high water, or "falling" toward a low water. */
  trend: "rising" | "falling";
  /** The extremes on either side, so the answer can name what it was worked out from. */
  previous: TideExtreme;
  next: TideExtreme;
}

function instant(time: string): number {
  // An instant needs a zone: without one, Date would read it in the device's own time zone.
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(time)) throw new Error(`Not an ISO instant with a time zone: "${time}"`);
  const ms = Date.parse(time);
  if (Number.isNaN(ms)) throw new Error(`Not an ISO instant with a time zone: "${time}"`);
  return ms;
}

type Timed = { ms: number; extreme: TideExtreme };

/**
 * Checks the predictions: in time order, alternating high and low, highs above the lows next to
 * them. Returns them with their times in milliseconds.
 */
function checkExtremes(extremes: TideExtreme[]): Timed[] {
  if (extremes.length < 2) throw new Error("Needs at least two high or low waters");
  const timed: Timed[] = [];
  let prev: Timed | undefined;
  for (const extreme of extremes) {
    if (!Number.isFinite(extreme.height)) throw new Error(`Not a height: ${extreme.height}`);
    const current = { ms: instant(extreme.time), extreme };
    if (prev) {
      const p = prev.extreme;
      if (current.ms <= prev.ms) throw new Error(`Predictions out of time order at ${extreme.time}`);
      if (extreme.type === p.type) throw new Error(`Two ${extreme.type} waters in a row at ${p.time} and ${extreme.time}`);
      const [high, low] = extreme.type === "high" ? [extreme, p] : [p, extreme];
      if (high.height <= low.height) throw new Error(`High water at or below the next low water near ${extreme.time}`);
    }
    timed.push(current);
    prev = current;
  }
  return timed;
}

/**
 * The tide height at `time` (an ISO instant), between the two predicted extremes around it.
 * Refuses times outside the predictions: there is no honest answer beyond the cached data.
 */
export function tideHeightAt(extremes: TideExtreme[], time: string): TideAt {
  const timed = checkExtremes(extremes);
  const t = instant(time);
  // The pair of extremes around t. At an extreme, the pair that starts there, except at the
  // last one, where it's the pair that ends there.
  let pair: [Timed, Timed] | undefined;
  for (let i = 1; i < timed.length; i++) {
    const before = timed[i - 1]!;
    const after = timed[i]!;
    if (before.ms <= t && (t < after.ms || (t === after.ms && i === timed.length - 1))) {
      pair = [before, after];
      break;
    }
  }
  if (!pair) {
    throw new Error(`${time} is outside the cached predictions (${extremes[0]!.time} to ${extremes.at(-1)!.time})`);
  }
  const [previous, next] = pair;
  const fraction = (t - previous.ms) / (next.ms - previous.ms);
  const rise = next.extreme.height - previous.extreme.height;
  const height = previous.extreme.height + (rise * (1 - Math.cos(Math.PI * fraction))) / 2;
  return {
    height,
    trend: next.extreme.type === "high" ? "rising" : "falling",
    previous: previous.extreme,
    next: next.extreme,
  };
}
