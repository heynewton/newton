import { describe, expect, it } from "vitest";
import { addDays, addMonths, daysBetween, findDue, fullMonthsBetween, nextDue, type DueItem } from "./due-dates";

describe("addMonths", () => {
  it.each([
    ["2026-03-15", 1, "2026-04-15"],
    ["2026-11-30", 3, "2027-02-28"],
    ["2026-01-31", 1, "2026-02-28"],
    ["2028-01-31", 1, "2028-02-29"],
    ["2026-03-31", 1, "2026-04-30"],
    ["2026-12-31", 1, "2027-01-31"],
    ["2028-02-29", 12, "2029-02-28"],
    ["2028-02-29", 48, "2032-02-29"],
    ["2027-02-28", 12, "2028-02-28"],
    ["2026-05-31", -3, "2026-02-28"],
    ["2026-01-15", -1, "2025-12-15"],
  ])("%s + %i months is %s", (date, months, expected) => {
    expect(addMonths(date, months)).toBe(expected);
  });

  it.each(["2026-02-29", "2026-13-01", "2026-04-31", "2026-4-1", "1 May 2026", ""])("rejects %j", (date) => {
    expect(() => addMonths(date, 1)).toThrow(/Not a date/);
  });

  it("rejects fractional months", () => {
    expect(() => addMonths("2026-01-01", 1.5)).toThrow();
  });
});

describe("addDays", () => {
  it.each([
    ["2026-02-27", 2, "2026-03-01"],
    ["2028-02-28", 1, "2028-02-29"],
    ["2026-12-31", 1, "2027-01-01"],
    ["2026-03-01", -1, "2026-02-28"],
  ])("%s + %i days is %s", (date, days, expected) => {
    expect(addDays(date, days)).toBe(expected);
  });
});

describe("nextDue", () => {
  it("uses the expiry date of a renewal", () => {
    expect(nextDue({ kind: "expiry", expiresOn: "2027-04-30" })).toEqual({ dueOn: "2027-04-30" });
  });

  it("puts a yearly renewal a year after it was last done", () => {
    expect(nextDue({ kind: "yearly", lastDoneOn: "2026-06-01" })).toEqual({ dueOn: "2027-06-01" });
  });

  it("moves a yearly renewal done on 29 February to 28 February", () => {
    expect(nextDue({ kind: "yearly", lastDoneOn: "2028-02-29" })).toEqual({ dueOn: "2029-02-28" });
  });

  it("gives maintenance both a date and engine hours", () => {
    expect(
      nextDue({ kind: "interval", lastDoneOn: "2026-04-10", everyMonths: 12, lastDoneEngineHours: 812.4, everyEngineHours: 100 }),
    ).toEqual({ dueOn: "2027-04-10", dueAtEngineHours: 912.4 });
  });

  it("allows months only or engine hours only", () => {
    expect(nextDue({ kind: "interval", lastDoneOn: "2026-08-31", everyMonths: 6 })).toEqual({ dueOn: "2027-02-28" });
    expect(nextDue({ kind: "interval", lastDoneOn: "2026-08-31", lastDoneEngineHours: 40, everyEngineHours: 50 })).toEqual({
      dueAtEngineHours: 90,
    });
  });

  it.each([
    ["no interval", { kind: "interval", lastDoneOn: "2026-01-01" }],
    ["zero months", { kind: "interval", lastDoneOn: "2026-01-01", everyMonths: 0 }],
    ["fractional months", { kind: "interval", lastDoneOn: "2026-01-01", everyMonths: 1.5 }],
    ["engine hours without the last reading", { kind: "interval", lastDoneOn: "2026-01-01", everyEngineHours: 100 }],
    ["negative engine hours", { kind: "interval", lastDoneOn: "2026-01-01", lastDoneEngineHours: 10, everyEngineHours: -5 }],
    ["a bad expiry date", { kind: "expiry", expiresOn: "2026-02-30" }],
    ["a bad last-done date", { kind: "interval", lastDoneOn: "yesterday", everyMonths: 1 }],
  ] as const)("rejects %s", (_, rule) => {
    expect(() => nextDue(rule)).toThrow();
  });
});

