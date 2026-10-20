import { readFileSync } from "node:fs";
import { extractPages } from "@newton/indexing";
import {
  fileDocument,
  type FilingContext,
  type FilingModel,
  type FilingPlan,
  type FilingRecords,
  type FilingStore,
  type SavedFiling,
} from "./filing";

/**
 * The filing eval: each fixture document filed as if a member forwarded it, through the same
 * `fileDocument()` the app runs, with an in-memory store. Graded on what would be saved, not on
 * what the model said: a value the checks refused doesn't count. Runs with a stand-in in the unit
 * tests and with Claude by `npm run eval:filing`.
 */

type Table = keyof FilingRecords;
/** A record to look for: its table and the fields to compare. An array means any of its values. */
export type ExpectedRecord = { table: Table } & Record<string, unknown>;

export interface FilingEvalCase {
  id: string;
  file: string;
  emailSubject: string;
  type: FilingPlan["documentType"];
  status?: FilingPlan["status"];
  boat?: Pick<FilingContext, "maintenance" | "renewals" | "expenses">;
  required: ExpectedRecord[];
  optional: ExpectedRecord[];
}

export interface FilingEvalSet {
  fixtures: string;
  cases: FilingEvalCase[];
}

/** The person who "forwarded" every document: expenses are paid by them. */
export const EVAL_PAYER = "forwarder";

export function loadFilingEvalSet(): FilingEvalSet {
  return JSON.parse(readFileSync(new URL("../evals/filing.json", import.meta.url), "utf8")) as FilingEvalSet;
}

export function fixtureFile(set: FilingEvalSet, file: string): Uint8Array {
  return new Uint8Array(readFileSync(new URL(`../evals/${set.fixtures}${file}`, import.meta.url)));
}

export async function pdfText(pdf: Uint8Array): Promise<string> {
  return (await extractPages(pdf)).map((p) => p.text).join("\n");
}

/** A store holding one document and whatever was saved for it. */
export class MemoryFilingStore implements FilingStore {
  saved: SavedFiling | null = null;
  failures: string[] = [];

  constructor(
    private readonly file: { filename: string; contentType: string; content: Uint8Array },
    private readonly context: FilingContext,
  ) {}

  async load() {
    if (this.saved) return null;
    return { file: this.file, context: this.context };
  }

  async save(_documentId: string, filing: SavedFiling) {
    if (this.saved) return { alreadyFiled: true };
    this.saved = filing;
    return { alreadyFiled: false };
  }

  async fail(_documentId: string, error: string) {
    this.failures.push(error);
  }
}

function matches(expected: ExpectedRecord, table: Table, row: Record<string, unknown>): boolean {
  if (expected.table !== table) return false;
  return Object.entries(expected).every(([field, want]) => {
    if (field === "table") return true;
    return Array.isArray(want) ? want.includes(row[field]) : row[field] === want;
  });
}

export interface FilingCaseResult {
  id: string;
  passed: boolean;
  problems: string[];
  plan: FilingPlan | undefined;
}

export function gradeFiling(c: FilingEvalCase, plan: FilingPlan | undefined, error?: string): FilingCaseResult {
  const problems: string[] = [];
  if (!plan) {
    return { id: c.id, passed: false, problems: [`not filed${error ? `: ${error}` : ""}`], plan };
  }
  if (plan.documentType !== c.type) problems.push(`type ${plan.documentType}, expected ${c.type}`);
  if (c.status && plan.status !== c.status) problems.push(`status ${plan.status}, expected ${c.status}`);

  const saved = (Object.keys(plan.records) as Table[]).flatMap((table) =>
    (plan.records[table] as Record<string, unknown>[]).map((row) => ({ table, row })),
  );
  for (const want of c.required) {
    if (!saved.some((s) => matches(want, s.table, s.row))) problems.push(`didn't save ${JSON.stringify(want)}`);
  }
  for (const s of saved) {
    if (![...c.required, ...c.optional].some((want) => matches(want, s.table, s.row))) {
      problems.push(`saved something unexpected in ${s.table}: ${JSON.stringify(s.row)}`);
    }
  }
  return { id: c.id, passed: problems.length === 0, problems, plan };
}

export async function runFilingCase(set: FilingEvalSet, c: FilingEvalCase, model: FilingModel): Promise<FilingCaseResult> {
  const store = new MemoryFilingStore(
    { filename: c.file, contentType: "application/pdf", content: fixtureFile(set, c.file) },
    {
      filename: c.file,
      emailSubject: c.emailSubject,
      payerId: EVAL_PAYER,
      maintenance: c.boat?.maintenance ?? [],
      renewals: c.boat?.renewals ?? [],
      expenses: c.boat?.expenses ?? [],
    },
  );
  const result = await fileDocument({ documentId: c.id, store, model, extractText: pdfText });
  return gradeFiling(c, result.plan, result.error);
}

export async function runFilingEval(set: FilingEvalSet, model: FilingModel): Promise<FilingCaseResult[]> {
  const results: FilingCaseResult[] = [];
  for (const c of set.cases) results.push(await runFilingCase(set, c, model));
  return results;
}
