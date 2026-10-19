/**
 * The size of every embedding Newton stores: the `vector(1024)` column in `document_chunks`.
 * See docs/decisions/0004-embeddings.md.
 */
export const EMBEDDING_DIMENSIONS = 1024;

/** Chunks are embedded as documents; questions as queries. Some models treat them differently. */
export type EmbeddingKind = "document" | "query";

/** Turns text into vectors. The Voyage embedder in production, a fake one in tests. */
export interface Embedder {
  /** Stored with each chunk, so search only compares vectors from the same model. */
  readonly model: string;
  /** One vector of EMBEDDING_DIMENSIONS numbers per text, in the same order. */
  embed(texts: string[], kind: EmbeddingKind): Promise<number[][]>;
}

/** Throws unless there is one vector of the right size per text. */
export function checkEmbeddings(texts: string[], vectors: number[][], model: string): void {
  if (vectors.length !== texts.length) {
    throw new Error(`${model} returned ${vectors.length} embeddings for ${texts.length} texts`);
  }
  for (const vector of vectors) {
    if (vector.length !== EMBEDDING_DIMENSIONS || !vector.every(Number.isFinite)) {
      throw new Error(`${model} returned an embedding that isn't ${EMBEDDING_DIMENSIONS} numbers`);
    }
  }
}
