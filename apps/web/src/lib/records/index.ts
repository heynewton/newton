import {
  findDue,
  nextDue,
  splitCosts,
  type CoOwnerBalance,
  type DueRule,
  type DueStatus,
  type NextDue,
} from "@newton/calc";

// Turns the boat's record rows into packages/calc inputs, and calc's answers into what the
// boat page shows. Every date and amount comes from calc; this module only renames columns,
// groups and orders. Pure, so it is unit tested without a database.

export type RenewalRow = {
  id: string;
  kind: "insurance" | "registration" | "licence" | "other";
  title: string;
  reference: string | null;
  expires_on: string;
  document_id: string | null;
};

export type MaintenanceRow = {
  id: string;
  title: string;
  every_months: number | null;
  every_engine_hours: number | null;
  last_done_on: string;
  last_done_engine_hours: number | null;
  document_id: string | null;
};

export type ExpenseRow = {
  id: string;
  description: string;
  amount_cents: number;
  currency: string;
  spent_on: string;
  paid_by: string;
  document_id: string | null;
};

export type ShareRow = { person_id: string; ownership_share: number };

export function renewalRule(row: RenewalRow): DueRule {
  return { kind: "expiry", expiresOn: row.expires_on };
}

// Null columns are intervals that aren't set.
export function maintenanceRule(row: MaintenanceRow): DueRule {
  return {
    kind: "interval",
    lastDoneOn: row.last_done_on,
    everyMonths: row.every_months ?? undefined,
    everyEngineHours: row.every_engine_hours ?? undefined,
    lastDoneEngineHours: row.last_done_engine_hours ?? undefined,
  };
}

export type EngineHoursReading = { hours: number; on: string; maintenanceId: string };

// Newton has no engine hour meter yet (Signal K comes in Phase 2), so the latest reading it
// knows is the one recorded with the most recent maintenance. The meter can only have gone up
// since, so this is a lower bound and the page says so.
export function latestEngineHours(items: MaintenanceRow[]): EngineHoursReading | null {
  let latest: EngineHoursReading | null = null;
  for (const item of items) {
    if (item.last_done_engine_hours === null) continue;
    if (
      !latest ||
      item.last_done_engine_hours > latest.hours ||
      (item.last_done_engine_hours === latest.hours && item.last_done_on > latest.on)
    ) {
      latest = { hours: item.last_done_engine_hours, on: item.last_done_on, maintenanceId: item.id };
    }
  }
  return latest;
}

export type ScheduledRecord = { type: "renewal"; row: RenewalRow } | { type: "maintenance"; row: MaintenanceRow };

export type ScheduledItem = ScheduledRecord & {
  due: NextDue;
  status: DueStatus | "later";
  /** What made it overdue or due soon. Empty when later. */
  by: ("date" | "engine-hours")[];
};

export type Schedule = {
  overdue: ScheduledItem[];
  dueSoon: ScheduledItem[];
  later: ScheduledItem[];
  engineHours: EngineHoursReading | null;
};

export type ScheduleOptions = {
  today: string;
  withinDays: number;
  withinEngineHours: number;
};

// Renewals and maintenance sorted into overdue, due soon and later, each in date order. Engine
// hours are checked against the latest reading Newton has (see latestEngineHours).
export function schedule(renewals: RenewalRow[], maintenance: MaintenanceRow[], options: ScheduleOptions): Schedule {
  const engineHours = latestEngineHours(maintenance);
  const entries: { key: string; rule: DueRule; record: ScheduledRecord }[] = [
    ...renewals.map((row) => ({
      key: `renewal:${row.id}`,
      rule: renewalRule(row),
      record: { type: "renewal" as const, row },
    })),
    ...maintenance.map((row) => ({
      key: `maintenance:${row.id}`,
      rule: maintenanceRule(row),
      record: { type: "maintenance" as const, row },
    })),
  ];

  const { overdue, dueSoon } = findDue(
    entries.map((e) => ({ id: e.key, rule: e.rule })),
    {
      today: options.today,
      withinDays: options.withinDays,
      engineHours: engineHours?.hours,
      withinEngineHours: options.withinEngineHours,
    },
  );
  const found = new Map([...overdue, ...dueSoon].map((r) => [r.id, r]));

  const result: Schedule = { overdue: [], dueSoon: [], later: [], engineHours };
  for (const entry of entries) {
    const r = found.get(entry.key);
    const item: ScheduledItem = r
      ? { ...entry.record, due: { dueOn: r.dueOn, dueAtEngineHours: r.dueAtEngineHours }, status: r.status, by: r.by }
      : { ...entry.record, due: nextDue(entry.rule), status: "later", by: [] };
    if (item.status === "overdue") result.overdue.push(item);
    else if (item.status === "due-soon") result.dueSoon.push(item);
    else result.later.push(item);
  }
  for (const list of [result.overdue, result.dueSoon, result.later]) list.sort(byDueDate);
  return result;
}

