/** The document being indexed: its row in `documents`. */
export interface DocumentRef {
  id: string;
  boatId: string;
}

/** One row of `document_chunks`. */
export interface ChunkRow {
  boatId: string;
  documentId: string;
  page: number;
  chunkIndex: number;
  content: string;
  embedding: number[];
  embeddingModel: string;
}

/** A chunk found by search, with what an answer needs to cite it and say how fresh it is. */
export interface SearchResult {
  chunkId: string;
  boatId: string;
  documentId: string;
  filename: string | null;
  documentReceivedAt: string | null;
  page: number;
  content: string;
  indexedAt: string | null;
  similarity: number;
}

export interface SearchOptions {
  /** How many chunks to return, 1 to 50. Defaults to 5. */
  matchCount?: number;
  /** Only search this boat (still only if the caller is on it). */
  boatId?: string;
}

/** Where chunks are kept: Postgres in the app, memory in tests. */
export interface ChunkStore {
  /** Removes the document's chunks and stores these instead. */
  replaceDocumentChunks(document: DocumentRef, rows: ChunkRow[]): Promise<void>;
  /** The chunks closest to the embedding, from chunks embedded by the same model. */
  search(embedding: number[], model: string, options?: SearchOptions): Promise<SearchResult[]>;
}

/**
 * Keeps chunks in memory and ranks them by cosine similarity, like `search_document_chunks()`.
 * For tests: it has no row-level security, so it sees every boat.
 */
export class MemoryChunkStore implements ChunkStore {
  readonly rows: (ChunkRow & { id: string })[] = [];

  async replaceDocumentChunks(document: DocumentRef, rows: ChunkRow[]): Promise<void> {
    const kept = this.rows.filter((row) => row.documentId !== document.id);
    this.rows.splice(0, this.rows.length, ...kept);
    for (const row of rows) this.rows.push({ ...row, id: `${row.documentId}/${row.chunkIndex}` });
  }

  async search(embedding: number[], model: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    return this.rows
      .filter((row) => row.embeddingModel === model && (!options.boatId || row.boatId === options.boatId))
      .map((row) => ({
        chunkId: row.id,
        boatId: row.boatId,
        documentId: row.documentId,
        filename: null,
        documentReceivedAt: null,
        page: row.page,
        content: row.content,
        indexedAt: null,
        similarity: cosine(embedding, row.embedding),
      }))
      .sort((a, b) => b.similarity - a.similarity || a.chunkId.localeCompare(b.chunkId))
      .slice(0, clampMatchCount(options.matchCount));
  }
}

export function clampMatchCount(matchCount: number | undefined): number {
  return Math.min(Math.max(Math.trunc(matchCount ?? 5), 1), 50);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    aa += x * x;
    bb += y * y;
  }
  return aa === 0 || bb === 0 ? 0 : dot / Math.sqrt(aa * bb);
}
