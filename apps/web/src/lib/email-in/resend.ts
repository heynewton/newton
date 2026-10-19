import type { MailProvider, ProviderAttachment } from "./index";

// Resend's Received Emails API (docs/decisions/0003-email-provider.md). Plain fetch, no SDK:
// three calls, and the switch to another provider stays inside this file.

type ReceivedEmail = { raw?: { download_url: string; expires_at: string } | null };
type AttachmentList = {
  data: {
    id: string;
    filename?: string | null;
    size: number;
    content_type: string;
    content_disposition?: string | null;
    download_url: string;
  }[];
  has_more?: boolean;
};

export class ResendMailProvider implements MailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = "https://api.resend.com",
  ) {}

  private async api<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Resend ${path}: ${response.status}`);
    return (await response.json()) as T;
  }

  async getRawEmail(emailId: string): Promise<Uint8Array> {
    const email = await this.api<ReceivedEmail>(`/emails/receiving/${encodeURIComponent(emailId)}`);
    if (!email.raw?.download_url) throw new Error(`Resend email ${emailId} has no raw message`);
    return this.download(email.raw.download_url);
  }

  async getAttachments(emailId: string): Promise<ProviderAttachment[]> {
    const id = encodeURIComponent(emailId);
    const attachments: ProviderAttachment[] = [];
    let after: string | undefined;
    // Paginated like Resend's other lists: `limit` up to 100, then `after` the last ID.
    do {
      const query = `?limit=100${after ? `&after=${encodeURIComponent(after)}` : ""}`;
      const page = await this.api<AttachmentList>(`/emails/receiving/${id}/attachments${query}`);
      for (const a of page.data) {
        attachments.push({
          id: a.id,
          filename: a.filename ?? null,
          contentType: a.content_type,
          contentDisposition: a.content_disposition ?? null,
          size: a.size,
          downloadUrl: a.download_url,
        });
      }
      after = page.has_more && page.data.length ? page.data[page.data.length - 1].id : undefined;
    } while (after);
    return attachments;
  }

  // Download links are signed and expire after an hour; they need no API key.
  async download(url: string): Promise<Uint8Array> {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }
}
