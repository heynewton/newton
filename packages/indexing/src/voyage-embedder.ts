import { checkEmbeddings, EMBEDDING_DIMENSIONS, type Embedder, type EmbeddingKind } from "./embedder";

export interface VoyageEmbedderOptions {
  /** Defaults to the VOYAGE_API_KEY environment variable (see docs/tokens.md). */
  apiKey?: string;
  /** Defaults to voyage-4 (docs/decisions/0004-embeddings.md). */
  model?: string;
  /** Texts per request. Voyage allows up to 1,000 and 320K tokens for voyage-4. */
  batchSize?: number;
  /** For tests. */
  fetch?: typeof fetch;
}

const ENDPOINT = "https://api.voyageai.com/v1/embeddings";

interface VoyageResponse {
  data: { embedding: number[]; index: number }[];
}

/** Embeds with Voyage AI's API: https://docs.voyageai.com/reference/embeddings-api */
export class VoyageEmbedder implements Embedder {
  readonly model: string;
  private readonly apiKey: string;
  private readonly batchSize: number;
  private readonly fetch: typeof fetch;

  constructor(options: VoyageEmbedderOptions = {}) {
    const apiKey = options.apiKey ?? process.env.VOYAGE_API_KEY;
    if (!apiKey) throw new Error("VOYAGE_API_KEY is not set (see docs/tokens.md)");
    this.apiKey = apiKey;
    this.model = options.model ?? "voyage-4";
    this.batchSize = options.batchSize ?? 128;
    this.fetch = options.fetch ?? fetch;
  }

  async embed(texts: string[], kind: EmbeddingKind): Promise<number[][]> {
    const vectors: number[][] = [];
    for (let start = 0; start < texts.length; start += this.batchSize) {
      vectors.push(...(await this.embedBatch(texts.slice(start, start + this.batchSize), kind)));
    }
    checkEmbeddings(texts, vectors, this.model);
    return vectors;
  }

  private async embedBatch(texts: string[], kind: EmbeddingKind): Promise<number[][]> {
    const response = await this.fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        input: texts,
        model: this.model,
        input_type: kind,
        output_dimension: EMBEDDING_DIMENSIONS,
        // Fail rather than embed a cut-off chunk: chunks are far below the model's limit.
        truncation: false,
      }),
    });
    if (!response.ok) {
      // The body explains the error; it never contains the key.
      throw new Error(`Voyage AI returned ${response.status}: ${await response.text()}`);
    }
    const { data } = (await response.json()) as VoyageResponse;
    return [...data].sort((a, b) => a.index - b.index).map((item) => item.embedding);
  }
}
