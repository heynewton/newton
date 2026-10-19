import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { ClaudeAnswerModel, DEFAULT_MODEL, parseModelAnswer } from "./claude";

// A stand-in for the SDK client: keeps the request, returns the given response.
function fakeClient(response: { stop_reason: string; content: { type: string; text?: string }[] }) {
  const requests: Record<string, unknown>[] = [];
  const client = {
    beta: {
      messages: {
        create: async (request: Record<string, unknown>) => {
          requests.push(request);
          return response;
        },
      },
    },
  } as unknown as Anthropic;
  return { client, requests };
}

describe("ClaudeAnswerModel", () => {
  it("asks for structured JSON at low effort, caches the system prompt and opts into fallbacks", async () => {
    const { client, requests } = fakeClient({
      stop_reason: "end_turn",
      content: [{ type: "text", text: '{"covered":true,"answer":"4.8 quarts.","sources":[1]}' }],
    });
    const model = new ClaudeAnswerModel(undefined, client);
    expect(await model.answer("system rules", "excerpts and question")).toEqual({ covered: true, answer: "4.8 quarts.", sources: [1] });

    const request = requests[0]!;
    expect(request.model).toBe(DEFAULT_MODEL);
    expect(request.betas).toEqual(["server-side-fallback-2026-07-01"]);
    expect(request.fallbacks).toBe("default");
    expect(request.output_config).toMatchObject({ effort: "low", format: { type: "json_schema" } });
    expect(request.system).toEqual([{ type: "text", text: "system rules", cache_control: { type: "ephemeral" } }]);
    expect(request.messages).toEqual([{ role: "user", content: "excerpts and question" }]);
    expect(request).not.toHaveProperty("tool_choice");
    expect(request).not.toHaveProperty("thinking");
  });

  it("has no answer when Claude and its fallback refuse", async () => {
    const { client } = fakeClient({ stop_reason: "refusal", content: [] });
    expect(await new ClaudeAnswerModel(undefined, client).answer("s", "p")).toBeNull();
  });

  it("fails loudly on a cut-off or malformed reply", async () => {
    const cut = fakeClient({ stop_reason: "max_tokens", content: [{ type: "text", text: '{"covered":' }] });
    await expect(new ClaudeAnswerModel(undefined, cut.client).answer("s", "p")).rejects.toThrow("cut off");
    const odd = fakeClient({ stop_reason: "end_turn", content: [{ type: "text", text: '{"covered":"yes"}' }] });
    await expect(new ClaudeAnswerModel(undefined, odd.client).answer("s", "p")).rejects.toThrow("expected shape");
  });
});

describe("parseModelAnswer", () => {
  it("keeps only the three fields", () => {
    expect(parseModelAnswer('{"covered":false,"answer":"","sources":[],"extra":1}')).toEqual({ covered: false, answer: "", sources: [] });
  });

  it("refuses non-integer sources and non-JSON", () => {
    expect(() => parseModelAnswer('{"covered":true,"answer":"a","sources":["1"]}')).toThrow("expected shape");
    expect(() => parseModelAnswer("Sure! The answer is 4.8 quarts.")).toThrow();
  });
});
