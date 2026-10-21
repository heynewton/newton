import { describe, expect, it } from "vitest";
import {
  attentionSummary,
  balancesFor,
  costSplit,
  dateOf,
  dueState,
  formatDate,
  groupThousands,
  latestEngineHours,
  latestOn,
  money,
  maintenanceRule,
  renewalRule,
  schedule,
  todayUtc,
  type ExpenseRow,
  type MaintenanceRow,
  type RenewalRow,
} from ".";

// Shaped like the sample boat Test boat (fixtures/sample-boat), with short IDs.
const renewal = (id: string, expires_on: string, document_id: string | null = null): RenewalRow => ({
  id,
  kind: "insurance",
  title: `Renewal ${id}`,
  reference: null,
  expires_on,
  document_id,
});

const maintenance = (id: string, fields: Partial<MaintenanceRow>): MaintenanceRow => ({
  id,
  title: `Maintenance ${id}`,
  every_months: null,
  every_engine_hours: null,
  last_done_on: "2026-10-02",
  last_done_engine_hours: null,
  document_id: null,
  ...fields,
});

const expense = (id: string, amount_cents: number, paid_by: string, spent_on: string, currency = "USD"): ExpenseRow => ({
  id,
  description: `Expense ${id}`,
  amount_cents,
  currency,
  spent_on,
  paid_by,
  document_id: null,
});

describe("renewalRule and maintenanceRule", () => {
  it("maps a renewal's expiry date to an expiry rule", () => {
    expect(renewalRule(renewal("r1", "2027-04-30"))).toEqual({ kind: "expiry", expiresOn: "2027-04-30" });
  });

  it("maps maintenance columns to an interval rule, null columns left out", () => {
    expect(
      maintenanceRule(maintenance("m1", { every_months: 12, every_engine_hours: 100, last_done_engine_hours: 1412 })),
    ).toEqual({
      kind: "interval",
      lastDoneOn: "2026-10-02",
      everyMonths: 12,
      everyEngineHours: 100,
      lastDoneEngineHours: 1412,
    });
    expect(maintenanceRule(maintenance("m2", { every_months: 6 }))).toEqual({
      kind: "interval",
      lastDoneOn: "2026-10-02",
      everyMonths: 6,
      everyEngineHours: undefined,
      lastDoneEngineHours: undefined,
    });
  });
});

describe("latestEngineHours", () => {
  it("is the highest reading recorded with maintenance", () => {
    expect(
      latestEngineHours([
        maintenance("old", { last_done_on: "2025-03-20", last_done_engine_hours: 1290, every_engine_hours: 500 }),
        maintenance("new", { last_done_on: "2026-10-02", last_done_engine_hours: 1412, every_engine_hours: 100 }),
        maintenance("none", { every_months: 6 }),
      ]),
    ).toEqual({ hours: 1412, on: "2026-10-02", maintenanceId: "new" });
  });

  it("is null when nothing has a reading", () => {
    expect(latestEngineHours([maintenance("m", { every_months: 6 })])).toBeNull();
  });
});

