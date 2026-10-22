import type { SearchResult } from "@newton/indexing";

/**
 * Answers a question about the boat from its manuals and owner-written procedures (#14, #21).
 * Search finds the closest excerpts; a model reads only those and either answers, naming the
 * excerpts it used, or says the boat's information doesn't cover it. Code then decides what
 * reaches the person:
 *
 * - The sources are built from the excerpts' own document, page and dates, never from the
 *   model's words (principle 6), and an answer must cite at least one excerpt it was given.
 * - Every number in the answer must appear in an excerpt it cites. The model can quote the
 *   manual's figures but not make one up or work one out (principle 2); anything else is
 *   withheld as not covered.
 */

/** What the model returns: excerpt numbers are 1-based, as they are shown to it. */
export interface ModelAnswer {
  covered: boolean;
  answer: string;
  sources: number[];
}

/** The model that reads the excerpts: Claude in the app, a scripted stand-in in tests. */
export interface AnswerModel {
  readonly model: string;
  /** Null when the model declined to answer at all (a safety refusal). */
  answer(system: string, prompt: string): Promise<ModelAnswer | null>;
}

export interface ManualSource {
  sourceType: "document";
  documentId: string;
  filename: string | null;
  page: number;
  /** When the manual reached Newton, and when it was indexed: how fresh the answer is. */
  documentReceivedAt: string | null;
  indexedAt: string | null;
}

export interface ProcedureSource {
  sourceType: "procedure";
  procedureId: string;
  title: string;
  updatedAt: string;
}

export type AnswerSource = ManualSource | ProcedureSource;

export type ManualAnswer =
  | { covered: true; answer: string; sources: AnswerSource[]; citation: string }
  | {
      covered: false;
      message: string;
      /** Why: nothing found, the model said so, or its answer couldn't be backed by the excerpts. */
      reason: "no_excerpts" | "not_in_manuals" | "uncited" | "unsupported_number" | "declined";
    };

export const NOT_COVERED = "The boat's manuals and procedures on Newton don't cover that, so I won't guess.";

export const SYSTEM_PROMPT = `You answer questions about one boat, using only excerpts from that boat's own manuals and owner-written procedures.

Rules:
- Use only the numbered excerpts in the message. Not general boating knowledge, not other boats, not what a manual or procedure probably says.
- If the excerpts don't answer the question, set covered to false and leave answer empty. A partial answer is fine when it is what the excerpts say; say what they don't cover.
- Quote figures (quantities, intervals, ratings, temperatures) exactly as the excerpt writes them, with their units. Don't convert, add up or work out new numbers.
- Don't mention excerpt numbers, page numbers, file names, procedure titles or dates in the answer: Newton adds the source itself.
- In sources, list the numbers of every excerpt the answer relies on.
- Keep it short: one to three sentences, the way a crew member would say it aloud on deck.`;

/** The excerpts as the model sees them, numbered from 1. */
export function buildPrompt(question: string, excerpts: SearchResult[]): string {
  const blocks = excerpts.map(
    (e, i) =>
      e.sourceType === "procedure"
        ? `<excerpt number="${i + 1}" procedure="${e.procedureTitle}">\n${e.content}\n</excerpt>`
        : `<excerpt number="${i + 1}" document="${e.filename ?? "manual"}" page="${e.page}">\n${e.content}\n</excerpt>`,
  );
  return `${blocks.join("\n\n")}\n\nQuestion: ${question}`;
}

// Numbers as written: "4.8", "1,000", "15W-40" gives 15 and 40. Thousands separators dropped.
export function numbersIn(text: string): string[] {
  return (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, "").replace(/\.$/, ""));
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** "From manual-excerpt.pdf, page 2 (received 11 Oct 2026)." Several sources joined. */
export function citationLine(sources: AnswerSource[]): string {
  const parts = sources.map((s) => {
    if (s.sourceType === "procedure") {
      return `${s.title} (last edited ${dateFormat.format(new Date(s.updatedAt))})`;
    }
    const received = s.documentReceivedAt ? ` (received ${dateFormat.format(new Date(s.documentReceivedAt))})` : "";
    return `${s.filename ?? "a manual"}, page ${s.page}${received}`;
  });
  return `From ${parts.join("; ")}.`;
}

export interface AnswerInput {
  question: string;
  /** Finds the closest excerpts on the boat (searchChunks with the boat's ID). */
  search: (question: string) => Promise<SearchResult[]>;
  model: AnswerModel;
}

export async function answerFromManuals({ question, search, model }: AnswerInput): Promise<ManualAnswer> {
  const notCovered = (reason: Extract<ManualAnswer, { covered: false }>["reason"]): ManualAnswer => ({
    covered: false,
    message: NOT_COVERED,
    reason,
  });

  const excerpts = await search(question);
  if (excerpts.length === 0) return notCovered("no_excerpts");

  const reply = await model.answer(SYSTEM_PROMPT, buildPrompt(question, excerpts));
  if (!reply) return notCovered("declined");
  if (!reply.covered || reply.answer.trim() === "") return notCovered("not_in_manuals");

  const cited = [...new Set(reply.sources)]
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= excerpts.length)
    .sort((a, b) => a - b)
    .map((n) => excerpts[n - 1]!);
  if (cited.length === 0) return notCovered("uncited");

  const sourceNumbers = new Set(cited.flatMap((e) => numbersIn(e.content)));
  if (numbersIn(reply.answer).some((n) => !sourceNumbers.has(n))) return notCovered("unsupported_number");

  // One source per document page, in the order cited.
  const sources: AnswerSource[] = [];
  for (const e of cited) {
    if (e.sourceType === "procedure") {
      if (sources.some((s) => s.sourceType === "procedure" && s.procedureId === e.procedureId)) continue;
      sources.push({
        sourceType: "procedure",
        procedureId: e.procedureId,
        title: e.procedureTitle,
        updatedAt: e.procedureUpdatedAt,
      });
    } else {
      if (sources.some((s) => s.sourceType === "document" && s.documentId === e.documentId && s.page === e.page)) continue;
      sources.push({
        sourceType: "document",
        documentId: e.documentId,
        filename: e.filename,
        page: e.page,
        documentReceivedAt: e.documentReceivedAt,
        indexedAt: e.indexedAt,
      });
    }
  }
  return { covered: true, answer: reply.answer.trim(), sources, citation: citationLine(sources) };
}
