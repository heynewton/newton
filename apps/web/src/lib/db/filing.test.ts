import type { SavedFiling } from "@newton/agent";
import { describe, expect, it } from "vitest";
import { SupabaseFilingStore } from "./filing";

// Filing's database side with supabase-js stood in for: what it reads for a document, and what
// it hands `save_document_filing()`. The SQL itself is tested in supabase/tests/database.

type Result = { data: unknown; error: { message: string } | null };

function fakeClient(tables: Record<string, unknown>, rpcResults: Record<string, Result> = {}) {
  const calls: { what: string; args: unknown[] }[] = [];
  const query = (table: string) => {
    const result = (): Result => ({ data: tables[table] ?? null, error: null });
    const builder = {
      select: (...args: unknown[]) => (calls.push({ what: `${table}.select`, args }), builder),
      eq: (...args: unknown[]) => (calls.push({ what: `${table}.eq`, args }), builder),
      order: () => builder,
      maybeSingle: async () => result(),
      then: (resolve: (r: Result) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return builder;
  };
  const client = {
    from: query,
    rpc: async (fn: string, args: unknown) => (calls.push({ what: `rpc.${fn}`, args: [args] }), rpcResults[fn] ?? { data: null, error: null }),
    storage: {
      from: () => ({
        download: async (path: string) => (calls.push({ what: "download", args: [path] }), { data: new Blob([new Uint8Array([7, 8])]), error: null }),
      }),
    },
  };
  return { client: client as unknown as ConstructorParameters<typeof SupabaseFilingStore>[0], calls };
}

const document = {
  boat_id: "boat-1",
  storage_path: "boat-1/email/m/1-invoice.pdf",
  filename: "invoice.pdf",
  content_type: "application/pdf",
  type: "unsorted",
  added_by: null,
  inbound_email_id: "mail-1",
};

describe("SupabaseFilingStore", () => {
  it("loads the file, the email's subject and sender, and the boat's records", async () => {
    const { client, calls } = fakeClient({
      document_filings: null,
      documents: document,
      inbound_emails: { subject: "Fwd: invoice", sender_person_id: "sam" },
      maintenance_items: [
        { id: "m1", title: "Oil", last_done_on: "2025-10-01", last_done_engine_hours: 1300, every_months: 12, every_engine_hours: 100 },
      ],
      renewals: [{ kind: "insurance", expires_on: "2027-04-30" }],
      expenses: [{ amount_cents: 100, currency: "USD", spent_on: "2026-01-01" }],
    });
    const loaded = await new SupabaseFilingStore(client).load("doc-1");
    expect(loaded?.file).toEqual({ filename: "invoice.pdf", contentType: "application/pdf", content: new Uint8Array([7, 8]) });
    expect(loaded?.context).toEqual({
      filename: "invoice.pdf",
      emailSubject: "Fwd: invoice",
      payerId: "sam",
      maintenance: [{ id: "m1", title: "Oil", lastDoneOn: "2025-10-01", lastDoneEngineHours: 1300, everyMonths: 12, everyEngineHours: 100 }],
      renewals: [{ kind: "insurance", expiresOn: "2027-04-30" }],
      expenses: [{ amountCents: 100, currency: "USD", spentOn: "2026-01-01" }],
    });
    // Every read of records is limited to the document's boat.
    for (const table of ["maintenance_items", "renewals", "expenses"]) {
      expect(calls).toContainEqual({ what: `${table}.eq`, args: ["boat_id", "boat-1"] });
    }
    expect(calls).toContainEqual({ what: "download", args: ["boat-1/email/m/1-invoice.pdf"] });
  });

  it("has nothing to load for a filed document, or one a person already sorted", async () => {
    expect(await new SupabaseFilingStore(fakeClient({ document_filings: { status: "filed" }, documents: document }).client).load("d")).toBeNull();
    expect(await new SupabaseFilingStore(fakeClient({ documents: { ...document, type: "invoice" } }).client).load("d")).toBeNull();
    expect(await new SupabaseFilingStore(fakeClient({ documents: null }).client).load("d")).toBeNull();
  });

  it("reloads a document whose filing failed", async () => {
    const { client } = fakeClient({ document_filings: { status: "failed" }, documents: { ...document, inbound_email_id: null, added_by: "ada" } });
    expect((await new SupabaseFilingStore(client).load("d"))?.context).toMatchObject({ emailSubject: null, payerId: "ada" });
  });

  it("saves the plan through save_document_filing", async () => {
    const { client, calls } = fakeClient({}, { save_document_filing: { data: [{ filing_id: "f", already_filed: true }], error: null } });
    const filing: SavedFiling = {
      model: "stand-in",
      proposal: null,
      plan: {
        status: "needs_review",
        documentType: null,
        confidence: null,
        summary: null,
        vendor: null,
        flags: [{ record: "document", field: null, value: null, problem: "x" }],
        records: { renewals: [], expenses: [], maintenance_new: [], maintenance_done: [] },
        skipped: [],
      },
    };
    expect(await new SupabaseFilingStore(client).save("d", filing)).toEqual({ alreadyFiled: true });
    expect(calls.find((c) => c.what === "rpc.save_document_filing")?.args[0]).toEqual({
      document_id: "d",
      status: "needs_review",
      document_type: null,
      confidence: null,
      summary: null,
      vendor: null,
      proposal: null,
      flags: filing.plan.flags,
      model: "stand-in",
      records: filing.plan.records,
    });
  });

  it("throws on a database error, so the run can retry later", async () => {
    const { client } = fakeClient({}, { documents_to_file: { data: null, error: { message: "permission denied" } } });
    await expect(new SupabaseFilingStore(client).waiting(3, 20)).rejects.toThrow("documents_to_file: permission denied");
  });
});
