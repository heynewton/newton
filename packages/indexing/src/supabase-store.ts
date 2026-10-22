import type {
  ChunkStore,
  DocumentChunkRow,
  DocumentRef,
  ProcedureChunkRow,
  ProcedureRef,
  SearchOptions,
  SearchResult,
} from "./store";
import { clampMatchCount } from "./store";

interface Result {
  error: { message: string } | null;
}

interface DeleteQuery extends PromiseLike<Result> {
  eq(column: string, value: string): DeleteQuery;
}

interface ChunkInsert {
  boat_id: string;
  document_id: string;
  page: number;
  chunk_index: number;
  content: string;
  embedding: string;
  embedding_model: string;
}

/**
 * The part of a supabase-js client this store uses, so the package needn't depend on it. Pass a
 * service-role client from the indexing job, or a signed-in person's client to search as them.
 */
export interface SupabaseLike {
  from(table: "document_chunks" | "procedure_chunks"): {
    delete(): DeleteQuery;
    insert(rows: ChunkInsert[]): PromiseLike<Result>;
  };
  rpc(
    fn: "search_document_chunks",
    args: {
      query_embedding: string;
      model: string;
      match_count: number;
      only_boat_id?: string;
    },
  ): PromiseLike<Result & { data: unknown }>;
}

interface SearchRow {
  chunk_id: string;
  boat_id: string;
  source_type: "document" | "procedure";
  document_id: string | null;
  procedure_id: string | null;
  filename: string | null;
  procedure_title: string | null;
  document_received_at: string | null;
  procedure_updated_at: string | null;
  page: number | null;
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
  async replaceDocumentChunks(document: DocumentRef, rows: DocumentChunkRow[]): Promise<void> {
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

  async replaceProcedureChunks(procedure: ProcedureRef, rows: ProcedureChunkRow[]): Promise<void> {
    const removed = await this.client
      .from("procedure_chunks")
      .delete()
      .eq("procedure_id", procedure.id)
      .eq("boat_id", procedure.boatId);
    if (removed.error) throw new Error(`Removing old procedure chunks failed: ${removed.error.message}`);
    if (rows.length === 0) return;
    const added = await this.client.from("procedure_chunks").insert(
      rows.map((row) => ({
        boat_id: row.boatId,
        procedure_id: row.procedureId,
        chunk_index: row.chunkIndex,
        content: row.content,
        embedding: toVector(row.embedding),
        embedding_model: row.embeddingModel,
      })),
    );
    if (added.error) throw new Error(`Storing procedure chunks failed: ${added.error.message}`);
  }

  async search(embedding: number[], model: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const { data, error } = await this.client.rpc("search_document_chunks", {
      query_embedding: toVector(embedding),
      model,
      match_count: clampMatchCount(options.matchCount),
      ...(options.boatId ? { only_boat_id: options.boatId } : {}),
    });
    if (error) throw new Error(`Search failed: ${error.message}`);
    return ((data ?? []) as SearchRow[]).map((row): SearchResult => {
      const common = {
        chunkId: row.chunk_id,
        boatId: row.boat_id,
        content: row.content,
        indexedAt: row.indexed_at,
        similarity: row.similarity,
      };
      if (
        row.source_type === "document" &&
        row.document_id !== null &&
        row.page !== null &&
        row.procedure_id === null &&
        row.procedure_title === null &&
        row.procedure_updated_at === null
      ) {
        return {
          ...common,
          sourceType: "document",
          documentId: row.document_id,
          filename: row.filename,
          documentReceivedAt: row.document_received_at,
          page: row.page,
          procedureId: null,
          procedureTitle: null,
          procedureUpdatedAt: null,
        };
      }
      if (
        row.source_type === "procedure" &&
        row.document_id === null &&
        row.procedure_id !== null &&
        row.procedure_title !== null &&
        row.procedure_updated_at !== null &&
        row.page === null
      ) {
        return {
          ...common,
          sourceType: "procedure",
          documentId: null,
          filename: null,
          documentReceivedAt: null,
          page: null,
          procedureId: row.procedure_id,
          procedureTitle: row.procedure_title,
          procedureUpdatedAt: row.procedure_updated_at,
        };
      }
      throw new Error(`Search returned an incomplete ${row.source_type} source`);
    });
  }
}
