import Anthropic from "@anthropic-ai/sdk";
import type { AnswerModel, ModelAnswer } from "./manual-qa";

/** The answer's shape, enforced by structured outputs. */
const ANSWER_SCHEMA = {
  type: "object",
  properties: {
    covered: { type: "boolean", description: "True only if the excerpts answer the question." },
    answer: { type: "string", description: "The answer, or empty when not covered." },
    sources: { type: "array", items: { type: "integer" }, description: "Numbers of the excerpts the answer uses." },
  },
  required: ["covered", "answer", "sources"],
  additionalProperties: false,
} as const;

export const DEFAULT_MODEL = "claude-opus-5-5";

/**
 * Claude reading the excerpts. Reads ANTHROPIC_API_KEY (or another credential the SDK finds).
 * The system prompt is the same on every call and cached. A safety refusal is retried on
 * Anthropic's default fallback model; if that refuses too, there is no answer.
 */
export class ClaudeAnswerModel implements AnswerModel {
  private readonly client: Anthropic;

  constructor(
    readonly model: string = DEFAULT_MODEL,
    client?: Anthropic,
  ) {
    this.client = client ?? new Anthropic();
  }

  async answer(system: string, prompt: string): Promise<ModelAnswer | null> {
    const response = await this.client.beta.messages.create({
      model: this.model,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // Reading a few excerpts closely is a light task.
      output_config: { effort: "low", format: { type: "json_schema", schema: ANSWER_SCHEMA } },
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "refusal") return null;
    if (response.stop_reason === "max_tokens") throw new Error("The answer was cut off (max_tokens)");

    const text = response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
    return parseModelAnswer(text);
  }
}

/** Parses and checks the model's JSON, so a malformed reply fails loudly instead of answering. */
export function parseModelAnswer(text: string): ModelAnswer {
  const value: unknown = JSON.parse(text);
  if (
    typeof value !== "object" ||
    value === null ||
    typeof (value as ModelAnswer).covered !== "boolean" ||
    typeof (value as ModelAnswer).answer !== "string" ||
    !Array.isArray((value as ModelAnswer).sources) ||
    !(value as ModelAnswer).sources.every((n) => Number.isInteger(n))
  ) {
    throw new Error(`The model's answer isn't in the expected shape: ${text.slice(0, 200)}`);
  }
  const { covered, answer, sources } = value as ModelAnswer;
  return { covered, answer, sources };
}
