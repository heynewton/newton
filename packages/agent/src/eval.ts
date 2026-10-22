import { readFileSync } from "node:fs";
import {
  indexDocument,
  indexProcedure,
  MemoryChunkStore,
  searchChunks,
  type Embedder,
  type SearchResult,
} from "@newton/indexing";
import { answerFromManuals, type AnswerModel, type ManualAnswer } from "./manual-qa";

/**
 * The boat Q&A eval: the sample boat's manual excerpt and owner-written procedures, indexed in
 * memory, and a set of questions with what a right answer looks like (evals/manual-qa.json). Run with a real model by
 * `npm run eval:manual-qa`; the retrieval half also runs in the unit tests with the fake embedder.
 */

export interface EvalCase {
  id: string;
  question: string;
  covered: boolean;
  sourceType?: "document" | "procedure";
  /** For covered questions: the page the answer is on, and what the answer must contain. */
  page?: number;
  /** For procedure questions: the title the answer must cite. */
  procedureTitle?: string;
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
export async function indexedBoatKnowledge(set: EvalSet, embedder: Embedder) {
  const store = new MemoryChunkStore();
  const pdf = new Uint8Array(readFileSync(new URL(`../evals/${set.document.file}`, import.meta.url)));
  await indexDocument({ document: { id: "manual-1", boatId: "test-boat" }, pdf, embedder, store });
  const fixture = JSON.parse(
    readFileSync(new URL("../../../fixtures/sample-boat/boat.json", import.meta.url), "utf8"),
  ) as {
    procedures: { id: string; title: string; content: string; updatedAt: string }[];
  };
  for (const procedure of fixture.procedures) {
    await indexProcedure({
      procedure: { id: procedure.id, boatId: "test-boat", title: procedure.title, updatedAt: procedure.updatedAt },
      content: procedure.content,
      embedder,
      store,
    });
  }
  const indexedAt = new Date().toISOString();
  return async (question: string): Promise<SearchResult[]> => {
    const results = await searchChunks({ question, embedder, store, boatId: "test-boat", matchCount: MATCH_COUNT });
    return results.map((result): SearchResult =>
      result.sourceType === "document"
        ? { ...result, filename: set.document.filename, documentReceivedAt: set.document.receivedAt, indexedAt }
        : result,
    );
  };
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
    if (c.sourceType && !result.sources.some((s) => s.sourceType === c.sourceType)) {
      problems.push(`doesn't cite a ${c.sourceType}`);
    }
    if (c.page !== undefined && !result.sources.some((s) => s.sourceType === "document" && s.page === c.page)) {
      problems.push(
        `doesn't cite page ${c.page} (cites ${result.sources
          .filter((s) => s.sourceType === "document")
          .map((s) => s.page)
          .join(", ")})`,
      );
    }
    if (
      c.procedureTitle !== undefined &&
      !result.sources.some((s) => s.sourceType === "procedure" && s.title === c.procedureTitle)
    ) {
      problems.push(`doesn't cite procedure "${c.procedureTitle}"`);
    }
    for (const m of c.mentions ?? []) {
      if (!result.answer.toLowerCase().includes(m.toLowerCase())) problems.push(`answer doesn't mention "${m}"`);
    }
  }
  return { id: c.id, passed: problems.length === 0, problems, result };
}

export async function runEval(set: EvalSet, embedder: Embedder, model: AnswerModel): Promise<CaseResult[]> {
  const search = await indexedBoatKnowledge(set, embedder);
  const results: CaseResult[] = [];
  for (const c of set.cases) {
    results.push(grade(c, await answerFromManuals({ question: c.question, search, model })));
  }
  return results;
}
