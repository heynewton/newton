import type { ChunkRow, ChunkStore, DocumentRef, SearchOptions, SearchResult } from "./store";
import { clampMatchCount } from "./store";

interface Result {
  error: { message: string } | null;
}

interface DeleteQuery extends PromiseLike<Result> {
  eq(column: string, value: string): DeleteQuery;
}

/**
 * The part of a supabase-js client this store uses, so the package needn't depend on it. Pass a
 * service-role client from the indexing job, or a signed-in person's client to search as them.
 */
export interface SupabaseLike {
  from(table: "document_chunks"): {
    delete(): DeleteQuery;
    insert(rows: Record<string, unknown>[]): PromiseLike<Result>;
  };
  rpc(fn: "search_document_chunks", args: Record<string, unknown>): PromiseLike<Result & { data: unknown }>;
}

interface SearchRow {
  chunk_id: string;
  boat_id: string;
  document_id: string;
  filename: string | null;
  document_received_at: string | null;
  page: number;
  content: string;
  indexed_at: string | null;
  similarity: number;
}

// pgvector's text form, which PostgREST passes through to a vector column or argument.
const toVector = (embedding: number[]) => `[${embedding.join(",")}]`;

/** Keeps chunks in `document_chunks` and searches with `search_document_chunks()`. */
export class SupabaseChunkStore implements ChunkStore {
  constructor(private readonly client: SupabaseLike) {}

  // Not one transaction: if the insert fails, the document has no chunks until it is indexed
  // again, which is safe (search finds nothing) and fixed by re-running.
  async replaceDocumentChunks(document: DocumentRef, rows: ChunkRow[]): Promise<void> {
    const removed = await this.client
      .from("document_chunks")
      .delete()
      .eq("document_id", document.id)
      .eq("boat_id", document.boatId);
    if (removed.error) throw new Error(`Removing old chunks failed: ${removed.error.message}`);
    if (rows.length === 0) return;
    const added = await this.client.from("document_chunks").insert(
      rows.map((row) => ({
        boat_id: row.boatId,
        document_id: row.documentId,
        page: row.page,
        chunk_index: row.chunkIndex,
        content: row.content,
        embedding: toVector(row.embedding),
        embedding_model: row.embeddingModel,
      })),
    );
    if (added.error) throw new Error(`Storing chunks failed: ${added.error.message}`);
  }

  async search(embedding: number[], model: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const { data, error } = await this.client.rpc("search_document_chunks", {
      query_embedding: toVector(embedding),
      model,
      match_count: clampMatchCount(options.matchCount),
      only_boat_id: options.boatId ?? null,
    });
    if (error) throw new Error(`Search failed: ${error.message}`);
    return ((data ?? []) as SearchRow[]).map((row) => ({
      chunkId: row.chunk_id,
      boatId: row.boat_id,
      documentId: row.document_id,
      filename: row.filename,
      documentReceivedAt: row.document_received_at,
      page: row.page,
      content: row.content,
      indexedAt: row.indexed_at,
      similarity: row.similarity,
    }));
  }
}
