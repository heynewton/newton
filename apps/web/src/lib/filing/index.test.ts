import type { FilingModel, FilingProposal, SavedFiling } from "@newton/agent";
import { describe, expect, it } from "vitest";
import { fileDocuments, fileEmail, fileWaiting, MAX_ATTEMPTS, SWEEP_LIMIT, type FilingDeps } from "./index";

const proposal: FilingProposal = {
  document_type: "receipt",
  confidence: "high",
  summary: "Chandlery receipt.",
  vendor: "Example Chandlery",
  decimal_separator: ".",
  date_order: "YMD",
  renewals: [],
  expenses: [{ description: "Fenders", amount: "USD 42.00", currency: "USD", spent_on: "2026-10-01" }],
  maintenance: [],
};

// A store with a few documents of one email, as the database would hold them.
function deps(options: { brokenLoad?: string } = {}) {
  const saved = new Map<string, SavedFiling>();
  const asked: string[] = [];
  const store: FilingDeps["store"] = {
    async load(id) {
      if (id === options.brokenLoad) throw new Error("storage unavailable");
      if (saved.has(id)) return null;
      return {
        file: { filename: `${id}.pdf`, contentType: "application/pdf", content: new Uint8Array([1]) },
        context: { filename: `${id}.pdf`, emailSubject: null, payerId: "sam", maintenance: [], renewals: [], expenses: [] },
      };
    },
    async save(id, filing) {
      if (saved.has(id)) return { alreadyFiled: true };
      saved.set(id, filing);
      return { alreadyFiled: false };
    },
    async fail() {},
    async documentsOfEmail(inboundEmailId) {
      asked.push(`email ${inboundEmailId}`);
      return ["a", "b"];
    },
    async waiting(maxAttempts, limit) {
      asked.push(`waiting ${maxAttempts} ${limit}`);
      return ["c"];
    },
  };
  const model: FilingModel = { model: "stand-in", propose: async () => proposal };
  const extractText = async () => "Fenders USD 42.00 paid 2026-10-01";
  return { deps: { store, model, extractText }, saved, asked };
}

describe("filing runs", () => {
  it("files the documents an email just stored", async () => {
    const { deps: d, saved, asked } = deps();
    expect(await fileEmail("mail-1", d)).toEqual([
      { documentId: "a", outcome: "filed" },
      { documentId: "b", outcome: "filed" },
    ]);
    expect(asked).toEqual(["email mail-1"]);
    expect(saved.get("a")?.plan.records.expenses[0]).toMatchObject({ amount_cents: 4200, currency: "USD", paid_by: "sam" });
  });

  it("files what is waiting, up to the limit, and doesn't file anything twice", async () => {
    const { deps: d, asked } = deps();
    expect(await fileWaiting(d)).toEqual([{ documentId: "c", outcome: "filed" }]);
    expect(asked).toEqual([`waiting ${MAX_ATTEMPTS} ${SWEEP_LIMIT}`]);
    expect(await fileWaiting(d)).toEqual([{ documentId: "c", outcome: "already_filed" }]);
  });

  it("carries on after one document's database error", async () => {
    const { deps: d } = deps({ brokenLoad: "a" });
    expect(await fileDocuments(["a", "b"], d)).toEqual([
      { documentId: "a", outcome: "failed", error: "storage unavailable" },
      { documentId: "b", outcome: "filed" },
    ]);
  });
});
