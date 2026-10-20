import { describe, expect, it } from "vitest";
import {
  buildFilingPrompt,
  checkProposal,
  fileDocument,
  printedIn,
  readableKind,
  type FilingContext,
  type FilingModel,
  type FilingProposal,
  type FilingStore,
  type SavedFiling,
} from "./filing";

const text = `EXAMPLE YARD  Invoice date: 02.10.2026   Engine hours: 1.412
Antifouling and oil change. TOTAL EUR 1.234,56  Next oil change at 1.512 h or 02.10.2027.
Insurance policy POL-9 valid until 30.04.2027.`;

const context: FilingContext = {
  filename: "invoice.pdf",
  emailSubject: "Fwd: invoice",
  payerId: "sam",
  maintenance: [],
  renewals: [],
  expenses: [],
};

function proposal(change: Partial<FilingProposal> = {}): FilingProposal {
  return {
    document_type: "invoice",
    confidence: "high",
    summary: "Yard invoice.",
    vendor: "EXAMPLE YARD",
    decimal_separator: ",",
    date_order: "DMY",
    renewals: [],
    expenses: [{ description: "Antifouling and oil change", amount: "EUR 1.234,56", currency: "EUR", spent_on: "02.10.2026" }],
    maintenance: [],
    ...change,
  };
}

const oilChange = {
  title: "Engine oil and filter",
  done_on: "02.10.2026",
  engine_hours: "1.412",
  next_due_on: "02.10.2027",
  next_due_engine_hours: "1.512 h",
  existing_item: null,
};

