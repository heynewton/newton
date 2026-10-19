import { FakeEmbedder, VoyageEmbedder, type Embedder } from "@newton/indexing";
import { describe, expect, it } from "vitest";
import { ClaudeAnswerModel } from "../src/claude";
import { loadEvalSet, runEval } from "../src/eval";

// The live manual Q&A eval (#14): every question in manual-qa.json through Claude, graded on
// answering or declining, citing the right page and quoting the figures. Costs a few cents a run.
// Needs ANTHROPIC_API_KEY; uses Voyage when VOYAGE_API_KEY is set, otherwise the fake embedder
// (then it only measures the answering half).

const hasClaude = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

describe.skipIf(!hasClaude)("manual Q&A, live", () => {
  it("answers every covered question with its page and figures, and declines the rest", async () => {
    const embedder: Embedder = process.env.VOYAGE_API_KEY ? new VoyageEmbedder() : new FakeEmbedder();
    const model = new ClaudeAnswerModel(process.env.NEWTON_QA_MODEL || undefined);
    const results = await runEval(loadEvalSet(), embedder, model);

    console.log(`\nManual Q&A eval: ${model.model}, ${embedder.model}`);
    for (const r of results) {
      const said = r.result.covered ? `${r.result.answer} ${r.result.citation}` : `not covered (${r.result.reason})`;
      console.log(`${r.passed ? "PASS" : "FAIL"} ${r.id}: ${said}${r.problems.length ? `\n     ${r.problems.join("; ")}` : ""}`);
    }
    console.log(`${results.filter((r) => r.passed).length}/${results.length} passed`);
    expect(results.filter((r) => !r.passed).map((r) => r.id)).toEqual([]);
  });
});
