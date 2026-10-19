import { FakeEmbedder } from "@newton/indexing";
import { describe, expect, it } from "vitest";
import { grade, indexedManual, loadEvalSet, MATCH_COUNT, runEval } from "./eval";
import type { AnswerModel, ModelAnswer } from "./manual-qa";

const set = loadEvalSet();

// Stands in for Claude in CI: answers each covered question the way a good answer would, from the
// excerpt that has the expected words, and says not covered otherwise.
function oracle(): AnswerModel {
  return {
    model: "oracle",
    async answer(_system, prompt): Promise<ModelAnswer> {
      const question = prompt.slice(prompt.lastIndexOf("Question: ") + "Question: ".length);
      const c = set.cases.find((x) => x.question === question)!;
      if (!c.covered) return { covered: false, answer: "", sources: [] };
      const excerpts = prompt.split("<excerpt ").slice(1);
      const index = excerpts.findIndex((e) => (c.mentions ?? []).every((m) => e.toLowerCase().includes(m.toLowerCase())));
      return { covered: true, answer: `The manual says: ${(c.mentions ?? []).join(", ")}.`, sources: [index + 1] };
    },
  };
}

describe("the manual Q&A eval set", () => {
  it("has covered and not-covered questions, each covered one with a page and what to mention", () => {
    expect(set.cases.filter((c) => c.covered).length).toBeGreaterThanOrEqual(5);
    expect(set.cases.filter((c) => !c.covered).length).toBeGreaterThanOrEqual(3);
    for (const c of set.cases.filter((x) => x.covered)) {
      expect(c.page, c.id).toBeDefined();
      expect(c.mentions?.length, c.id).toBeGreaterThan(0);
    }
    expect(new Set(set.cases.map((c) => c.id)).size).toBe(set.cases.length);
  });

  // Retrieval runs for real here, with the deterministic fake embedder: the excerpt with the
  // answer has to reach the model. The live eval checks the same with Voyage.
  it.each(set.cases.filter((c) => c.covered).map((c) => [c.id, c] as const))(
    "finds the page with the answer for %s in the top results",
    async (_id, c) => {
      const search = await indexedManual(set, new FakeEmbedder());
      const results = await search(c.question);
      expect(results).toHaveLength(Math.min(MATCH_COUNT, results.length));
      const hit = results.find((r) => (c.mentions ?? []).every((m) => r.content.toLowerCase().includes(m.toLowerCase())));
      expect(hit?.page, c.question).toBe(c.page);
    },
  );

  it("passes every case with a model that answers only from the excerpts", async () => {
    const results = await runEval(set, new FakeEmbedder(), oracle());
    expect(results.filter((r) => !r.passed)).toEqual([]);
  });

  it("fails a model that answers what the manual doesn't cover, or leaves out the figures", async () => {
    const guesser: AnswerModel = {
      model: "guesser",
      async answer() {
        return { covered: true, answer: "Probably fine.", sources: [1] };
      },
    };
    const results = await runEval(set, new FakeEmbedder(), guesser);
    expect(results.find((r) => r.id === "mast-height")).toMatchObject({
      passed: false,
      problems: ["answered a question the manual doesn't cover"],
    });
    expect(results.find((r) => r.id === "oil-capacity")?.problems).toContain('answer doesn\'t mention "4.8"');
  });

  it("explains a missed answer", () => {
    const c = set.cases.find((x) => x.id === "oil-capacity")!;
    expect(grade(c, { covered: false, message: "", reason: "unsupported_number" }).problems).toEqual([
      "expected an answer, got not covered (unsupported_number)",
    ]);
  });
});