describe("checkProposal", () => {
  it("saves an expense with the amount and date read by calc, paid by the person who forwarded it", () => {
    const plan = checkProposal(proposal(), context, text);
    expect(plan.status).toBe("filed");
    expect(plan.flags).toEqual([]);
    expect(plan.records.expenses).toEqual([
      { description: "Antifouling and oil change", amount_cents: 123456, currency: "EUR", spent_on: "2026-10-02", paid_by: "sam", notes: null },
    ]);
  });

  it("saves a renewal and a new maintenance item with an interval worked out from the next due date and hours", () => {
    const plan = checkProposal(
      proposal({
        expenses: [],
        renewals: [{ kind: "insurance", title: "Insurance", reference: "POL-9", expires_on: "30.04.2027" }],
        maintenance: [oilChange],
      }),
      context,
      text,
    );
    expect(plan.flags).toEqual([]);
    expect(plan.records.renewals).toEqual([{ kind: "insurance", title: "Insurance", reference: "POL-9", expires_on: "2027-04-30", notes: null }]);
    expect(plan.records.maintenance_new).toEqual([
      { title: "Engine oil and filter", every_months: 12, every_engine_hours: 100, last_done_on: "2026-10-02", last_done_engine_hours: 1412, notes: null },
    ]);
  });

  it("saves nothing from a low-confidence answer", () => {
    const plan = checkProposal(proposal({ confidence: "low" }), context, text);
    expect(plan.status).toBe("needs_review");
    expect(plan.records.expenses).toEqual([]);
    expect(plan.flags).toEqual([expect.objectContaining({ record: "document", field: "confidence" })]);
  });

  it("saves nothing from an image unless Claude was sure, since its values can't be checked", () => {
    expect(checkProposal(proposal({ confidence: "medium" }), context, null).records.expenses).toEqual([]);
    expect(checkProposal(proposal({ confidence: "high" }), context, null).records.expenses).toHaveLength(1);
    expect(checkProposal(proposal({ confidence: "medium", expenses: [] }), context, null).status).toBe("filed");
  });

  it.each([
    ["an amount not printed on the document", { amount: "EUR 1234.56" }, "amount", "Not found in the document's text."],
    ["an amount written against the document's decimal separator", { amount: "1.234,56" }, "amount", 'uses "."'],
    ["a date that isn't there", { spent_on: "2026-10-02" }, "spent_on", "Not found"],
    ["no date", { spent_on: null }, "spent_on", "Not on the document."],
    ["a currency the amount contradicts", { currency: "USD" }, "currency", "printed in EUR"],
    ["a currency that isn't a code", { currency: "euros" }, "currency", "ISO 4217"],
    ["no description", { description: "  " }, "description", "No description."],
  ] as const)("flags %s instead of saving it", (_name, change, field, problem) => {
    // Claude says this document writes decimals with "." (it doesn't), so calc refuses 1.234,56.
    const decimal = problem === 'uses "."' ? { decimal_separator: "." as const } : {};
    const plan = checkProposal(proposal({ ...decimal, expenses: [{ ...proposal().expenses[0]!, ...change }] }), context, text);
    expect(plan.status).toBe("needs_review");
    expect(plan.records.expenses).toEqual([]);
    expect(plan.flags).toContainEqual(expect.objectContaining({ record: "expense 1", field }));
    expect(plan.flags.find((f) => f.field === field)?.problem).toContain(problem);
  });

  it("flags a date that could be either way round when the document's order isn't known", () => {
    const plan = checkProposal(proposal({ date_order: null }), context, text);
    expect(plan.flags[0]).toMatchObject({ field: "spent_on", value: "02.10.2026" });
    expect(plan.flags[0]!.problem).toContain("either way round");
  });

  it("flags a dollar amount in a currency that isn't written with $, and a currency the document doesn't show", () => {
    const dollars = "Total $50.00";
    const yen = checkProposal(
      proposal({ decimal_separator: ".", date_order: null, expenses: [{ description: "x", amount: "$50.00", currency: "EUR", spent_on: null }] }),
      context,
      dollars,
    );
    expect(yen.flags.map((f) => f.problem)).toContain("The amount is printed with $.");
    const gbp = checkProposal(
      proposal({ decimal_separator: ".", expenses: [{ description: "x", amount: "50.00", currency: "GBP", spent_on: "02.10.2026" }] }),
      context,
      "Total 50.00 on 02.10.2026",
    );
    expect(gbp.flags.map((f) => f.problem)).toContain("The document doesn't show this currency.");
  });

  it("flags an expense when nobody is known to have paid it", () => {
    const plan = checkProposal(proposal(), { ...context, payerId: null }, text);
    expect(plan.flags).toEqual([expect.objectContaining({ field: "paid_by" })]);
  });

  it("flags an expense the boat already has, and skips a renewal it already has", () => {
    const plan = checkProposal(
      proposal({ renewals: [{ kind: "insurance", title: "Insurance", reference: "POL-9", expires_on: "30.04.2027" }] }),
      { ...context, expenses: [{ amountCents: 123456, currency: "EUR", spentOn: "2026-10-02" }], renewals: [{ kind: "insurance", expiresOn: "2027-04-30" }] },
      text,
    );
    expect(plan.records.expenses).toEqual([]);
    expect(plan.records.renewals).toEqual([]);
    expect(plan.flags.map((f) => f.problem)).toEqual(["The boat already has an expense with this amount and date."]);
    expect(plan.skipped).toEqual(["renewal 1: the boat already has a insurance renewal expiring 2027-04-30"]);
  });

  it("flags a renewal whose reference isn't on the document", () => {
    const plan = checkProposal(
      proposal({ expenses: [], renewals: [{ kind: "insurance", title: "Insurance", reference: "POL-10", expires_on: "30.04.2027" }] }),
      context,
      text,
    );
    expect(plan.flags).toEqual([expect.objectContaining({ record: "renewal 1", field: "reference" })]);
  });

  describe("maintenance", () => {
    const existing = {
      id: "oil",
      title: "Oil and filter",
      lastDoneOn: "2025-10-01",
      lastDoneEngineHours: 1312,
      everyMonths: 12,
      everyEngineHours: 100,
    };

    it("moves an existing item forward when the document says it was done again", () => {
      const plan = checkProposal(
        proposal({ expenses: [], maintenance: [{ ...oilChange, existing_item: 1 }] }),
        { ...context, maintenance: [existing] },
        text,
      );
      expect(plan.records.maintenance_done).toEqual([{ id: "oil", last_done_on: "2026-10-02", last_done_engine_hours: 1412 }]);
      expect(plan.records.maintenance_new).toEqual([]);
    });

    it("skips an item already done more recently, and flags one due by hours without a reading", () => {
      const later = checkProposal(
        proposal({ expenses: [], maintenance: [{ ...oilChange, existing_item: 1 }] }),
        { ...context, maintenance: [{ ...existing, lastDoneOn: "2026-10-05" }] },
        text,
      );
      expect(later.records.maintenance_done).toEqual([]);
      expect(later.skipped).toHaveLength(1);
      const noHours = checkProposal(
        proposal({ expenses: [], maintenance: [{ ...oilChange, engine_hours: null, existing_item: 1 }] }),
        { ...context, maintenance: [existing] },
        text,
      );
      expect(noHours.flags).toEqual([expect.objectContaining({ field: "engine_hours" })]);
    });

    it("flags an item number that isn't one of the boat's", () => {
      const plan = checkProposal(proposal({ expenses: [], maintenance: [{ ...oilChange, existing_item: 3 }] }), context, text);
      expect(plan.flags).toEqual([expect.objectContaining({ field: "existing_item", value: "3" })]);
    });

    it("flags a new item with no next due date or hours, since it can't have an interval", () => {
      const plan = checkProposal(
        proposal({ expenses: [], maintenance: [{ ...oilChange, next_due_on: null, next_due_engine_hours: null }] }),
        context,
        text,
      );
      expect(plan.records.maintenance_new).toEqual([]);
      expect(plan.flags[0]!.problem).toContain("can't set an interval");
    });

    it("flags next-due hours without a reading when done", () => {
      const plan = checkProposal(
        proposal({ expenses: [], maintenance: [{ ...oilChange, engine_hours: null, next_due_on: null }] }),
        context,
        text,
      );
      expect(plan.flags).toEqual([expect.objectContaining({ field: "next_due_engine_hours" })]);
    });

    it("keeps a months-only interval", () => {
      const plan = checkProposal(
        proposal({ expenses: [], maintenance: [{ ...oilChange, engine_hours: null, next_due_engine_hours: null }] }),
        context,
        text,
      );
      expect(plan.records.maintenance_new[0]).toMatchObject({ every_months: 12, every_engine_hours: null, last_done_engine_hours: null });
    });
  });
});

