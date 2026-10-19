import { describe, expect, it } from "vitest";
import { chunkPages } from "./chunk";

describe("chunkPages", () => {
  it("keeps each chunk on its page and numbers chunks across the document", () => {
    const chunks = chunkPages([
      { page: 1, text: "1 Intro\nHello." },
      { page: 2, text: "2 Engine\nOil.\n3 Sails\nReef early." },
    ]);
    expect(chunks).toEqual([
      { page: 1, index: 0, content: "1 Intro\nHello." },
      { page: 2, index: 1, content: "2 Engine\nOil.\n3 Sails\nReef early." },
    ]);
  });

  it("starts a new chunk at a heading when the next section doesn't fit", () => {
    const chunks = chunkPages([{ page: 3, text: "6.3 Oil\nFour liters.\n6.4 Impeller\nCarry a spare." }], {
      maxChars: 30,
    });
    expect(chunks.map((c) => c.content)).toEqual(["6.3 Oil\nFour liters.", "6.4 Impeller\nCarry a spare."]);
  });

  it("never makes a chunk longer than maxChars, even from one long line", () => {
    const long = Array.from({ length: 200 }, (_, i) => `word${i}`).join(" ");
    const chunks = chunkPages([{ page: 1, text: `${long}\n${"x".repeat(130)}` }], { maxChars: 50 });
    expect(chunks.length).toBeGreaterThan(10);
    for (const chunk of chunks) expect(chunk.content.length).toBeLessThanOrEqual(50);
    // Nothing is lost: the words come back in order.
    expect(chunks.map((c) => c.content).join(" ").replace(/\s+/g, "")).toBe(
      `${long}${"x".repeat(130)}`.replace(/\s+/g, ""),
    );
  });

  it("tidies whitespace and skips pages with no text", () => {
    const chunks = chunkPages([
      { page: 1, text: "   \n\n" },
      { page: 2, text: "  Close   the seacock.  \n\n\nThen open the pump.  " },
    ]);
    expect(chunks).toEqual([{ page: 2, index: 0, content: "Close the seacock.\nThen open the pump." }]);
  });

  it("refuses a chunk size too small to be useful", () => {
    expect(() => chunkPages([], { maxChars: 5 })).toThrow(/maxChars/);
  });
});
