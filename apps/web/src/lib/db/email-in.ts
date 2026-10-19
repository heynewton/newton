import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { EmailInStore, InboundEmail, StoredFile } from "@/lib/email-in";
import { storagePath } from "@/lib/email-in";
import type { Database } from "./database.types";

// Email-in's database side (#10). The webhook has no signed-in person, so this is the one place
// that uses the server's secret key, which bypasses row-level security. It only ever writes to
// the boat that `match_inbound_email()` returned for the message.

export function emailInStoreFromEnv(): EmailInStore | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return new SupabaseEmailInStore(
    createSupabaseClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  );
}

type Client = ReturnType<typeof createSupabaseClient<Database>>;

const UNIQUE_VIOLATION = "23505";

export class SupabaseEmailInStore implements EmailInStore {
  constructor(private readonly db: Client) {}

  async match(alias: string, sender: string) {
    const { data, error } = await this.db.rpc("match_inbound_email", { alias, sender });
    if (error) throw new Error(`match_inbound_email: ${error.message}`);
    const row = data?.[0];
    return row ? { boatId: row.boat_id, personId: row.person_id } : null;
  }

  private row(email: InboundEmail) {
    return {
      boat_id: email.boatId,
      provider: "resend",
      provider_email_id: email.providerEmailId,
      message_id: email.messageId,
      from_address: email.fromAddress,
      from_name: email.fromName,
      subject: email.subject,
      received_at: email.receivedAt,
      attachment_count: email.attachmentCount,
    };
  }

  async hold(email: InboundEmail): Promise<"held" | "duplicate"> {
    const { error } = await this.db
      .from("inbound_emails")
      .insert({ ...this.row(email), status: "held", completed_at: new Date().toISOString() });
    if (error?.code === UNIQUE_VIOLATION) return "duplicate";
    if (error) throw new Error(`inbound_emails: ${error.message}`);
    return "held";
  }

  async beginFiling(email: InboundEmail, personId: string): Promise<string | "duplicate"> {
    const { data, error } = await this.db
      .from("inbound_emails")
      .insert({ ...this.row(email), status: "filed", sender_person_id: personId })
      .select("id")
      .single();
    if (!error) return data.id;
    if (error.code !== UNIQUE_VIOLATION) throw new Error(`inbound_emails: ${error.message}`);

    // Seen before: done if it finished, otherwise carry on with the same row.
    const existing = await this.db
      .from("inbound_emails")
      .select("id, completed_at")
      .eq("provider", "resend")
      .eq("provider_email_id", email.providerEmailId)
      .single();
    if (existing.error) throw new Error(`inbound_emails: ${existing.error.message}`);
    return existing.data.completed_at ? "duplicate" : existing.data.id;
  }

  async storeFiles(email: InboundEmail, inboundEmailId: string, files: StoredFile[]): Promise<void> {
    for (const [index, file] of files.entries()) {
      const path = storagePath(email.boatId, inboundEmailId, index, file.filename);
      const upload = await this.db.storage
        .from("documents")
        .upload(path, file.content, { contentType: file.contentType, upsert: false });
      // Already there from an earlier attempt: files are never overwritten.
      if (upload.error && !/already exists|duplicate/i.test(upload.error.message)) {
        throw new Error(`Storage upload ${path}: ${upload.error.message}`);
      }
      const { error } = await this.db.from("documents").upsert(
        {
          boat_id: email.boatId,
          storage_path: path,
          type: file.type,
          source: "email",
          received_at: email.receivedAt,
          filename: file.filename,
          content_type: file.contentType,
          size_bytes: file.content.byteLength,
          added_by: null,
          inbound_email_id: inboundEmailId,
        },
        { onConflict: "storage_path", ignoreDuplicates: true },
      );
      if (error) throw new Error(`documents: ${error.message}`);
    }
  }

  async finishFiling(inboundEmailId: string): Promise<void> {
    const { error } = await this.db
      .from("inbound_emails")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", inboundEmailId);
    if (error) throw new Error(`inbound_emails: ${error.message}`);
  }
}
