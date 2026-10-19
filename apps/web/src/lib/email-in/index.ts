// Email-in (#10): turns a message Resend received for a boat's address into stored documents of
// that boat, or holds it when the sender isn't one of the boat's members.
//
// This module only decides what happens. The provider (`MailProvider`, Resend's API) and the
// database (`EmailInStore`, in `@/lib/db/email-in`) are passed in, so the tests run it on the
// fixture emails without either.

// The `email.received` webhook event: metadata only. The body and attachments come from the API.
export type ReceivedEvent = {
  type: "email.received";
  created_at: string;
  data: {
    email_id: string;
    created_at: string;
    from: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    received_for?: string[];
    message_id: string;
    subject: string;
    attachments: { id: string; filename: string | null; content_type: string }[];
  };
};

export type ProviderAttachment = {
  id: string;
  filename: string | null;
  contentType: string;
  contentDisposition: string | null;
  size: number;
  downloadUrl: string;
};

export interface MailProvider {
  // The original message (RFC 822), as received.
  getRawEmail(emailId: string): Promise<Uint8Array>;
  getAttachments(emailId: string): Promise<ProviderAttachment[]>;
  download(url: string): Promise<Uint8Array>;
}

export type StoredFile = {
  // As sent, for showing and downloading. The storage path uses a cleaned-up copy.
  filename: string;
  contentType: string;
  type: "email" | "unsorted";
  content: Uint8Array;
};

export type InboundEmail = {
  boatId: string;
  providerEmailId: string;
  messageId: string | null;
  fromAddress: string;
  fromName: string | null;
  subject: string | null;
  receivedAt: string;
  attachmentCount: number;
};

export interface EmailInStore {
  // The boat whose address this is, and the member who sent it (null if not a member).
  match(alias: string, sender: string): Promise<{ boatId: string; personId: string | null } | null>;
  // Records the message, unless it was already done (Resend retries webhooks).
  hold(email: InboundEmail): Promise<"held" | "duplicate">;
  // Starts filing: returns the message's ID, or "duplicate" if it was already filed in full.
  beginFiling(email: InboundEmail, personId: string): Promise<string | "duplicate">;
  // Stores the files as documents of the boat, received when the email was. Safe to repeat
  // after a failure.
  storeFiles(email: InboundEmail, inboundEmailId: string, files: StoredFile[]): Promise<void>;
  finishFiling(inboundEmailId: string): Promise<void>;
}

export type ReceiveResult =
  | { outcome: "filed"; boatId: string; documents: number }
  | { outcome: "held"; boatId: string }
  | { outcome: "duplicate"; boatId: string }
  | { outcome: "unknown_address" };

// A boat's email address, or null where email-in isn't set up (no inbound domain).
export function boatEmailAddress(alias: string, inboundDomain: string | undefined): string | null {
  return inboundDomain ? `${alias}@${inboundDomain.toLowerCase()}` : null;
}

// Splits `Name <address>` into its parts. A bare address has no name.
// String slicing rather than a regular expression, since the value comes from whoever sent the
// mail and a backtracking pattern can be made slow.
export function parseMailbox(value: string): { address: string; name: string | null } {
  const trimmed = value.trim();
  const open = trimmed.lastIndexOf("<");
  if (open >= 0 && trimmed.endsWith(">")) {
    const address = trimmed.slice(open + 1, -1).trim().toLowerCase();
    let name = trimmed.slice(0, open).trim();
    if (name.length >= 2 && name.startsWith('"') && name.endsWith('"')) name = name.slice(1, -1).trim();
    return { address, name: name || null };
  }
  return { address: trimmed.toLowerCase(), name: null };
}

// Drops these characters from both ends.
function trimChars(value: string, chars: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && chars.includes(value[start])) start++;
  while (end > start && chars.includes(value[end - 1])) end--;
  return value.slice(start, end);
}

