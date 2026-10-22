import { chunkPages, type ChunkOptions } from "./chunk";
import { checkEmbeddings, type Embedder } from "./embedder";
import { extractPages } from "./pdf";
import type { ChunkStore, DocumentRef, ProcedureRef, SearchOptions, SearchResult } from "./store";

/**
 * Which documents are indexed (docs/decisions/0004-embeddings.md): manuals and owner-written
 * procedures. Nothing else is sent to the embedding provider.
 */
export function shouldIndex(document: { type: string; contentType?: string | null }): boolean {
  return document.type === "manual" && (document.contentType ?? "application/pdf") === "application/pdf";
}

export interface IndexDocumentInput extends ChunkOptions {
  document: DocumentRef;
  pdf: Uint8Array;
  embedder: Embedder;
  store: ChunkStore;
}

export interface IndexDocumentResult {
  pages: number;
  /** Pages with no text layer (scans): nothing on them can be found until there is OCR. */
  pagesWithoutText: number[];
  chunks: number;
}

/**
 * Indexes a PDF: text per page, chunks that keep their page, one embedding per chunk, and the
 * document's chunks replaced in the store. Safe to run again; that is how a document is
 * re-embedded with another model.
 */
export async function indexDocument(input: IndexDocumentInput): Promise<IndexDocumentResult> {
  const { document, pdf, embedder, store } = input;
  const pages = await extractPages(pdf);
  const chunks = chunkPages(pages, { maxChars: input.maxChars });
  const texts = chunks.map((chunk) => chunk.content);
  const embeddings = texts.length === 0 ? [] : await embedder.embed(texts, "document");
  checkEmbeddings(texts, embeddings, embedder.model);

  await store.replaceDocumentChunks(
    document,
    chunks.map((chunk, i) => ({
      boatId: document.boatId,
      documentId: document.id,
      page: chunk.page,
      chunkIndex: chunk.index,
      content: chunk.content,
      embedding: embeddings[i] as number[],
      embeddingModel: embedder.model,
    })),
  );

  return {
    pages: pages.length,
    pagesWithoutText: pages.filter((page) => page.text.trim() === "").map((page) => page.page),
    chunks: chunks.length,
  };
}

export interface IndexProcedureInput extends ChunkOptions {
  procedure: ProcedureRef;
  content: string;
  embedder: Embedder;
  store: ChunkStore;
}

/** Indexes a short procedure, retaining its title and edit time for source citations. */
export async function prepareProcedureChunks(
  procedure: ProcedureRef,
  content: string,
  embedder: Embedder,
  maxChars = 12_000,
) {
  const pages = [{ page: 1, text: `${procedure.title}\n${content}` }];
  const chunks = chunkPages(pages, { maxChars });
  const texts = chunks.map((chunk) => chunk.content);
  const embeddings = texts.length === 0 ? [] : await embedder.embed(texts, "document");
  checkEmbeddings(texts, embeddings, embedder.model);

  return chunks.map((chunk, i) => ({
      boatId: procedure.boatId,
      procedureId: procedure.id,
      procedureTitle: procedure.title,
      procedureUpdatedAt: procedure.updatedAt,
      chunkIndex: chunk.index,
      content: chunk.content,
      embedding: embeddings[i] as number[],
      embeddingModel: embedder.model,
    }));
}

export async function indexProcedure(input: IndexProcedureInput): Promise<IndexDocumentResult> {
  const { procedure, content, embedder, store } = input;
  const chunks = await prepareProcedureChunks(procedure, content, embedder, input.maxChars ?? 12_000);
  await store.replaceProcedureChunks(procedure, chunks);

  return { pages: 1, pagesWithoutText: content.trim() ? [] : [1], chunks: chunks.length };
}

export interface SearchInput extends SearchOptions {
  question: string;
  embedder: Embedder;
  store: ChunkStore;
}

/** The chunks closest to a question, from chunks made by the same embedder. */
export async function searchChunks(input: SearchInput): Promise<SearchResult[]> {
  const [embedding] = await input.embedder.embed([input.question], "query");
  if (!embedding) throw new Error(`${input.embedder.model} returned no embedding for the question`);
  return input.store.search(embedding, input.embedder.model, {
    matchCount: input.matchCount,
    boatId: input.boatId,
  });
}
