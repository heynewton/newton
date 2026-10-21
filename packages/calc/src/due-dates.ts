/**
 * Due dates for renewals and maintenance: what is overdue and what is coming up.
 *
 * Dates are calendar dates as "YYYY-MM-DD" strings, with no time or time zone, so a date
 * means the same day wherever the boat is. Something due on a date is due that day, and
 * overdue from the day after.
 */

/** When something next falls due. */
export type DueRule =
  /** A renewal with a known expiry date, such as an insurance certificate. */
  | { kind: "expiry"; expiresOn: string }
  /** A renewal due once a year from when it was last renewed. */
  | { kind: "yearly"; lastDoneOn: string }
  /**
   * Maintenance due every so many months, every so many engine hours, or both, whichever
   * comes first. At least one interval is needed. Engine hours need the reading when last done.
   */
  | {
      kind: "interval";
      lastDoneOn: string;
      everyMonths?: number;
      lastDoneEngineHours?: number;
      everyEngineHours?: number;
    };

export interface NextDue {
  dueOn?: string;
  dueAtEngineHours?: number;
}

export interface DueItem {
  id: string;
  rule: DueRule;
}

export interface DueWindow {
  /** The date to check against, YYYY-MM-DD. */
  today: string;
  /** Due within this many days from today (inclusive) counts as due soon. */
  withinDays: number;
  /** The engine hour meter now. Needed when any item has an engine-hours interval. */
  engineHours?: number;
  /** Due within this many engine hours counts as due soon. Defaults to 0. */
  withinEngineHours?: number;
}

export type DueStatus = "overdue" | "due-soon";