describe("schedule", () => {
  const options = { today: "2026-10-18", withinDays: 60, withinEngineHours: 25 };

  it("sorts the sample boat's records into overdue, due soon and later", () => {
    const result = schedule(
      [renewal("insurance", "2027-04-30", "doc-1"), renewal("registration", "2026-12-31"), renewal("vhf", "2028-03-15")],
      [
        maintenance("oil", { every_months: 12, every_engine_hours: 100, last_done_engine_hours: 1412 }),
        maintenance("anodes", {
          every_months: 6,
          every_engine_hours: 100,
          last_done_on: "2026-04-18",
          last_done_engine_hours: 1371,
        }),
        maintenance("valves", { every_engine_hours: 500, last_done_on: "2025-03-20", last_done_engine_hours: 1290 }),
        maintenance("old", { every_months: 6, last_done_on: "2026-01-10" }),
      ],
      options,
    );

    const ids = (items: typeof result.overdue) => items.map((i) => i.row.id);
    expect(ids(result.overdue)).toEqual(["old"]);
    // Anodes are due today (2026-10-18) and within 25 h of 1471 h at the last reading (1412 h).
    expect(ids(result.dueSoon)).toEqual(["anodes"]);
    // The registration expires 2026-12-31, after the 60-day window (2026-12-17).
    expect(ids(result.later)).toEqual(["registration", "insurance", "oil", "vhf", "valves"]);

    expect(result.overdue[0]).toMatchObject({ type: "maintenance", due: { dueOn: "2026-07-10" }, by: ["date"] });
    expect(result.dueSoon[0]).toMatchObject({
      due: { dueOn: "2026-10-18", dueAtEngineHours: 1471 },
      status: "due-soon",
      by: ["date"],
    });
    expect(result.later[1]).toMatchObject({
      type: "renewal",
      due: { dueOn: "2027-04-30" },
      status: "later",
      row: { document_id: "doc-1" },
    });
    // Due only by engine hours: no date, so it goes last.
    expect(result.later[4]).toMatchObject({ due: { dueAtEngineHours: 1790 }, by: [] });
    expect(result.later[4]!.due.dueOn).toBeUndefined();
    expect(result.engineHours).toEqual({ hours: 1412, on: "2026-10-02", maintenanceId: "oil" });
  });

  it("is overdue by engine hours when the last reading is past the interval", () => {
    const result = schedule(
      [],
      [
        maintenance("used", { every_engine_hours: 100, last_done_on: "2026-01-01", last_done_engine_hours: 1000 }),
        maintenance("latest", { every_months: 12, last_done_on: "2026-10-02", last_done_engine_hours: 1150 }),
      ],
      options,
    );
    expect(result.overdue.map((i) => [i.row.id, i.by])).toEqual([["used", ["engine-hours"]]]);
  });

  it("is empty with no records", () => {
    expect(schedule([], [], options)).toEqual({ overdue: [], dueSoon: [], later: [], engineHours: null });
  });
});

describe("dueState", () => {
  const options = { today: "2026-10-18", withinDays: 60, withinEngineHours: 25 };
  const state = (renewals: RenewalRow[], items: MaintenanceRow[]) => {
    const result = schedule(renewals, items, options);
    return [...result.overdue, ...result.dueSoon, ...result.later].map((i) => [i.row.id, dueState(i, options.today)]);
  };

  it("says how many days overdue, or until due, and months when it's further off", () => {
    expect(
      state(
        [
          renewal("yesterday", "2026-10-17"),
          renewal("today", "2026-10-18"),
          renewal("tomorrow", "2026-10-19"),
          renewal("soon", "2026-11-21"),
          renewal("months", "2026-12-31"),
          renewal("edge", "2026-12-17"),
          renewal("years", "2029-01-01"),
        ],
        [maintenance("old", { every_months: 6, last_done_on: "2026-04-16" })],
      ),
    ).toEqual([
      ["old", "Overdue by 2 days"],
      ["yesterday", "Overdue by 1 day"],
      ["today", "Due today"],
      ["tomorrow", "Due tomorrow"],
      ["soon", "Due in 34 days"],
      ["edge", "Due in 60 days"],
      ["months", "Due in 2 months"],
      ["years", "Due in 2 years"],
    ]);
  });

  it("counts in days up to 60 days, whatever the due-soon window", () => {
    const result = schedule([renewal("r", "2026-12-17")], [], { ...options, withinDays: 30 });
    expect(dueState(result.later[0]!, options.today)).toBe("Due in 60 days");
  });

  it("names engine hours when they, not the date, make it overdue or due soon", () => {
    expect(
      state(
        [],
        [
          maintenance("past", { every_months: 12, every_engine_hours: 100, last_done_on: "2026-06-01", last_done_engine_hours: 1000 }),
          maintenance("close", { every_months: 12, every_engine_hours: 100, last_done_on: "2026-06-01", last_done_engine_hours: 1030 }),
          maintenance("hours-only", { every_engine_hours: 500, last_done_on: "2026-06-01", last_done_engine_hours: 1090 }),
          maintenance("latest", { every_months: 12, last_done_on: "2026-10-02", last_done_engine_hours: 1105 }),
        ],
      ),
    ).toEqual([
      ["past", "Overdue by engine hours"],
      ["close", "Due soon by engine hours"],
      ["latest", "Due in 11 months"],
      ["hours-only", "Not due soon"],
    ]);
  });
});

