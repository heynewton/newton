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

  it("searches through search_document_chunks() and maps the rows", async () => {
    const { client, calls } = fakeClient({
      searchData: [
        {
          chunk_id: "c1",
          boat_id: "boat-1",
          document_id: "doc-1",
          filename: "engine-manual.pdf",
          document_received_at: "2026-04-20T10:00:00+00:00",
          page: 2,
          content: "6.3 Engine oil",
          indexed_at: "2026-10-19T08:00:00+00:00",
          similarity: 0.9,
        },
      ],
    });
    const results = await new SupabaseChunkStore(client).search([1, 0], "voyage-4", { matchCount: 500 });
    expect(calls).toEqual([
      ["rpc", "search_document_chunks", { query_embedding: "[1,0]", model: "voyage-4", match_count: 50, only_boat_id: null }],
    ]);
    expect(results).toEqual([
      {
        chunkId: "c1",
        boatId: "boat-1",
        documentId: "doc-1",
        filename: "engine-manual.pdf",
        documentReceivedAt: "2026-04-20T10:00:00+00:00",
        page: 2,
        content: "6.3 Engine oil",
        indexedAt: "2026-10-19T08:00:00+00:00",
        similarity: 0.9,
      },
    ]);
  });
});