// The boat aliases a message was sent to on our inbound domain, in order, without repeats.
// `received_for` is who the message was delivered to (including Bcc); `to` and `cc` are the
// headers, for a provider that leaves `received_for` out.
export function aliasesFor(event: ReceivedEvent, inboundDomain: string): string[] {
  const domain = inboundDomain.toLowerCase();
  const { received_for, to, cc } = event.data;
  const candidates = received_for?.length ? received_for : [...to, ...(cc ?? [])];
  const aliases: string[] = [];
  for (const value of candidates) {
    const { address } = parseMailbox(value);
    const at = address.lastIndexOf("@");
    if (at < 1 || address.slice(at + 1) !== domain) continue;
    const alias = address.slice(0, at);
    if (!aliases.includes(alias)) aliases.push(alias);
  }
  return aliases;
}

// A name that is safe as the last part of a storage path, keeping the extension.
export function safeFilename(name: string | null, fallback: string): string {
  const cleaned = (name ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-");
  const trimmed = trimChars(trimChars(cleaned, "-.").slice(-100), "-.");
  return trimmed || fallback;
}

// The original message's filename, shown on the boat's page: its subject, or "Email".
export function messageFilename(subject: string | null): string {
  const base = (subject ?? "").replace(/[\u0000-\u001f/\\\s]+/g, " ").trim().slice(0, 120);
  return `${base || "Email"}.eml`;
}

// Where a file of a filed email goes in the boat's folder. Deterministic, so a retried webhook
// writes to the same place instead of making copies.
export function storagePath(boatId: string, inboundEmailId: string, index: number, filename: string): string {
  return `${boatId}/email/${inboundEmailId}/${index}-${safeFilename(filename, "file")}`;
}

export async function receiveEmail(
  event: ReceivedEvent,
  deps: { provider: MailProvider; store: EmailInStore; inboundDomain: string },
): Promise<ReceiveResult> {
  const { provider, store, inboundDomain } = deps;
  const sender = parseMailbox(event.data.from);

  // A message to several boats (or to a boat and someone else) is filed for the first boat
  // whose address it was sent to.
  let match: { boatId: string; personId: string | null } | null = null;
  for (const alias of aliasesFor(event, inboundDomain)) {
    match = await store.match(alias, sender.address);
    if (match) break;
  }
  if (!match) return { outcome: "unknown_address" };

  const email: InboundEmail = {
    boatId: match.boatId,
    providerEmailId: event.data.email_id,
    messageId: event.data.message_id || null,
    fromAddress: sender.address,
    fromName: sender.name,
    subject: event.data.subject || null,
    receivedAt: event.data.created_at,
    attachmentCount: event.data.attachments.length,
  };

  // Not from a member: keep who sent it and what about, but none of its content.
  if (!match.personId) {
    const held = await store.hold(email);
    return { outcome: held, boatId: match.boatId };
  }

  const inboundEmailId = await store.beginFiling(email, match.personId);
  if (inboundEmailId === "duplicate") return { outcome: "duplicate", boatId: match.boatId };

  const files: StoredFile[] = [
    {
      filename: messageFilename(email.subject),
      contentType: "message/rfc822",
      type: "email",
      content: await provider.getRawEmail(email.providerEmailId),
    },
  ];
  // Inline parts (logos and images in a signature) stay inside the original message only.
  const attachments = (await provider.getAttachments(email.providerEmailId)).filter(
    (a) => a.contentDisposition !== "inline",
  );
  for (const [index, attachment] of attachments.entries()) {
    files.push({
      filename: attachment.filename?.trim().slice(0, 255) || `attachment-${index + 1}`,
      contentType: attachment.contentType || "application/octet-stream",
      type: "unsorted",
      content: await provider.download(attachment.downloadUrl),
    });
  }

  await store.storeFiles(email, inboundEmailId, files);
  await store.finishFiling(inboundEmailId);
  return { outcome: "filed", boatId: match.boatId, documents: files.length };
}