// Earliest date first; items due only by engine hours go last, lowest hours first.
function byDueDate(a: ScheduledItem, b: ScheduledItem): number {
  const ad = a.due.dueOn;
  const bd = b.due.dueOn;
  if (ad !== undefined && bd !== undefined && ad !== bd) return ad < bd ? -1 : 1;
  if (ad === undefined && bd !== undefined) return 1;
  if (ad !== undefined && bd === undefined) return -1;
  return (a.due.dueAtEngineHours ?? 0) - (b.due.dueAtEngineHours ?? 0) || a.row.title.localeCompare(b.row.title);
}

export type CurrencySplit = {
  currency: string;
  balances: CoOwnerBalance[];
  /** The expenses in the split. */
  counted: ExpenseRow[];
  /** Expenses paid by someone with no ownership share (crew, or someone who left the boat). */
  notCounted: ExpenseRow[];
  totalCents: number;
  firstOn: string | null;
  lastOn: string | null;
};

export type CostSplit =
  | { ok: true; shares: ShareRow[]; byCurrency: CurrencySplit[] }
  | { ok: false; reason: "no_shares" };

// The co-owner balance, one split per currency (amounts in different currencies can't be added).
// Co-owners are the members with an ownership share above 0, ordered by share then person ID, so
// calc's remainder rule always gives the same cents to the same person.
export function costSplit(expenses: ExpenseRow[], shareRows: ShareRow[]): CostSplit {
  const shares = shareRows
    .filter((s) => s.ownership_share > 0)
    .sort((a, b) => b.ownership_share - a.ownership_share || (a.person_id < b.person_id ? -1 : 1));
  if (shares.length === 0) return { ok: false, reason: "no_shares" };
  const coOwners = new Set(shares.map((s) => s.person_id));

  const currencies = [...new Set(expenses.map((e) => e.currency))].sort();
  const byCurrency = currencies.map((currency) => {
    const inCurrency = expenses
      .filter((e) => e.currency === currency)
      .sort((a, b) => (a.spent_on < b.spent_on ? -1 : a.spent_on > b.spent_on ? 1 : 0));
    const counted = inCurrency.filter((e) => coOwners.has(e.paid_by));
    const balances = splitCosts(
      counted.map((e) => ({ amountCents: e.amount_cents, paidBy: e.paid_by, date: e.spent_on })),
      shares.map((s) => ({ owner: s.person_id, share: s.ownership_share })),
    );
    return {
      currency,
      balances,
      counted,
      notCounted: inCurrency.filter((e) => !coOwners.has(e.paid_by)),
      totalCents: balances.reduce((sum, b) => sum + b.paidCents, 0),
      firstOn: counted[0]?.spent_on ?? null,
      lastOn: counted.at(-1)?.spent_on ?? null,
    };
  });
  return { ok: true, shares, byCurrency };
}

// Today's calendar date, YYYY-MM-DD, in UTC. Boats don't have a time zone yet.
export function todayUtc(now: Date): string {
  return now.toISOString().slice(0, 10);
}

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

// "2026-05-12" → "12 May 2026". The date is shown as written, whatever the server's time zone.
export function formatDate(date: string): string {
  return dateFormat.format(new Date(`${date}T00:00:00Z`));
}

// Thousands separators on calc's formatted amount: "1234.56" → "1,234.56".
export function groupThousands(amount: string): string {
  return amount.replace(/\B(?=(\d{3})+(?!\d))(?=\d*\.)/g, ",");
}
