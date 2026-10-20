import { ClaudeFilingModel, fileDocument, type FileDocumentResult, type FilingModel, type FilingStore } from "@newton/agent";
import { extractPages } from "@newton/indexing";

// When filing runs (#11, docs/architecture.md "Filing"): right after email-in stores a message's
// files, for those files, and once a day for anything still waiting (a filing that failed, or
// one the first run never reached). Both go through `fileDocument()`, which saves once per
// document, so overlapping runs don't duplicate records.

/** A document whose filing failed this many times waits for a person instead. */
export const MAX_ATTEMPTS = 3;
/** Documents per daily run, to stay well inside one request's time limit. */
export const SWEEP_LIMIT = 20;

export interface FilingDeps {
  store: FilingStore & {
    documentsOfEmail(inboundEmailId: string): Promise<string[]>;
    waiting(maxAttempts: number, limit: number): Promise<string[]>;
  };
  model: FilingModel;
  extractText?: (pdf: Uint8Array) => Promise<string>;
}

export type FilingRunResult = Pick<FileDocumentResult, "documentId" | "outcome" | "error">;

/** Claude, when this deployment has a key for it; otherwise filing waits (documents stay unsorted). */
export function filingModelFromEnv(): FilingModel | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new ClaudeFilingModel(process.env.FILING_MODEL || undefined);
}

export async function pdfText(pdf: Uint8Array): Promise<string> {
  return (await extractPages(pdf)).map((p) => p.text).join("\n");
}

/** Files each document in turn. One document's error doesn't stop the others. */
export async function fileDocuments(documentIds: string[], deps: FilingDeps): Promise<FilingRunResult[]> {
  const results: FilingRunResult[] = [];
  for (const documentId of documentIds) {
    try {
      const { outcome, error } = await fileDocument({
        documentId,
        store: deps.store,
        model: deps.model,
        extractText: deps.extractText ?? pdfText,
      });
      results.push(error ? { documentId, outcome, error } : { documentId, outcome });
    } catch (error) {
      // A database or storage error: the daily run picks the document up again.
      results.push({ documentId, outcome: "failed", error: error instanceof Error ? error.message : String(error) });
    }
  }
  return results;
}

/** Files the documents one inbound email just stored. */
export async function fileEmail(inboundEmailId: string, deps: FilingDeps): Promise<FilingRunResult[]> {
  return fileDocuments(await deps.store.documentsOfEmail(inboundEmailId), deps);
}

/** The daily run: everything still waiting, oldest first. */
export async function fileWaiting(deps: FilingDeps): Promise<FilingRunResult[]> {
  return fileDocuments(await deps.store.waiting(MAX_ATTEMPTS, SWEEP_LIMIT), deps);
}