describe("printedIn", () => {
  it("ignores spacing and case, nothing else", () => {
    expect(printedIn("EUR 1.234,56", "total eur   1.234,56")).toBe(true);
    expect(printedIn("EUR1.234,56", "TOTAL EUR 1.234,56")).toBe(true);
    expect(printedIn("1234,56", "TOTAL EUR 1.234,56")).toBe(false);
  });
});

describe("readableKind", () => {
  it.each([
    ["application/pdf", "a.pdf", "pdf"],
    ["application/octet-stream", "scan.PDF", "pdf"],
    ["image/jpeg", "photo.jpg", "image"],
    ["image/heic", "photo.heic", null],
    ["text/plain; charset=utf-8", "notes.txt", "text"],
    ["message/rfc822", "mail.eml", null],
    ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "a.docx", null],
  ])("%s (%s) is %s", (contentType, filename, kind) => {
    expect(readableKind({ contentType, filename })).toBe(kind);
  });
});

describe("buildFilingPrompt", () => {
  it("names the file and subject and numbers the boat's maintenance items", () => {
    const prompt = buildFilingPrompt({
      ...context,
      maintenance: [{ id: "a", title: "Oil and filter", lastDoneOn: "2025-10-01", lastDoneEngineHours: null, everyMonths: 12, everyEngineHours: null }],
    });
    expect(prompt).toContain("File name: invoice.pdf");
    expect(prompt).toContain("Email subject: Fwd: invoice");
    expect(prompt).toContain("1. Oil and filter (last done 2025-10-01)");
    expect(buildFilingPrompt(context)).toContain("None yet.");
  });
});

describe("fileDocument", () => {
  function store(file = { filename: "invoice.pdf", contentType: "application/pdf", content: new Uint8Array([1]) }) {
    const saved: SavedFiling[] = [];
    const failures: string[] = [];
    const s: FilingStore = {
      async load() {
        return saved.length ? null : { file, context };
      },
      async save(_id, filing) {
        saved.push(filing);
        return { alreadyFiled: false };
      },
      async fail(_id, error) {
        failures.push(error);
      },
    };
    return { s, saved, failures };
  }
  const model = (reply: () => Promise<FilingProposal | null>): FilingModel => ({ model: "stand-in", propose: reply });
  const extractText = async () => text;

  it("reads, checks and saves once; a second run is a no-op", async () => {
    const { s, saved } = store();
    let calls = 0;
    const m = model(async () => (calls++, proposal()));
    expect((await fileDocument({ documentId: "d", store: s, model: m, extractText })).outcome).toBe("filed");
    expect((await fileDocument({ documentId: "d", store: s, model: m, extractText })).outcome).toBe("already_filed");
    expect(calls).toBe(1);
    expect(saved[0]).toMatchObject({ model: "stand-in", proposal: proposal(), plan: { status: "filed" } });
  });

  it("records a failure when the model can't be reached, without throwing", async () => {
    const { s, saved, failures } = store();
    const result = await fileDocument({ documentId: "d", store: s, model: model(async () => { throw new Error("overloaded"); }), extractText });
    expect(result).toEqual({ documentId: "d", outcome: "failed", error: "overloaded" });
    expect(failures).toEqual(["overloaded"]);
    expect(saved).toEqual([]);
  });

  it("flags a refusal, a file Claude can't read and a file too large, without guessing", async () => {
    const refused = store();
    expect((await fileDocument({ documentId: "d", store: refused.s, model: model(async () => null), extractText })).outcome).toBe("needs_review");
    expect(refused.saved[0]!.plan.flags[0]!.problem).toContain("declined");

    const word = store({ filename: "a.docx", contentType: "application/msword", content: new Uint8Array([1]) });
    const never = model(async () => { throw new Error("should not be called"); });
    expect((await fileDocument({ documentId: "d", store: word.s, model: never, extractText })).outcome).toBe("needs_review");
    expect(word.saved[0]!.plan.flags[0]!.problem).toContain("can't read application/msword");

    const huge = store({ filename: "a.pdf", contentType: "application/pdf", content: new Uint8Array(21 * 1024 * 1024) });
    expect((await fileDocument({ documentId: "d", store: huge.s, model: never, extractText })).outcome).toBe("needs_review");
  });

  it("treats a PDF without a text layer like an image", async () => {
    const { s, saved } = store();
    await fileDocument({ documentId: "d", store: s, model: model(async () => proposal({ confidence: "medium" })), extractText: async () => "  \n " });
    expect(saved[0]!.plan.records.expenses).toEqual([]);
    expect(saved[0]!.plan.flags[0]!.problem).toContain("no text to check");
  });
});