describe("balancesFor", () => {
  const balances = [
    { owner: "alex", paidCents: 170400, shareCents: 139156, balanceCents: 31244 },
    { owner: "sam", paidCents: 167690, shareCents: 121762, balanceCents: 45928 },
    { owner: "jordan", paidCents: 9800, shareCents: 86972, balanceCents: -77172 },
  ];

  it("puts the signed-in co-owner first and marks them, keeping the others' order", () => {
    expect(balancesFor(balances, "sam").map((b) => [b.owner, b.isYou])).toEqual([
      ["sam", true],
      ["alex", false],
      ["jordan", false],
    ]);
    expect(balancesFor(balances, "alex")[0]).toEqual({ ...balances[0], isYou: true });
  });

  it("marks no one for a member with no ownership share", () => {
    expect(balancesFor(balances, "riley").map((b) => [b.owner, b.isYou])).toEqual([
      ["alex", false],
      ["sam", false],
      ["jordan", false],
    ]);
  });
});

describe("costSplit", () => {
  const shares = [
    { person_id: "riley", ownership_share: 0 },
    { person_id: "jordan", ownership_share: 25 },
    { person_id: "alex", ownership_share: 40 },
    { person_id: "sam", ownership_share: 35 },
  ];

  it("splits the sample boat's expenses 40/35/25, largest share first", () => {
    const result = costSplit(
      [
        expense("yard", 167690, "sam", "2026-10-02"),
        expense("insurance", 128400, "alex", "2026-04-14"),
        expense("registration", 9800, "jordan", "2024-12-15"),
        expense("mooring", 42000, "alex", "2026-10-01"),
      ],
      shares,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.shares.map((s) => s.person_id)).toEqual(["alex", "sam", "jordan"]);
    const [usd] = result.byCurrency;
    expect(usd).toMatchObject({ currency: "USD", totalCents: 347890, firstOn: "2024-12-15", lastOn: "2026-10-02" });
    expect(usd!.counted.map((e) => e.id)).toEqual(["registration", "insurance", "mooring", "yard"]);
    expect(usd!.balances.map((b) => [b.owner, b.balanceCents])).toEqual([
      ["alex", 31244],
      ["sam", 45928],
      ["jordan", -77172],
    ]);
    expect(usd!.balances.reduce((sum, b) => sum + b.balanceCents, 0)).toBe(0);
  });

  it("keeps currencies apart and leaves out expenses paid by someone without a share", () => {
    const result = costSplit(
      [
        expense("eur", 1000, "alex", "2026-05-01", "EUR"),
        expense("usd", 2000, "sam", "2026-05-01"),
        expense("crew", 500, "riley", "2026-06-01"),
        expense("left", 700, "someone-who-left", "2026-06-02"),
      ],
      shares,
    );
    if (!result.ok) throw new Error("expected a split");
    expect(result.byCurrency.map((c) => [c.currency, c.totalCents])).toEqual([
      ["EUR", 1000],
      ["USD", 2000],
    ]);
    expect(result.byCurrency[1]!.notCounted.map((e) => e.id)).toEqual(["crew", "left"]);
  });

  it("has no split without co-owner shares", () => {
    expect(costSplit([expense("x", 100, "alex", "2026-05-01")], [{ person_id: "alex", ownership_share: 0 }])).toEqual({
      ok: false,
      reason: "no_shares",
    });
  });

  it("has no currencies with no expenses", () => {
    expect(costSplit([], shares)).toMatchObject({ ok: true, byCurrency: [] });
  });
});

describe("formatting", () => {
  it("shows a calendar date as written, in any time zone", () => {
    expect(formatDate("2026-05-12")).toBe("12 May 2026");
    expect(formatDate("2026-12-31")).toBe("31 Dec 2026");
  });

  it("takes today's date in UTC", () => {
    expect(todayUtc(new Date("2026-10-18T23:30:00-05:00"))).toBe("2026-10-19");
  });

  it("groups thousands in a formatted amount", () => {
    expect(groupThousands("1676.90")).toBe("1,676.90");
    expect(groupThousands("1234567.00")).toBe("1,234,567.00");
    expect(groupThousands("98.00")).toBe("98.00");
    expect(groupThousands("-1000.50")).toBe("-1,000.50");
  });
});

