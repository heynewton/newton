import { EMBEDDING_DIMENSIONS, type Embedder } from "./embedder";

const STOP_WORDS = new Set(
  "a an and are as at be by can do does for from how i in is it of on or the to what when with".split(" "),
);

/**
 * A deterministic embedder for tests: each word adds 1 to a position chosen by hashing it, and
 * the vector is scaled to length 1. Texts that share words come out close, so search tests can
 * check which chunk a question finds without an API key or a network.
 */
export class FakeEmbedder implements Embedder {
  readonly model = "fake-bag-of-words";

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map(fakeEmbedding);
  }
}

export function fakeEmbedding(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  for (const word of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
    if (STOP_WORDS.has(word)) continue;
    // A crude plural strip, so "filters" and "filter" land together.
    const stem = word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word;
    const slot = fnv1a(stem) % EMBEDDING_DIMENSIONS;
    vector[slot] = (vector[slot] ?? 0) + 1;
  }
  const length = Math.hypot(...vector);
  return length === 0 ? vector : vector.map((x) => x / length);
}

function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}
