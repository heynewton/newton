import { readFileSync } from "node:fs";
import {
  indexDocument,
  MemoryChunkStore,
  searchChunks,
  type Embedder,
  type SearchResult,
} from "@newton/indexing";
import { answerFromManuals, type AnswerModel, type ManualAnswer } from "./manual-qa";

/**
 * The manual Q&A eval: the sample boat's manual excerpt, indexed in memory, and a set of
 * questions with what a right answer looks like (evals/manual-qa.json). Run with a real model by
 * `npm run eval:manual-qa`; the retrieval half also runs in the unit tests with the fake embedder.
 */

export interface EvalCase {
  id: string;
  question: string;
  covered: boolean;
  /** For covered questions: the page the answer is on, and what the answer must contain. */
  page?: number;
  mentions?: string[];
}

export interface EvalSet {
  document: { file: string; filename: string; receivedAt: string };
  cases: EvalCase[];
}

export const MATCH_COUNT = 4;

export function loadEvalSet(): EvalSet {
  return JSON.parse(readFileSync(new URL("../evals/manual-qa.json", import.meta.url), "utf8")) as EvalSet;
}

/** The fixture manual indexed with the given embedder; search fills in what the database would. */
export async function indexedManual(set: EvalSet, embedder: Embedder) {
  const store = new MemoryChunkStore();
  const pdf = new Uint8Array(readFileSync(new URL(`../evals/${set.document.file}`, import.meta.url)));
  await indexDocument({ document: { id: "manual-1", boatId: "test-boat" }, pdf, embedder, store });
  const indexedAt = new Date().toISOString();
  return async (question: string): Promise<SearchResult[]> =>
    (await searchChunks({ question, embedder, store, boatId: "test-boat", matchCount: MATCH_COUNT })).map((r) => ({
      ...r,
      filename: set.document.filename,
      documentReceivedAt: set.document.receivedAt,
      indexedAt,
    }));
}

export interface CaseResult {
  id: string;
  passed: boolean;
  /** What went wrong, empty when it passed. */
  problems: string[];
  result: ManualAnswer;
}

export function grade(c: EvalCase, result: ManualAnswer): CaseResult {
  const problems: string[] = [];
  if (result.covered !== c.covered) {
    problems.push(
      result.covered ? "answered a question the manual doesn't cover" : `expected an answer, got not covered (${result.reason})`,
    );
  } else if (result.covered) {
    if (c.page !== undefined && !result.sources.some((s) => s.page === c.page)) {
      problems.push(`doesn't cite page ${c.page} (cites ${result.sources.map((s) => s.page).join(", ")})`);
    }
    for (const m of c.mentions ?? []) {
      if (!result.answer.toLowerCase().includes(m.toLowerCase())) problems.push(`answer doesn't mention "${m}"`);
    }
  }
  return { id: c.id, passed: problems.length === 0, problems, result };
}

export async function runEval(set: EvalSet, embedder: Embedder, model: AnswerModel): Promise<CaseResult[]> {
  const search = await indexedManual(set, embedder);
  const results: CaseResult[] = [];
  for (const c of set.cases) {
    results.push(grade(c, await answerFromManuals({ question: c.question, search, model })));
  }
  return results;
}