describe("attentionSummary", () => {
  const options = { today: "2026-10-18", withinDays: 60, withinEngineHours: 25 };
  const shares = [
    { person_id: "alex", ownership_share: 40 },
    { person_id: "sam", ownership_share: 35 },
    { person_id: "jordan", ownership_share: 25 },
  ];
  const expenses = [
    expense("yard", 167690, "sam", "2026-10-02"),
    expense("insurance", 128400, "alex", "2026-04-14"),
    expense("registration", 9800, "jordan", "2024-12-15"),
    expense("mooring", 42000, "alex", "2026-10-01"),
  ];
  const due = schedule(
    [renewal("insurance", "2027-04-30")],
    [maintenance("old", { every_months: 6, last_done_on: "2026-01-10" })],
    options,
  );
  const summary = (personId: string, split = costSplit(expenses, shares), s = due) =>
    attentionSummary(s, split, personId, options.withinDays);

  it("counts overdue and due-soon items and says the signed-in co-owner's balance", () => {
    expect(summary("alex")).toEqual([
      { text: "1 overdue", anchor: "overdue" },
      { text: "nothing due in the next 60 days", anchor: "due-soon" },
      { text: "you're owed USD 312.44", anchor: "balance" },
    ]);
    expect(summary("jordan")?.[2]).toEqual({ text: "you owe USD 771.72", anchor: "balance" });
  });

  it("uses the counts the section shows", () => {
    expect(summary("alex")?.[0]?.text).toBe(`${due.overdue.length} overdue`);
    const soon = schedule([renewal("a", "2026-10-20"), renewal("b", "2026-11-01")], [], options);
    expect(summary("alex", costSplit([], shares), soon)).toEqual([
      { text: "Nothing overdue", anchor: "overdue" },
      { text: "2 due in the next 60 days", anchor: "due-soon" },
    ]);
  });

  it("leaves the balance out for a member with no ownership share", () => {
    expect(summary("riley")?.map((p) => p.anchor)).toEqual(["overdue", "due-soon"]);
  });

  it("says square, naming the currency only when there are several", () => {
    const even = [expense("a", 10000, "alex", "2026-05-01"), expense("b", 10000, "sam", "2026-05-01")];
    const half = [
      { person_id: "alex", ownership_share: 1 },
      { person_id: "sam", ownership_share: 1 },
    ];
    expect(summary("alex", costSplit(even, half))?.[2]?.text).toBe("you're square");
    const twoCurrencies = [...even, expense("c", 500, "alex", "2026-05-01", "EUR"), expense("d", 500, "sam", "2026-05-01", "EUR")];
    expect(summary("alex", costSplit(twoCurrencies, half))?.slice(2).map((p) => p.text)).toEqual([
      "you're square in EUR",
      "you're square in USD",
    ]);
  });

  it("starts with the balance, capitalised, when the boat has expenses but no renewals or maintenance", () => {
    expect(summary("alex", costSplit(expenses, shares), schedule([], [], options))).toEqual([
      { text: "You're owed USD 312.44", anchor: "balance" },
    ]);
  });

  it("is null for a boat with nothing to track yet", () => {
    expect(summary("alex", costSplit([], shares), schedule([], [], options))).toBeNull();
  });
});

describe("money", () => {
  it("formats cents with the currency and thousands separators", () => {
    expect(money(123456, "USD")).toBe("USD 1,234.56");
    expect(money(5, "EUR")).toBe("EUR 0.05");
  });
});

describe("latestOn and dateOf", () => {
  it("gives a timestamp's UTC calendar date", () => {
    expect(dateOf("2026-10-03T16:45:12Z")).toBe("2026-10-03");
    expect(dateOf("2026-10-03T23:30:00-02:00")).toBe("2026-10-04");
  });

  it("finds the most recent date among dates and timestamps", () => {
    expect(latestOn(["2026-04-14T18:22:05Z", "2026-10-11T08:15:40Z", "2025-01-18T10:04:51Z"])).toBe("2026-10-11");
    expect(latestOn(["2026-10-02", "2024-12-15", "2026-10-01"])).toBe("2026-10-02");
  });

  it("is null with nothing to go on", () => {
    expect(latestOn([])).toBeNull();
  });
});