describe("findDue", () => {
  const items: DueItem[] = [
    { id: "insurance", rule: { kind: "expiry", expiresOn: "2026-10-31" } },
    { id: "registration", rule: { kind: "yearly", lastDoneOn: "2025-10-01" } },
    { id: "liferaft", rule: { kind: "expiry", expiresOn: "2027-03-01" } },
    {
      id: "engine-service",
      rule: { kind: "interval", lastDoneOn: "2026-04-10", everyMonths: 12, lastDoneEngineHours: 800, everyEngineHours: 100 },
    },
    { id: "antifouling", rule: { kind: "interval", lastDoneOn: "2026-04-01", everyMonths: 12 } },
  ];

  it("sorts items into overdue and due soon, in input order", () => {
    const result = findDue(items, { today: "2026-10-18", withinDays: 30, engineHours: 850 });
    expect(result).toEqual({
      overdue: [{ id: "registration", dueOn: "2026-10-01", status: "overdue", by: ["date"] }],
      dueSoon: [{ id: "insurance", dueOn: "2026-10-31", status: "due-soon", by: ["date"] }],
    });
  });

  it("counts the due date itself as due, not overdue, and the day after as overdue", () => {
    const item: DueItem[] = [{ id: "insurance", rule: { kind: "expiry", expiresOn: "2026-10-31" } }];
    expect(findDue(item, { today: "2026-10-31", withinDays: 0 }).dueSoon).toHaveLength(1);
    expect(findDue(item, { today: "2026-11-01", withinDays: 0 }).overdue).toHaveLength(1);
  });

  it("includes the last day of the window", () => {
    const item: DueItem[] = [{ id: "insurance", rule: { kind: "expiry", expiresOn: "2026-10-31" } }];
    expect(findDue(item, { today: "2026-10-01", withinDays: 30 }).dueSoon).toHaveLength(1);
    expect(findDue(item, { today: "2026-09-30", withinDays: 30 }).dueSoon).toHaveLength(0);
  });

  it("counts the window across the end of February in a leap year", () => {
    const item: DueItem[] = [{ id: "insurance", rule: { kind: "expiry", expiresOn: "2028-03-01" } }];
    // 2028-02-01 + 29 days is 2028-03-01 in a leap year (it would be 2 March in 2027).
    expect(findDue(item, { today: "2028-02-01", withinDays: 29 }).dueSoon).toHaveLength(1);
    expect(findDue(item, { today: "2028-02-01", withinDays: 28 }).dueSoon).toHaveLength(0);
  });

  it("makes maintenance overdue on engine hours before its date, whichever comes first", () => {
    const result = findDue(items, { today: "2026-10-18", withinDays: 30, engineHours: 901 });
    expect(result.overdue).toContainEqual({
      id: "engine-service",
      dueOn: "2027-04-10",
      dueAtEngineHours: 900,
      status: "overdue",
      by: ["engine-hours"],
    });
  });

  it("makes maintenance overdue on its date when the engine has barely run", () => {
    const result = findDue(items, { today: "2027-04-11", withinDays: 0, engineHours: 820 });
    expect(result.overdue.find((r) => r.id === "engine-service")?.by).toEqual(["date"]);
  });

  it("lists both reasons when date and engine hours have both passed", () => {
    const result = findDue(items, { today: "2027-05-01", withinDays: 0, engineHours: 950 });
    expect(result.overdue.find((r) => r.id === "engine-service")?.by).toEqual(["date", "engine-hours"]);
  });

  it("flags engine hours as due soon within the hours window, and at exactly the due reading", () => {
    const engine = items.filter((i) => i.id === "engine-service");
    expect(findDue(engine, { today: "2026-10-18", withinDays: 0, engineHours: 890, withinEngineHours: 10 }).dueSoon).toHaveLength(1);
    expect(findDue(engine, { today: "2026-10-18", withinDays: 0, engineHours: 889, withinEngineHours: 10 }).dueSoon).toHaveLength(0);
    expect(findDue(engine, { today: "2026-10-18", withinDays: 0, engineHours: 900 }).dueSoon).toHaveLength(1);
  });

  it("puts an item that is overdue on one count in overdue only, even if due soon on the other", () => {
    const result = findDue(items, { today: "2027-04-11", withinDays: 0, engineHours: 895, withinEngineHours: 10 });
    expect(result.overdue.find((r) => r.id === "engine-service")?.by).toEqual(["date"]);
    expect(result.dueSoon.find((r) => r.id === "engine-service")).toBeUndefined();
  });

  it("returns nothing when nothing is due", () => {
    expect(findDue(items, { today: "2026-05-01", withinDays: 7, engineHours: 805 })).toEqual({ overdue: [], dueSoon: [] });
  });

  it("needs the engine hours now when an item is due by engine hours", () => {
    expect(() => findDue(items, { today: "2026-10-18", withinDays: 30 })).toThrow(/engine hours now/);
  });

  it("doesn't need engine hours when no item uses them", () => {
    const renewals = items.filter((i) => i.rule.kind !== "interval");
    expect(() => findDue(renewals, { today: "2026-10-18", withinDays: 30 })).not.toThrow();
  });

  it.each([
    ["a bad date", { today: "2026-10-32", withinDays: 30 }],
    ["a negative window", { today: "2026-10-18", withinDays: -1 }],
    ["a fractional window", { today: "2026-10-18", withinDays: 1.5 }],
    ["a negative engine hours window", { today: "2026-10-18", withinDays: 1, withinEngineHours: -1 }],
  ])("rejects %s", (_, window) => {
    expect(() => findDue([], window)).toThrow();
  });
});

describe("daysBetween", () => {
  it.each([
    ["2026-10-19", "2026-10-21", 2],
    ["2026-10-21", "2026-10-21", 0],
    ["2026-10-21", "2026-10-19", -2],
    ["2028-02-28", "2028-03-01", 2],
    ["2026-12-31", "2027-01-01", 1],
    ["2026-03-28", "2026-03-30", 2],
  ])("from %s to %s is %i days", (from, to, expected) => {
    expect(daysBetween(from, to)).toBe(expected);
  });

  it("rejects a date that doesn't exist", () => {
    expect(() => daysBetween("2026-02-29", "2026-03-01")).toThrow(/Not a date/);
  });
});

describe("fullMonthsBetween", () => {
  it.each([
    ["2026-10-21", "2026-12-20", 1],
    ["2026-10-21", "2026-12-21", 2],
    ["2026-10-21", "2026-11-20", 0],
    ["2026-10-21", "2026-10-01", 0],
    ["2026-01-31", "2026-02-28", 1],
    ["2026-01-31", "2026-02-27", 0],
    ["2026-10-21", "2028-10-21", 24],
  ])("from %s to %s is %i months", (from, to, expected) => {
    expect(fullMonthsBetween(from, to)).toBe(expected);
  });
});
