import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EMBEDDING_DIMENSIONS, type Embedder } from "./embedder";
import { FakeEmbedder } from "./fake-embedder";
import { indexDocument, indexProcedure, searchChunks, shouldIndex } from "./index-document";
import { extractPages } from "./pdf";
import { MemoryChunkStore } from "./store";

// The sample boat's engine manual excerpt: two PDF pages, 6.1-6.2 on the first, 6.3-6.5 on the
// second (fixtures/sample-boat/documents/manual-excerpt.txt).
const manual = new Uint8Array(
  readFileSync(new URL("../../../fixtures/sample-boat/documents/manual-excerpt.pdf", import.meta.url)),
);
const testBoat = { id: "manual-1", boatId: "test-boat" };

async function indexed(maxChars?: number) {
  const store = new MemoryChunkStore();
  const embedder = new FakeEmbedder();
  const result = await indexDocument({ document: testBoat, pdf: manual, embedder, store, maxChars });
  return { store, embedder, result };
}

describe("extractPages", () => {
  it("reads the fixture manual's text page by page", async () => {
    const pages = await extractPages(manual);
    expect(pages.map((p) => p.page)).toEqual([1, 2]);
    expect(pages[0]?.text).toContain("6.2 Maintenance schedule");
    expect(pages[0]?.text).not.toContain("6.3 Engine oil");
    expect(pages[1]?.text).toContain("Capacity with filter: 4.8 quarts (4.5 liters).");
  });
});

describe("indexDocument on the fixture manual", () => {
  it("keeps page numbers through chunking", async () => {
    const { store, result } = await indexed(400);
    expect(result).toEqual({ pages: 2, pagesWithoutText: [], chunks: store.rows.length });
    expect(store.rows.length).toBeGreaterThan(2);

    const pageOf = (text: string) => {
      const row = store.rows.find((candidate) => candidate.content.includes(text));
      return row && "page" in row ? row.page : undefined;
    };
    expect(pageOf("6.1 General")).toBe(1);
    expect(pageOf("Zinc anodes in heat exchanger")).toBe(1);
    expect(pageOf("6.3 Engine oil")).toBe(2);
    expect(pageOf("Running the pump dry for more than 30 seconds")).toBe(2);
    expect(pageOf("6.5 Winter lay-up")).toBe(2);

    expect(store.rows.map((row) => row.chunkIndex)).toEqual(store.rows.map((_, i) => i));
    for (const row of store.rows) {
      expect(row.content.length).toBeLessThanOrEqual(400);
      expect(row.embedding).toHaveLength(EMBEDDING_DIMENSIONS);
      expect(row).toMatchObject({ boatId: "test-boat", documentId: "manual-1", embeddingModel: "fake-bag-of-words" });
    }
  });

  it("finds the oil capacity on page 2 for a question about it", async () => {
    const { store, embedder } = await indexed(400);
    const [best] = await searchChunks({ question: "What is the engine oil capacity with filter?", embedder, store });
    expect(best?.page).toBe(2);
    expect(best?.content).toContain("Capacity with filter: 4.8 quarts (4.5 liters).");
  });

  it("finds the impeller warning for a question in other words", async () => {
    const { store, embedder } = await indexed(400);
    const [best] = await searchChunks({ question: "Can the raw-water pump run dry?", embedder, store, matchCount: 1 });
    expect(best?.page).toBe(2);
    expect(best?.content).toContain("6.4 Raw-water impeller");
  });

  it("replaces a document's chunks when indexed again, leaving other documents alone", async () => {
    const { store, embedder } = await indexed(400);
    const other = { id: "manual-2", boatId: "test-boat" };
    await indexDocument({ document: other, pdf: manual, embedder, store });
    const before = store.rows.length;

    await indexDocument({ document: testBoat, pdf: manual, embedder, store, maxChars: 400 });
    expect(store.rows.length).toBe(before);
    expect(store.rows.filter((row) => "documentId" in row && row.documentId === "manual-2").length).toBeGreaterThan(0);
  });

  it("only searches chunks made by the same model", async () => {
    const { store } = await indexed();
    const otherModel: Embedder = { model: "another-model", embed: new FakeEmbedder().embed };
    expect(await searchChunks({ question: "engine oil", embedder: otherModel, store })).toEqual([]);
  });

  it("refuses an embedder that returns the wrong size", async () => {
    const broken: Embedder = { model: "broken", embed: async (texts) => texts.map(() => [1, 2, 3]) };
    await expect(
      indexDocument({ document: testBoat, pdf: manual, embedder: broken, store: new MemoryChunkStore() }),
    ).rejects.toThrow(/1024 numbers/);
  });

  it("indexes a procedure with a source title and edit time, and replaces it on edit", async () => {
    const store = new MemoryChunkStore();
    const embedder = new FakeEmbedder();
    const procedure = {
      id: "procedure-1",
      boatId: "test-boat",
      title: "Picking up our mooring",
      updatedAt: "2026-10-20T12:00:00Z",
    };
    const result = await indexProcedure({
      procedure,
      content: "Approach slowly from downwind; use the boathook to lift the pickup line.",
      embedder,
      store,
    });
    expect(result).toEqual({ pages: 1, pagesWithoutText: [], chunks: 1 });
    const [hit] = await searchChunks({ question: "How do we pick up our mooring?", embedder, store, boatId: "test-boat" });
    expect(hit).toMatchObject({
      sourceType: "procedure",
      procedureId: "procedure-1",
      procedureTitle: "Picking up our mooring",
      procedureUpdatedAt: "2026-10-20T12:00:00Z",
      page: null,
      content: expect.stringContaining("boathook"),
    });

    await indexProcedure({
      procedure: { ...procedure, updatedAt: "2026-10-21T12:00:00Z" },
      content: "Updated: approach from up-current.",
      embedder,
      store,
    });
    expect(store.rows.filter((row) => "procedureId" in row && row.procedureId === "procedure-1")).toHaveLength(1);
    expect(store.rows.some((row) => row.content.includes("boathook"))).toBe(false);
  });
});

describe("shouldIndex", () => {
  it("indexes manuals and nothing else", () => {
    expect(shouldIndex({ type: "manual", contentType: "application/pdf" })).toBe(true);
    expect(shouldIndex({ type: "invoice", contentType: "application/pdf" })).toBe(false);
    expect(shouldIndex({ type: "unsorted" })).toBe(false);
    expect(shouldIndex({ type: "manual", contentType: "image/jpeg" })).toBe(false);
  });
});
