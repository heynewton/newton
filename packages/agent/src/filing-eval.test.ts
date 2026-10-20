import { describe, expect, it } from "vitest";
import type { FilingModel, FilingProposal, FilingRequest } from "./filing";
import { gradeFiling, loadFilingEvalSet, runFilingCase, runFilingEval } from "./filing-eval";

const set = loadFilingEvalSet();

const none = { renewals: [], expenses: [], maintenance: [] };

// Stands in for Claude in CI: what a careful reader of each fixture would propose, values copied
// as printed. The eval still runs everything after the model for real: the PDF's text, the
// checks against it, calc's parsing, duplicates and matching.
const answers: Record<string, (request: FilingRequest) => FilingProposal> = {
  "insurance-certificate.pdf": () => ({
    ...none,
    document_type: "insurance",
    confidence: "high",
    summary: "Insurance certificate for Kittiwake, 2026-27.",
    vendor: "EXAMPLE MUTUAL MARINE INSURANCE CO.",
    decimal_separator: ".",
    date_order: "YMD",
    renewals: [{ kind: "insurance", title: "Hull and liability insurance", reference: "SAMPLE-POL-000123", expires_on: "2027-04-30" }],
    expenses: [{ description: "Insurance premium 2026-27", amount: "$1,284.00", currency: "USD", spent_on: "2026-04-14" }],
  }),
  "registration.pdf": () => ({
    ...none,
    document_type: "registration",
    confidence: "high",
    summary: "Vessel registration certificate, valid to the end of 2026.",
    vendor: "STATE OF EXAMPLE - DEPARTMENT OF SAMPLE WATERWAYS",
    decimal_separator: ".",
    date_order: "YMD",
    renewals: [{ kind: "registration", title: "State vessel registration", reference: "XX 0000 ZZ", expires_on: "2026-12-31" }],
    // The fee was paid, but the certificate doesn't say when: flagged, not saved.
    expenses: [{ description: "Registration fee, two years", amount: "$98.00", currency: "USD", spent_on: null }],
  }),
  "yard-invoice.pdf": (request) => ({
    ...none,
    document_type: "invoice",
    confidence: "high",
    summary: "Boatyard invoice for haul-out, bottom paint and engine service.",
    vendor: "EXAMPLE POINT BOATYARD",
    decimal_separator: ".",
    date_order: "YMD",
    expenses: [{ description: "Haul-out, bottom paint and engine service", amount: "USD 1,676.90", currency: "USD", spent_on: "2026-10-02" }],
    maintenance: [
      {
        title: "Engine oil and filter",
        done_on: "2026-10-02",
        engine_hours: "1,412",
        next_due_on: "2027-10-02",
        next_due_engine_hours: "1,512",
        existing_item: request.prompt.includes("1. Engine oil and filter") ? 1 : null,
      },
      // No next due date on the invoice: a new item can't get an interval, so it is flagged.
      { title: "Raw-water pump impeller", done_on: "2026-10-02", engine_hours: "1,412", next_due_on: null, next_due_engine_hours: null, existing_item: null },
    ],
  }),
  "manual-excerpt.pdf": () => ({
    ...none,
    document_type: "manual",
    confidence: "high",
    summary: "Maintenance section of the SM-30 diesel's owner's manual.",
    vendor: null,
    decimal_separator: ".",
    date_order: null,
  }),
  "sail-loft-invoice.pdf": () => ({
    ...none,
    document_type: "invoice",
    confidence: "high",
    summary: "Sail loft invoice for mainsail repair and new slides.",
    vendor: "VOILERIE EXEMPLE SARL",
    decimal_separator: ",",
    date_order: "DMY",
    expenses: [{ description: "Mainsail repair, slides, genoa wash", amount: "EUR    1.260,80", currency: "EUR", spent_on: "03.09.2026" }],
  }),
};

function standIn(change: (p: FilingProposal) => FilingProposal = (p) => p): FilingModel {
  return {
    model: "stand-in",
    async propose(request) {
      const name = /^File name: (.+)$/m.exec(request.prompt)![1]!;
      return change(answers[name]!(request));
    },
  };
}

describe("the filing eval set", () => {
  it("covers every kind of fixture document, a European invoice and a boat that already has records", () => {
    expect(new Set(set.cases.map((c) => c.type))).toEqual(new Set(["insurance", "registration", "invoice", "manual"]));
    expect(set.cases.some((c) => c.file === "sail-loft-invoice.pdf")).toBe(true);
    expect(set.cases.some((c) => c.boat?.expenses.length)).toBe(true);
    expect(new Set(set.cases.map((c) => c.id)).size).toBe(set.cases.length);
  });

  it("passes every case with a model that copies values as printed", async () => {
    const results = await runFilingEval(set, standIn());
    expect(results.filter((r) => !r.passed).map((r) => [r.id, r.problems])).toEqual([]);
  });

  it("reads the European invoice's 1.260,80 and 03.09.2026 as 126080 cents on 3 September", async () => {
    const c = set.cases.find((x) => x.id === "sail-loft-invoice-european")!;
    const { plan } = await runFilingCase(set, c, standIn());
    expect(plan?.records.expenses).toEqual([
      expect.objectContaining({ amount_cents: 126080, currency: "EUR", spent_on: "2026-09-03", paid_by: "forwarder" }),
    ]);
  });

  it("moves the boat's oil change forward and flags the duplicate expense instead of saving it again", async () => {
    const c = set.cases.find((x) => x.id === "yard-invoice-already-recorded")!;
    const { plan } = await runFilingCase(set, c, standIn());
    expect(plan?.records.maintenance_done).toEqual([{ id: "oil", last_done_on: "2026-10-02", last_done_engine_hours: 1412 }]);
    expect(plan?.records.expenses).toEqual([]);
    expect(plan?.flags.map((f) => f.problem)).toContain("The boat already has an expense with this amount and date.");
  });

  it("fails a model that works out a value instead of copying it", async () => {
    // "1260.80" isn't printed on the invoice (it says 1.260,80): refused, so nothing is saved.
    const reformats = standIn((p) =>
      p.expenses[0]?.amount === "EUR    1.260,80" ? { ...p, expenses: [{ ...p.expenses[0], amount: "1260.80" }] } : p,
    );
    const results = await runFilingEval(set, reformats);
    expect(results.find((r) => r.id === "sail-loft-invoice-european")?.problems[0]).toContain("didn't save");
  });

  it("fails a model that makes up a date, and one that saves a non-expense", async () => {
    const guesses = standIn((p) =>
      p.document_type === "insurance"
        ? { ...p, renewals: [{ ...p.renewals[0]!, expires_on: "2027-05-01" }], expenses: [{ description: "Hull value", amount: "$85,000.00", currency: "USD", spent_on: "2026-04-14" }] }
        : p,
    );
    const result = (await runFilingEval(set, guesses)).find((r) => r.id === "insurance-certificate")!;
    expect(result.passed).toBe(false);
    expect(result.plan?.flags).toContainEqual(expect.objectContaining({ field: "expires_on", problem: "Not found in the document's text." }));
    expect(result.problems.some((p) => p.startsWith("saved something unexpected in expenses"))).toBe(true);
  });

  it("fails a model that calls the manual an invoice, and a document that wasn't filed", async () => {
    const c = set.cases.find((x) => x.id === "manual-excerpt")!;
    const result = await runFilingCase(set, c, standIn((p) => ({ ...p, document_type: "invoice" })));
    expect(result.problems).toEqual(["type invoice, expected manual"]);
    expect(gradeFiling(c, undefined, "timeout").problems).toEqual(["not filed: timeout"]);
  });
});
