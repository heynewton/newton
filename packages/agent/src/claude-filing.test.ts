import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL } from "./claude";
import { ClaudeFilingModel, parseProposal } from "./claude-filing";
import type { FilingRequest } from "./filing";

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

const reply = {
  document_type: "invoice",
  confidence: "high",
  summary: "Yard invoice.",
  vendor: "Example Yard",
  decimal_separator: ",",
  date_order: "DMY",
  renewals: [],
  expenses: [{ description: "Haul-out", amount: "1.234,56 €", currency: "EUR", spent_on: "02.10.2026" }],
  maintenance: [
    { title: "Oil", done_on: "02.10.2026", engine_hours: null, next_due_on: null, next_due_engine_hours: null, existing_item: 2 },
  ],
};

function request(kind: FilingRequest["kind"], contentType: string, content = new Uint8Array([37, 80, 68, 70])): FilingRequest {
  return { system: "rules", prompt: "File name: x", kind, file: { filename: "x", contentType, content } };
}

describe("ClaudeFilingModel", () => {
  it("sends the PDF and the message, asks for the schema at medium effort, caches the system prompt and opts into fallbacks", async () => {
    const { client, requests } = fakeClient({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(reply) }] });
    expect(await new ClaudeFilingModel(undefined, client).propose(request("pdf", "application/pdf"))).toEqual(reply);

    const r = requests[0]!;
    expect(r.model).toBe(DEFAULT_MODEL);
    expect(r.betas).toEqual(["server-side-fallback-2026-07-01"]);
    expect(r.fallbacks).toBe("default");
    expect(r.output_config).toMatchObject({ effort: "medium", format: { type: "json_schema" } });
    expect(r.system).toEqual([{ type: "text", text: "rules", cache_control: { type: "ephemeral" } }]);
    expect(r.messages).toEqual([
      {
        role: "user",
        content: [
          { type: "document", title: "x", source: { type: "base64", media_type: "application/pdf", data: "JVBERg==" } },
          { type: "text", text: "File name: x" },
        ],
      },
    ]);
    expect(r).not.toHaveProperty("thinking");
    expect(r).not.toHaveProperty("tool_choice");
  });

  it("sends a photo as an image and a text file as a text document", async () => {
    const { client, requests } = fakeClient({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(reply) }] });
    const model = new ClaudeFilingModel(undefined, client);
    await model.propose(request("image", "image/jpeg; name=x.jpg"));
    await model.propose(request("text", "text/plain", new TextEncoder().encode("Total 12,00 EUR")));
    const first = (r: Record<string, unknown>) => (r.messages as { content: unknown[] }[])[0]!.content[0];
    expect(first(requests[0]!)).toEqual({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: "JVBERg==" } });
    expect(first(requests[1]!)).toEqual({
      type: "document",
      title: "x",
      source: { type: "text", media_type: "text/plain", data: "Total 12,00 EUR" },
    });
  });

  it("has no proposal when Claude and its fallback refuse, and fails loudly on a cut-off reply", async () => {
    const refused = fakeClient({ stop_reason: "refusal", content: [] });
    expect(await new ClaudeFilingModel(undefined, refused.client).propose(request("pdf", "application/pdf"))).toBeNull();
    const cut = fakeClient({ stop_reason: "max_tokens", content: [{ type: "text", text: "{" }] });
    await expect(new ClaudeFilingModel(undefined, cut.client).propose(request("pdf", "application/pdf"))).rejects.toThrow("cut off");
  });
});

describe("parseProposal", () => {
  it("keeps only the known fields", () => {
    const parsed = parseProposal(JSON.stringify({ ...reply, extra: 1, expenses: [{ ...reply.expenses[0], extra: 2 }] }));
    expect(parsed).toEqual(reply);
  });

  it.each([
    ["an unknown type", { document_type: "letter" }],
    ["an unknown confidence", { confidence: "sure" }],
    ["a number for an amount", { expenses: [{ ...reply.expenses[0], amount: 1234.56 }] }],
    ["a renewal kind that doesn't exist", { renewals: [{ kind: "mooring", title: "x", reference: null, expires_on: null }] }],
    ["a fractional item number", { maintenance: [{ ...reply.maintenance[0], existing_item: 1.5 }] }],
    ["a missing list", { renewals: undefined }],
    ["an odd separator", { decimal_separator: "'" }],
  ])("refuses %s", (_name, change) => {
    expect(() => parseProposal(JSON.stringify({ ...reply, ...change }))).toThrow("expected shape");
  });

  it("refuses something that isn't JSON or an object", () => {
    expect(() => parseProposal("not json")).toThrow();
    expect(() => parseProposal("[]")).toThrow("expected shape");
  });
});
