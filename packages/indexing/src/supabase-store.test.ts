import { describe, expect, it } from "vitest";
import { SupabaseChunkStore, type SupabaseLike } from "./supabase-store";

type Call = [string, ...unknown[]];

// Records what the store asks of supabase-js, and answers like PostgREST would.
function fakeClient(answers: { insertError?: string; searchData?: unknown[] } = {}) {
  const calls: Call[] = [];
  const done = (error?: string) => Promise.resolve({ error: error ? { message: error } : null });
  const deleteQuery = (): ReturnType<ReturnType<SupabaseLike["from"]>["delete"]> =>
    Object.assign(done(), {
      eq(column: string, value: string) {
        calls.push(["eq", column, value]);
        return deleteQuery();
      },
    });
  const client: SupabaseLike = {
    from(table) {
      return {
        delete() {
          calls.push(["delete", table]);
          return deleteQuery();
        },
        insert(rows) {
          calls.push(["insert", table, rows]);
          return done(answers.insertError);
        },
      };
    },
    rpc(fn, args) {
      calls.push(["rpc", fn, args]);
      return Promise.resolve({ data: answers.searchData ?? [], error: null });
    },
  };
  return { client, calls };
}

const row = {
  boatId: "boat-1",
  documentId: "doc-1",
  page: 2,
  chunkIndex: 0,
  content: "6.3 Engine oil",
  embedding: [0.5, 0.25],
  embeddingModel: "voyage-4",
};

describe("SupabaseChunkStore", () => {
  it("removes the document's old chunks, then inserts the new ones as table rows", async () => {
    const { client, calls } = fakeClient();
    await new SupabaseChunkStore(client).replaceDocumentChunks({ id: "doc-1", boatId: "boat-1" }, [row]);
    expect(calls).toEqual([
      ["delete", "document_chunks"],
      ["eq", "document_id", "doc-1"],
      ["eq", "boat_id", "boat-1"],
      [
        "insert",
        "document_chunks",
        [
          {
            boat_id: "boat-1",
            document_id: "doc-1",
            page: 2,
            chunk_index: 0,
            content: "6.3 Engine oil",
            embedding: "[0.5,0.25]",
            embedding_model: "voyage-4",
          },
        ],
      ],
    ]);
  });

  it("reports a failed insert", async () => {
    const { client } = fakeClient({ insertError: "permission denied" });
    await expect(
      new SupabaseChunkStore(client).replaceDocumentChunks({ id: "doc-1", boatId: "boat-1" }, [row]),
    ).rejects.toThrow("Storing chunks failed: permission denied");
  });

  it("replaces a procedure's chunks without making it a document", async () => {
    const { client, calls } = fakeClient();
    await new SupabaseChunkStore(client).replaceProcedureChunks(
      { id: "procedure-1", boatId: "boat-1", title: "Pick up the mooring", updatedAt: "2026-10-22T00:00:00Z" },
      [
        {
          boatId: "boat-1",
          procedureId: "procedure-1",
          procedureTitle: "Pick up the mooring",
          procedureUpdatedAt: "2026-10-22T00:00:00Z",
          chunkIndex: 0,
          content: "Approach slowly.",
          embedding: [0.5, 0.25],
          embeddingModel: "voyage-4",
        },
      ],
    );
    expect(calls).toEqual([
      ["delete", "procedure_chunks"],
      ["eq", "procedure_id", "procedure-1"],
      ["eq", "boat_id", "boat-1"],
      [
        "insert",
        "procedure_chunks",
        [
          {
            boat_id: "boat-1",
            procedure_id: "procedure-1",
            chunk_index: 0,
            content: "Approach slowly.",
            embedding: "[0.5,0.25]",
            embedding_model: "voyage-4",
          },
        ],
      ],
    ]);
  });

  it("searches through search_document_chunks() and maps the rows", async () => {
    const { client, calls } = fakeClient({
      searchData: [
        {
          chunk_id: "c1",
          boat_id: "boat-1",
          source_type: "document",
          document_id: "doc-1",
          procedure_id: null,
          filename: "engine-manual.pdf",
          procedure_title: null,
          document_received_at: "2026-04-20T10:00:00+00:00",
          procedure_updated_at: null,
          page: 2,
          content: "6.3 Engine oil",
          indexed_at: "2026-10-19T08:00:00+00:00",
          similarity: 0.9,
        },
      ],
    });
    const results = await new SupabaseChunkStore(client).search([1, 0], "voyage-4", { matchCount: 500 });
    expect(calls).toEqual([
      ["rpc", "search_document_chunks", { query_embedding: "[1,0]", model: "voyage-4", match_count: 50 }],
    ]);
    expect(results).toEqual([
      {
        chunkId: "c1",
        boatId: "boat-1",
        sourceType: "document",
        documentId: "doc-1",
        procedureId: null,
        filename: "engine-manual.pdf",
        procedureTitle: null,
        documentReceivedAt: "2026-04-20T10:00:00+00:00",
        procedureUpdatedAt: null,
        page: 2,
        content: "6.3 Engine oil",
        indexedAt: "2026-10-19T08:00:00+00:00",
        similarity: 0.9,
      },
    ]);
  });

  it("maps procedure results with their title and last-edited date", async () => {
    const { client } = fakeClient({
      searchData: [
        {
          chunk_id: "p1",
          boat_id: "boat-1",
          source_type: "procedure",
          document_id: null,
          procedure_id: "procedure-1",
          filename: null,
          procedure_title: "Picking up our mooring",
          document_received_at: null,
          procedure_updated_at: "2026-10-20T12:00:00+00:00",
          page: null,
          content: "Approach slowly.",
          indexed_at: "2026-10-20T12:00:00+00:00",
          similarity: 0.9,
        },
      ],
    });
    const results = await new SupabaseChunkStore(client).search([1, 0], "voyage-4");
    expect(results).toEqual([
      {
        chunkId: "p1",
        boatId: "boat-1",
        sourceType: "procedure",
        documentId: null,
        procedureId: "procedure-1",
        filename: null,
        procedureTitle: "Picking up our mooring",
        documentReceivedAt: null,
        procedureUpdatedAt: "2026-10-20T12:00:00+00:00",
        page: null,
        content: "Approach slowly.",
        indexedAt: "2026-10-20T12:00:00+00:00",
        similarity: 0.9,
      },
    ]);
  });
});
