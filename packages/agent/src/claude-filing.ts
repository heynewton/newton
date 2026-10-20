import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_MODEL } from "./claude";
import {
  CONFIDENCES,
  DOCUMENT_TYPES,
  RENEWAL_KINDS,
  type FilingModel,
  type FilingProposal,
  type FilingRequest,
} from "./filing";

const nullable = (schema: object) => ({ anyOf: [schema, { type: "null" }] });
const text = { type: "string" };

/** The proposal's shape, enforced by structured outputs. */
export const PROPOSAL_SCHEMA = {
  type: "object",
  properties: {
    document_type: { type: "string", enum: [...DOCUMENT_TYPES] },
    confidence: { type: "string", enum: [...CONFIDENCES] },
    summary: text,
    vendor: nullable(text),
    decimal_separator: nullable({ type: "string", enum: [".", ","] }),
    date_order: nullable({ type: "string", enum: ["DMY", "MDY", "YMD"] }),
    renewals: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: [...RENEWAL_KINDS] },
          title: text,
          reference: nullable(text),
          expires_on: nullable(text),
        },
        required: ["kind", "title", "reference", "expires_on"],
        additionalProperties: false,
      },
    },
    expenses: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: text,
          amount: text,
          currency: nullable(text),
          spent_on: nullable(text),
        },
        required: ["description", "amount", "currency", "spent_on"],
        additionalProperties: false,
      },
    },
    maintenance: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: text,
          done_on: nullable(text),
          engine_hours: nullable(text),
          next_due_on: nullable(text),
          next_due_engine_hours: nullable(text),
          existing_item: nullable({ type: "integer" }),
        },
        required: ["title", "done_on", "engine_hours", "next_due_on", "next_due_engine_hours", "existing_item"],
        additionalProperties: false,
      },
    },
  },
  required: [
    "document_type",
    "confidence",
    "summary",
    "vendor",
    "decimal_separator",
    "date_order",
    "renewals",
    "expenses",
    "maintenance",
  ],
  additionalProperties: false,
} as const;

function base64(bytes: Uint8Array): string {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64");
}

/** The file as a content block Claude reads: a PDF, an image or plain text. */
function fileBlock(request: FilingRequest): Anthropic.Beta.BetaContentBlockParam {
  const { file, kind } = request;
  const title = file.filename ?? undefined;
  switch (kind) {
    case "pdf":
      return { type: "document", title, source: { type: "base64", media_type: "application/pdf", data: base64(file.content) } };
    case "image":
      return {
        type: "image",
        source: {
          type: "base64",
          media_type: (file.contentType ?? "").split(";")[0]!.trim().toLowerCase() as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: base64(file.content),
        },
      };
    case "text":
      return { type: "document", title, source: { type: "text", media_type: "text/plain", data: new TextDecoder().decode(file.content) } };
  }
}

/**
 * Claude reading a document for filing. Reads ANTHROPIC_API_KEY (or another credential the SDK
 * finds). The system prompt is the same on every call and cached. A safety refusal is retried on
 * Anthropic's default fallback model; if that refuses too, the document waits for a person.
 */
export class ClaudeFilingModel implements FilingModel {
  private readonly client: Anthropic;

  constructor(
    readonly model: string = DEFAULT_MODEL,
    client?: Anthropic,
  ) {
    this.client = client ?? new Anthropic();
  }

  async propose(request: FilingRequest): Promise<FilingProposal | null> {
    const response = await this.client.beta.messages.create({
      model: this.model,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // Copying values off one document carefully, not a hard reasoning task.
      output_config: { effort: "medium", format: { type: "json_schema", schema: PROPOSAL_SCHEMA } },
      system: [{ type: "text", text: request.system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: [fileBlock(request), { type: "text", text: request.prompt }] }],
    });
    if (response.stop_reason === "refusal") return null;
    if (response.stop_reason === "max_tokens") throw new Error("The proposal was cut off (max_tokens)");

    const json = response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
    return parseProposal(json);
  }
}

const isString = (v: unknown): v is string => typeof v === "string";
const isNullableString = (v: unknown): v is string | null => v === null || typeof v === "string";
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const oneOf = <T extends string>(values: readonly T[], v: unknown): v is T => values.includes(v as T);

/** Parses and checks the model's JSON, so a malformed reply fails loudly instead of filing. */
export function parseProposal(json: string): FilingProposal {
  const v: unknown = JSON.parse(json);
  const bad = (what: string): never => {
    throw new Error(`The model's proposal isn't in the expected shape (${what}): ${json.slice(0, 200)}`);
  };
  if (!isObject(v)) return bad("not an object");
  if (!oneOf(DOCUMENT_TYPES, v.document_type)) bad("document_type");
  if (!oneOf(CONFIDENCES, v.confidence)) bad("confidence");
  if (!isString(v.summary) || !isNullableString(v.vendor)) bad("summary or vendor");
  if (v.decimal_separator !== null && !oneOf([".", ","], v.decimal_separator)) bad("decimal_separator");
  if (v.date_order !== null && !oneOf(["DMY", "MDY", "YMD"], v.date_order)) bad("date_order");
  if (!Array.isArray(v.renewals) || !Array.isArray(v.expenses) || !Array.isArray(v.maintenance)) bad("lists");

  const renewals = (v.renewals as unknown[]).map((r) => {
    if (!isObject(r) || !oneOf(RENEWAL_KINDS, r.kind) || !isString(r.title) || !isNullableString(r.reference) || !isNullableString(r.expires_on)) {
      return bad("renewal");
    }
    return { kind: r.kind, title: r.title, reference: r.reference, expires_on: r.expires_on };
  });
  const expenses = (v.expenses as unknown[]).map((e) => {
    if (!isObject(e) || !isString(e.description) || !isString(e.amount) || !isNullableString(e.currency) || !isNullableString(e.spent_on)) {
      return bad("expense");
    }
    return { description: e.description, amount: e.amount, currency: e.currency, spent_on: e.spent_on };
  });
  const maintenance = (v.maintenance as unknown[]).map((m) => {
    if (
      !isObject(m) ||
      !isString(m.title) ||
      !isNullableString(m.done_on) ||
      !isNullableString(m.engine_hours) ||
      !isNullableString(m.next_due_on) ||
      !isNullableString(m.next_due_engine_hours) ||
      !(m.existing_item === null || Number.isInteger(m.existing_item))
    ) {
      return bad("maintenance");
    }
    return {
      title: m.title,
      done_on: m.done_on,
      engine_hours: m.engine_hours,
      next_due_on: m.next_due_on,
      next_due_engine_hours: m.next_due_engine_hours,
      existing_item: m.existing_item as number | null,
    };
  });

  return {
    document_type: v.document_type as FilingProposal["document_type"],
    confidence: v.confidence as FilingProposal["confidence"],
    summary: v.summary as string,
    vendor: v.vendor as string | null,
    decimal_separator: v.decimal_separator as FilingProposal["decimal_separator"],
    date_order: v.date_order as FilingProposal["date_order"],
    renewals,
    expenses,
    maintenance,
  };
}
