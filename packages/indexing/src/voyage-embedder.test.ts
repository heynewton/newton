import { afterEach, describe, expect, it, vi } from "vitest";
import { EMBEDDING_DIMENSIONS } from "./embedder";
import { VoyageEmbedder } from "./voyage-embedder";

const vector = (x: number) => new Array<number>(EMBEDDING_DIMENSIONS).fill(x);

function fakeFetch(respond: (body: { input: string[] }) => Response) {
  const calls: { url: string; init: RequestInit; body: Record<string, unknown> & { input: string[] } }[] = [];
  const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    calls.push({ url: String(url), init: init ?? {}, body });
    return respond(body);
  });
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls };
}

// Voyage may return items in any order; `index` says which input each is for.
const reversed = (body: { input: string[] }) =>
  Response.json({
    data: body.input.map((text, index) => ({ index, embedding: vector(text.length) })).reverse(),
  });

afterEach(() => vi.unstubAllEnvs());

describe("VoyageEmbedder", () => {
  it("sends documents in batches with the model, kind and size, and keeps the order", async () => {
    const { fetch, calls } = fakeFetch(reversed);
    const embedder = new VoyageEmbedder({ apiKey: "test-key", batchSize: 2, fetch });

    const vectors = await embedder.embed(["a", "bb", "ccc"], "document");

    expect(vectors.map((v) => v[0])).toEqual([1, 2, 3]);
    expect(calls).toHaveLength(2);
    expect(calls[0]?.url).toBe("https://api.voyageai.com/v1/embeddings");
    expect(calls[0]?.init.headers).toMatchObject({ Authorization: "Bearer test-key" });
    expect(calls[0]?.body).toEqual({
      input: ["a", "bb"],
      model: "voyage-4",
      input_type: "document",
      output_dimension: 1024,
      truncation: false,
    });
    expect(calls[1]?.body.input).toEqual(["ccc"]);
  });

  it("embeds questions as queries", async () => {
    const { fetch, calls } = fakeFetch(reversed);
    await new VoyageEmbedder({ apiKey: "test-key", fetch }).embed(["how much oil?"], "query");
    expect(calls[0]?.body.input_type).toBe("query");
  });

  it("reads the key from VOYAGE_API_KEY", async () => {
    vi.stubEnv("VOYAGE_API_KEY", "from-env");
    const { fetch, calls } = fakeFetch(reversed);
    await new VoyageEmbedder({ fetch }).embed(["x"], "query");
    expect(calls[0]?.init.headers).toMatchObject({ Authorization: "Bearer from-env" });
  });

  it("says which variable is missing when there is no key", () => {
    vi.stubEnv("VOYAGE_API_KEY", "");
    expect(() => new VoyageEmbedder()).toThrow(/VOYAGE_API_KEY/);
  });

  it("reports an API error with its status", async () => {
    const { fetch } = fakeFetch(() => new Response("rate limited", { status: 429 }));
    await expect(new VoyageEmbedder({ apiKey: "k", fetch }).embed(["x"], "document")).rejects.toThrow(
      "Voyage AI returned 429: rate limited",
    );
  });

  it("refuses vectors of the wrong size", async () => {
    const { fetch } = fakeFetch(() => Response.json({ data: [{ index: 0, embedding: [1, 2] }] }));
    await expect(new VoyageEmbedder({ apiKey: "k", fetch }).embed(["x"], "document")).rejects.toThrow(/1024/);
  });
});
