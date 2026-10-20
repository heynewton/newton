import "server-only";
import type { DocumentFile, FilingContext, FilingStore, RenewalKind, SavedFiling } from "@newton/agent";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "./database.types";

// Filing's database side (#11). Like email-in it runs as the server, with the secret key that
// bypasses row-level security, and only ever touches the boat of the document it is filing:
// every read is by that document's boat, and `save_document_filing()` writes records to it.

type Client = ReturnType<typeof createSupabaseClient<Database>>;

export interface ServerFilingStore extends FilingStore {
  /** The unsorted documents stored from one inbound email. */
  documentsOfEmail(inboundEmailId: string): Promise<string[]>;
  /** Unsorted documents not yet filed, or whose filing failed fewer than `maxAttempts` times. */
  waiting(maxAttempts: number, limit: number): Promise<string[]>;
}

export function filingStoreFromEnv(): ServerFilingStore | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return new SupabaseFilingStore(
    createSupabaseClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  );
}

function check<T>(what: string, result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data;
}

export class SupabaseFilingStore implements ServerFilingStore {
  constructor(private readonly db: Client) {}

  async load(documentId: string): Promise<{ file: DocumentFile; context: FilingContext } | null> {
    const filing = check(
      "document_filings",
      await this.db.from("document_filings").select("status").eq("document_id", documentId).maybeSingle(),
    );
    if (filing && filing.status !== "failed") return null;

    const document = check(
      "documents",
      await this.db
        .from("documents")
        .select("boat_id, storage_path, filename, content_type, type, added_by, inbound_email_id")
        .eq("id", documentId)
        .maybeSingle(),
    );
    // Gone, or sorted by a person already: nothing to file.
    if (!document || document.type !== "unsorted") return null;
    const boatId = document.boat_id;

    const email = document.inbound_email_id
      ? check(
          "inbound_emails",
          await this.db
            .from("inbound_emails")
            .select("subject, sender_person_id")
            .eq("id", document.inbound_email_id)
            .eq("boat_id", boatId)
            .maybeSingle(),
        )
      : null;

    const [maintenance, renewals, expenses, download] = await Promise.all([
      this.db
        .from("maintenance_items")
        .select("id, title, last_done_on, last_done_engine_hours, every_months, every_engine_hours")
        .eq("boat_id", boatId)
        .order("title"),
      this.db.from("renewals").select("kind, expires_on").eq("boat_id", boatId),
      this.db.from("expenses").select("amount_cents, currency, spent_on").eq("boat_id", boatId),
      this.db.storage.from("documents").download(document.storage_path),
    ]);
    if (download.error) throw new Error(`Storage download ${document.storage_path}: ${download.error.message}`);

    return {
      file: {
        filename: document.filename,
        contentType: document.content_type,
        content: new Uint8Array(await download.data.arrayBuffer()),
      },
      context: {
        filename: document.filename,
        emailSubject: email?.subject ?? null,
        // The member who forwarded it (or uploaded it) is taken to have paid.
        payerId: email?.sender_person_id ?? document.added_by,
        maintenance: (check("maintenance_items", maintenance) ?? []).map((m) => ({
          id: m.id,
          title: m.title,
          lastDoneOn: m.last_done_on,
          lastDoneEngineHours: m.last_done_engine_hours,
          everyMonths: m.every_months,
          everyEngineHours: m.every_engine_hours,
        })),
        renewals: (check("renewals", renewals) ?? []).map((r) => ({ kind: r.kind as RenewalKind, expiresOn: r.expires_on })),
        expenses: (check("expenses", expenses) ?? []).map((e) => ({ amountCents: e.amount_cents, currency: e.currency, spentOn: e.spent_on })),
      },
    };
  }

  async save(documentId: string, { plan, proposal, model }: SavedFiling): Promise<{ alreadyFiled: boolean }> {
    const rows = check(
      "save_document_filing",
      await this.db.rpc("save_document_filing", {
        document_id: documentId,
        status: plan.status,
        // The generated types don't know these SQL arguments can be null.
        document_type: plan.documentType as Database["public"]["Enums"]["document_type"],
        confidence: plan.confidence as string,
        summary: plan.summary as string,
        vendor: plan.vendor as string,
        proposal: proposal as unknown as Json,
        flags: plan.flags as unknown as Json,
        model,
        records: plan.records as unknown as Json,
      }),
    );
    return { alreadyFiled: rows?.[0]?.already_filed ?? false };
  }

  async fail(documentId: string, error: string, model: string): Promise<void> {
    check("record_document_filing_failure", await this.db.rpc("record_document_filing_failure", { document_id: documentId, error, model }));
  }

  async documentsOfEmail(inboundEmailId: string): Promise<string[]> {
    const rows = check(
      "documents",
      await this.db
        .from("documents")
        .select("id")
        .eq("inbound_email_id", inboundEmailId)
        .eq("type", "unsorted")
        .order("storage_path"),
    );
    return (rows ?? []).map((r) => r.id);
  }

  async waiting(maxAttempts: number, limit: number): Promise<string[]> {
    const rows = check("documents_to_file", await this.db.rpc("documents_to_file", { max_attempts: maxAttempts, max_rows: limit }));
    return (rows ?? []).map((r) => r.id);
  }
}
