import type { PageText } from "./pdf";

/** A piece of a document's text small enough to embed and to quote as a source. */
export interface Chunk {
  /** Page the text is on, from 1. A chunk never spans two pages. */
  page: number;
  /** Order within the document, from 0. */
  index: number;
  content: string;
}

export interface ChunkOptions {
  /** Longest chunk in characters. About 4 characters a token, so 1,200 is about 300 tokens. */
  maxChars?: number;
}

export const DEFAULT_MAX_CHARS = 1200;

// A numbered heading such as "6.3 Engine oil" or "12 Electrical".
const HEADING = /^\d+(\.\d+)*\.?\s+\S/;

/**
 * Splits pages into chunks that keep their page number. Within a page, text is grouped into
 * sections that start at numbered headings, and sections are packed into chunks of up to
 * `maxChars`. A section longer than that is split between lines, and a line longer than that
 * between words, so no chunk is ever longer than `maxChars`.
 */
export function chunkPages(pages: PageText[], options: ChunkOptions = {}): Chunk[] {
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
  if (!Number.isInteger(maxChars) || maxChars < 20) {
    throw new Error(`maxChars must be a whole number of at least 20, got ${maxChars}`);
  }
  const chunks: Chunk[] = [];
  for (const { page, text } of pages) {
    for (const content of chunkPage(text, maxChars)) {
      chunks.push({ page, index: chunks.length, content });
    }
  }
  return chunks;
}

function chunkPage(text: string, maxChars: number): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0);

  const sections: string[][] = [];
  for (const line of lines) {
    const current = sections.at(-1);
    if (!current || HEADING.test(line)) sections.push([line]);
    else current.push(line);
  }

  // Each piece fits in a chunk on its own: whole sections, or the lines of a long one.
  const pieces = sections.flatMap((section) => {
    const joined = section.join("\n");
    return joined.length <= maxChars ? [joined] : section.flatMap((line) => splitLine(line, maxChars));
  });

  const chunks: string[] = [];
  let current = "";
  for (const piece of pieces) {
    if (current && current.length + 1 + piece.length > maxChars) {
      chunks.push(current);
      current = piece;
    } else {
      current = current ? `${current}\n${piece}` : piece;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function splitLine(line: string, maxChars: number): string[] {
  if (line.length <= maxChars) return [line];
  const parts: string[] = [];
  let current = "";
  for (const word of line.split(" ")) {
    // A single word longer than a chunk (a URL, say) is cut where it has to be.
    for (let i = 0; i < word.length; i += maxChars) {
      const piece = word.slice(i, i + maxChars);
      if (current && current.length + 1 + piece.length > maxChars) {
        parts.push(current);
        current = piece;
      } else {
        current = current ? `${current} ${piece}` : piece;
      }
    }
  }
  if (current) parts.push(current);
  return parts;
}
