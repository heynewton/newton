import { describe, expect, it } from "vitest";
import { ClaudeFilingModel } from "../src/claude-filing";
import { loadFilingEvalSet, runFilingEval } from "../src/filing-eval";

// The live filing eval (#11): every fixture document in filing.json read by Claude, then checked
// and graded on what would be saved. Costs a few cents a run. Needs ANTHROPIC_API_KEY (or another
// credential the SDK finds); NEWTON_FILING_MODEL tries another model.

const hasClaude = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

describe.skipIf(!hasClaude)("filing, live", () => {
  it("files every fixture document with the right type and records, and nothing else", async () => {
    const model = new ClaudeFilingModel(process.env.NEWTON_FILING_MODEL || undefined);
    const results = await runFilingEval(loadFilingEvalSet(), model);

    console.log(`\nFiling eval: ${model.model}`);
    for (const r of results) {
      const p = r.plan;
      const saved = p ? Object.entries(p.records).map(([t, rows]) => `${rows.length} ${t}`).join(", ") : "nothing";
      console.log(`${r.passed ? "PASS" : "FAIL"} ${r.id}: ${p?.documentType} (${p?.confidence}), ${p?.status}; saved ${saved}`);
      for (const f of p?.flags ?? []) console.log(`     flag ${f.record} ${f.field ?? ""} ${f.value ?? ""}: ${f.problem}`);
      if (r.problems.length) console.log(`     ${r.problems.join("; ")}`);
    }
    console.log(`${results.filter((r) => r.passed).length}/${results.length} passed`);
    expect(results.filter((r) => !r.passed).map((r) => r.id)).toEqual([]);
  });
});
