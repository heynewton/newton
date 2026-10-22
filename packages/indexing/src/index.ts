export { extractPages } from "./pdf";
export type { PageText } from "./pdf";
export { chunkPages, DEFAULT_MAX_CHARS } from "./chunk";
export type { Chunk, ChunkOptions } from "./chunk";
export { EMBEDDING_DIMENSIONS, checkEmbeddings } from "./embedder";
export type { Embedder, EmbeddingKind } from "./embedder";
export { FakeEmbedder, fakeEmbedding } from "./fake-embedder";
export { VoyageEmbedder } from "./voyage-embedder";
export type { VoyageEmbedderOptions } from "./voyage-embedder";
export { MemoryChunkStore } from "./store";
export type {
  ChunkRow,
  ChunkStore,
  DocumentChunkRow,
  DocumentRef,
  ProcedureChunkRow,
  ProcedureRef,
  SearchOptions,
  SearchResult,
} from "./store";
export { SupabaseChunkStore } from "./supabase-store";
export type { SupabaseLike } from "./supabase-store";
export { indexDocument, indexProcedure, prepareProcedureChunks, searchChunks, shouldIndex } from "./index-document";
export type {
  IndexDocumentInput,
  IndexDocumentResult,
  IndexProcedureInput,
  SearchInput,
} from "./index-document";
