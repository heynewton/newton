import type { SearchResult } from "@newton/indexing";
import { describe, expect, it } from "vitest";
import { answerFromManuals, buildPrompt, citationLine, numbersIn, NOT_COVERED, type AnswerModel, type ModelAnswer } from "./manual-qa";

const excerpt = (page: number, content: string, documentId = "manual-1"): SearchResult => ({
  chunkId: `${documentId}/${page}`,
  boatId: "test-boat",
  documentId,
  filename: "manual-excerpt.pdf",
  documentReceivedAt: "2026-10-11T08:15:40Z",
  page,
  content,
  indexedAt: "2026-10-12T00:00:00Z",
  similarity: 0.9,
});

const oil = excerpt(2, "6.3 Engine oil\nCapacity with filter: 4.8 quarts (4.5 liters).\nUse oil rated API CH-4 or better, SAE 15W-40 above 5 C.");
const schedule = excerpt(1, "Raw-water pump impeller              250 h      24 months\nCoolant (replace)                    1,000 h    24 months");

// A model that always replies the same way, and remembers what it was asked.
function scripted(reply: ModelAnswer | null) {
  const asked: { system: string; prompt: string }[] = [];
  const model: AnswerModel = {
    model: "scripted",
    async answer(system, prompt) {
      asked.push({ system, prompt });
      return reply;
    },
  };
  return { model, asked };
}

const ask = (reply: ModelAnswer | null, excerpts: SearchResult[] = [oil, schedule]) => {
  const { model, asked } = scripted(reply);
  return { asked, result: answerFromManuals({ question: "How much oil?", search: async () => excerpts, model }) };
};

describe("answerFromManuals", () => {
  it("answers with the sources built from the excerpts it cites, not from the model", async () => {
    const result = await ask({ covered: true, answer: " It takes 4.8 quarts (4.5 liters) with the filter. ", sources: [1] }).result;
    expect(result).toEqual({
      covered: true,
      answer: "It takes 4.8 quarts (4.5 liters) with the filter.",
      sources: [
        {
          documentId: "manual-1",
          filename: "manual-excerpt.pdf",
          page: 2,
          documentReceivedAt: "2026-10-11T08:15:40Z",
          indexedAt: "2026-10-12T00:00:00Z",
        },
      ],
      citation: "From manual-excerpt.pdf, page 2 (received 11 Oct 2026).",
    });
  });

  it("doesn't call the model when search finds nothing", async () => {
    const { asked, result } = ask({ covered: true, answer: "Yes", sources: [1] }, []);
    expect(await result).toEqual({ covered: false, message: NOT_COVERED, reason: "no_excerpts" });
    expect(asked).toEqual([]);
  });

  it("says so when the model finds the excerpts don't cover it", async () => {
    expect(await ask({ covered: false, answer: "", sources: [] }).result).toMatchObject({ covered: false, reason: "not_in_manuals" });
    expect(await ask({ covered: true, answer: "  ", sources: [1] }).result).toMatchObject({ covered: false, reason: "not_in_manuals" });
  });

  it("withholds an answer that cites no excerpt it was given", async () => {
    expect(await ask({ covered: true, answer: "Use 15W-40.", sources: [] }).result).toMatchObject({ reason: "uncited" });
    expect(await ask({ covered: true, answer: "Use 15W-40.", sources: [3, 0, -1, 1.5] }).result).toMatchObject({ reason: "uncited" });
  });

  it("withholds an answer with a number that isn't in the excerpts it cites", async () => {
    // Converted, worked out, or made up: none of these figures is in the manual.
    for (const answer of ["About 1.2 gallons.", "4.8 quarts, so about 9.6 for two engines.", "Every 300 hours."]) {
      expect(await ask({ covered: true, answer, sources: [1, 2] }).result).toMatchObject({ reason: "unsupported_number" });
    }
    // In the manual, but in an excerpt the answer doesn't cite.
    expect(await ask({ covered: true, answer: "Every 250 hours or 24 months.", sources: [1] }).result).toMatchObject({
      reason: "unsupported_number",
    });
    expect(await ask({ covered: true, answer: "Every 250 hours or 24 months.", sources: [2] }).result).toMatchObject({ covered: true });
  });

  it("accepts figures written with or without thousands separators", async () => {
    expect(await ask({ covered: true, answer: "Replace the coolant every 1000 hours.", sources: [2] }).result).toMatchObject({ covered: true });
  });

  it("is not covered when the model declines", async () => {
    expect(await ask(null).result).toMatchObject({ covered: false, reason: "declined" });
  });

  it("cites each page once, in order, across several excerpts", async () => {
    const more = excerpt(2, "6.4 Raw-water impeller\nClose the seacock before opening the pump cover.");
    const result = await ask({ covered: true, answer: "Close the seacock; SAE 15W-40 oil.", sources: [3, 1, 3, 2] }, [oil, schedule, more])
      .result;
    expect(result.covered && result.sources.map((s) => s.page)).toEqual([2, 1]);
    expect(result.covered && result.citation).toBe(
      "From manual-excerpt.pdf, page 2 (received 11 Oct 2026); manual-excerpt.pdf, page 1 (received 11 Oct 2026).",
    );
  });

  it("shows the model numbered excerpts with their document and page, then the question", async () => {
    const { asked, result } = ask({ covered: false, answer: "", sources: [] });
    await result;
    expect(asked[0]!.system).toContain("only excerpts from that boat's own manuals");
    expect(asked[0]!.prompt).toBe(buildPrompt("How much oil?", [oil, schedule]));
    expect(asked[0]!.prompt).toMatch(/^<excerpt number="1" document="manual-excerpt.pdf" page="2">\n6\.3 Engine oil/);
    expect(asked[0]!.prompt).toContain('<excerpt number="2" document="manual-excerpt.pdf" page="1">');
    expect(asked[0]!.prompt.endsWith("Question: How much oil?")).toBe(true);
  });
});

describe("numbersIn and citationLine", () => {
  it("reads numbers as written", () => {
    expect(numbersIn("4.8 quarts (4.5 liters), SAE 15W-40, 1,000 h, done.")).toEqual(["4.8", "4.5", "15", "40", "1000"]);
    expect(numbersIn("No figures here.")).toEqual([]);
  });

  it("leaves out dates it doesn't have", () => {
    expect(
      citationLine([{ documentId: "d", filename: null, page: 3, documentReceivedAt: null, indexedAt: null }]),
    ).toBe("From a manual, page 3.");
  });
});