export interface DueResult extends NextDue {
  id: string;
  status: DueStatus;
  /** What made it overdue or due soon: the date, the engine hours, or both. */
  by: ("date" | "engine-hours")[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parses YYYY-MM-DD into milliseconds at UTC midnight, rejecting dates that don't exist. */
function parseDate(date: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (match) {
    const [, y, m, d] = match.map(Number) as [number, number, number, number];
    const ms = Date.UTC(y, m - 1, d);
    const back = new Date(ms);
    if (back.getUTCFullYear() === y && back.getUTCMonth() === m - 1 && back.getUTCDate() === d) {
      return ms;
    }
  }
  throw new Error(`Not a date (YYYY-MM-DD): "${date}"`);
}

function formatDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Adds days to a date. */
export function addDays(date: string, days: number): string {
  if (!Number.isSafeInteger(days)) {
    throw new Error(`Not a whole number of days: ${days}`);
  }
  return formatDate(parseDate(date) + days * DAY_MS);
}

/**
 * Adds calendar months to a date. When the day doesn't exist in the target month, it moves back
 * to that month's last day: 31 January + 1 month is 28 (or 29) February, and 29 February + 12
 * months is 28 February.
 */
export function addMonths(date: string, months: number): string {
  if (!Number.isSafeInteger(months)) {
    throw new Error(`Not a whole number of months: ${months}`);
  }
  const start = new Date(parseDate(date));
  const monthIndex = start.getUTCFullYear() * 12 + start.getUTCMonth() + months;
  const year = Math.floor(monthIndex / 12);
  const month = monthIndex - year * 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return formatDate(Date.UTC(year, month, Math.min(start.getUTCDate(), lastDay)));
}

/** When a rule next falls due, by date and/or by engine hours. */
export function nextDue(rule: DueRule): NextDue {
  switch (rule.kind) {
    case "expiry":
      parseDate(rule.expiresOn);
      return { dueOn: rule.expiresOn };
    case "yearly":
      return { dueOn: addMonths(rule.lastDoneOn, 12) };
    case "interval": {
      const { lastDoneOn, everyMonths, lastDoneEngineHours, everyEngineHours } = rule;
      parseDate(lastDoneOn);
      if (everyMonths === undefined && everyEngineHours === undefined) {
        throw new Error("An interval needs every so many months, engine hours, or both");
      }
      const due: NextDue = {};
      if (everyMonths !== undefined) {
        if (!Number.isSafeInteger(everyMonths) || everyMonths <= 0) {
          throw new Error(`Months must be a positive whole number: ${everyMonths}`);
        }
        due.dueOn = addMonths(lastDoneOn, everyMonths);
      }
      if (everyEngineHours !== undefined) {
        if (!Number.isFinite(everyEngineHours) || everyEngineHours <= 0) {
          throw new Error(`Engine hours must be a positive number: ${everyEngineHours}`);
        }
        if (lastDoneEngineHours === undefined || !Number.isFinite(lastDoneEngineHours) || lastDoneEngineHours < 0) {
          throw new Error(`Needs the engine hours when last done: ${lastDoneEngineHours}`);
        }
        due.dueAtEngineHours = lastDoneEngineHours + everyEngineHours;
      }
      return due;
    }
  }
}

/**
 * Finds what is overdue and what is due soon, keeping the order of `items`. An item is overdue
 * when its date or its engine hours have passed, whichever comes first, and due soon when either
 * is within the window. Items that are neither are left out.
 */
export function findDue(items: DueItem[], window: DueWindow): { overdue: DueResult[]; dueSoon: DueResult[] } {
  const today = parseDate(window.today);
  if (!Number.isSafeInteger(window.withinDays) || window.withinDays < 0) {
    throw new Error(`Window must be a whole number of days, 0 or more: ${window.withinDays}`);
  }
  const soonUntil = today + window.withinDays * DAY_MS;
  const withinEngineHours = window.withinEngineHours ?? 0;
  if (!Number.isFinite(withinEngineHours) || withinEngineHours < 0) {
    throw new Error(`Engine hours window must be 0 or more: ${withinEngineHours}`);
  }

  const overdue: DueResult[] = [];
  const dueSoon: DueResult[] = [];
  for (const item of items) {
    const due = nextDue(item.rule);
    const overdueBy: DueResult["by"] = [];
    const soonBy: DueResult["by"] = [];

    if (due.dueOn !== undefined) {
      const dueMs = parseDate(due.dueOn);
      if (dueMs < today) overdueBy.push("date");
      else if (dueMs <= soonUntil) soonBy.push("date");
    }
    if (due.dueAtEngineHours !== undefined) {
      const now = window.engineHours;
      if (now === undefined || !Number.isFinite(now) || now < 0) {
        throw new Error(`"${item.id}" is due by engine hours, so the engine hours now are needed`);
      }
      if (now > due.dueAtEngineHours) overdueBy.push("engine-hours");
      else if (now >= due.dueAtEngineHours - withinEngineHours) soonBy.push("engine-hours");
    }

    if (overdueBy.length > 0) overdue.push({ id: item.id, ...due, status: "overdue", by: overdueBy });
    else if (soonBy.length > 0) dueSoon.push({ id: item.id, ...due, status: "due-soon", by: soonBy });
  }
  return { overdue, dueSoon };
}

/**
 * The whole number of calendar months from one date to a later one, or null when `to` isn't a
 * whole number of months after `from` (by `addMonths`). Turns "done 2026-10-02, next due
 * 2027-10-02" from a document into an interval of 12 months.
 */
export function wholeMonthsBetween(from: string, to: string): number | null {
  const start = new Date(parseDate(from));
  const end = new Date(parseDate(to));
  const months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth();
  return months > 0 && addMonths(from, months) === to ? months : null;
}

/**
 * Calendar days from one date to another: 2 when `to` is two days after `from`, negative when
 * it is before. Says how long ago something fell due, or how long until it does.
 */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseDate(to) - parseDate(from)) / DAY_MS);
}

/**
 * The whole calendar months from one date to a later one, rounded down (by `addMonths`): from
 * 2026-10-21, 2026-12-20 is 1 month and 2026-12-21 is 2. 0 when `to` is less than a month after
 * `from`, or before it.
 */
export function fullMonthsBetween(from: string, to: string): number {
  const start = new Date(parseDate(from));
  const end = new Date(parseDate(to));
  const months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth();
  if (months <= 0) return 0;
  return addMonths(from, months) > to ? months - 1 : months;
}
