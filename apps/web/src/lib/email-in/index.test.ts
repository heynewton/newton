import { readFileSync } from "node:fs";
import { join } from "node:path";
import PostalMime from "postal-mime";
import { describe, expect, it } from "vitest";
import {
  aliasesFor,
  messageFilename,
  parseMailbox,
  receiveEmail,
  safeFilename,
  storagePath,
  type EmailInStore,
  type InboundEmail,
  type MailProvider,
  type ProviderAttachment,
  type ReceivedEvent,
  type StoredFile,
} from "./index";

// The made-up sample boat and its five inbound emails (fixtures/sample-boat).
const fixtures = join(__dirname, "..", "..", "..", "..", "..", "fixtures", "sample-boat");
const boatJson = JSON.parse(readFileSync(join(fixtures, "boat.json"), "utf8")) as {
  boat: { id: string; inboundAddress: string };
  people: { id: string; verifiedSenders: string[] }[];
  memberships: { personId: string }[];
};
const BOAT_ID = boatJson.boat.id;
const [ALIAS, DOMAIN] = boatJson.boat.inboundAddress.split("@");

// What Resend would hold for one received message, made from a fixture .eml.
type Message = { event: ReceivedEvent; raw: Uint8Array; attachments: ProviderAttachment[]; blobs: Map<string, Uint8Array> };

async function fromEml(file: string, emailId = file): Promise<Message> {
  const raw = new Uint8Array(readFileSync(join(fixtures, "emails", file)));
  const parsed = await PostalMime.parse(raw, { attachmentEncoding: "arraybuffer" });
  const blobs = new Map<string, Uint8Array>();
  const attachments = parsed.attachments.map((a, i) => {
    const url = `https://download.test/${emailId}/${i}`;
    const content = new Uint8Array(a.content as ArrayBuffer);
    blobs.set(url, content);
    return {
      id: `${emailId}-att-${i}`,
      filename: a.filename,
      contentType: a.mimeType,
      contentDisposition: a.disposition,
      size: content.byteLength,
      downloadUrl: url,
    };
  });
  const mailbox = (m?: { name?: string; address?: string }) => (m?.name ? `${m.name} <${m.address}>` : `${m?.address}`);
  return {
    raw,
    blobs,
    attachments,
    event: {
      type: "email.received",
      created_at: "2026-10-14T03:12:10.000Z",
      data: {
        email_id: emailId,
        created_at: parsed.date ?? "2026-10-14T03:12:09.000Z",
        from: mailbox(parsed.from),
        to: (parsed.to ?? []).map(mailbox),
        received_for: (parsed.to ?? []).map((m) => m.address ?? ""),
        message_id: parsed.messageId ?? "",
        subject: parsed.subject ?? "",
        attachments: attachments.map((a) => ({ id: a.id, filename: a.filename, content_type: a.contentType })),
      },
    },
  };
}

class FakeProvider implements MailProvider {
  calls: string[] = [];
  constructor(private readonly messages: Message[]) {}
  private find(id: string) {
    const message = this.messages.find((m) => m.event.data.email_id === id);
    if (!message) throw new Error(`no message ${id}`);
    return message;
  }
  async getRawEmail(id: string) {
    this.calls.push(`raw ${id}`);
    return this.find(id).raw;
  }
  async getAttachments(id: string) {
    this.calls.push(`attachments ${id}`);
    return this.find(id).attachments;
  }
  async download(url: string) {
    this.calls.push(`download ${url}`);
    for (const m of this.messages) if (m.blobs.has(url)) return m.blobs.get(url)!;
    throw new Error(`no blob ${url}`);
  }
}

// Behaves like the database: one boat, its members' sign-in and verified addresses, and a
// unique key on the provider's email ID.
class MemoryStore implements EmailInStore {
  emails: (InboundEmail & { id: string; status: "filed" | "held"; personId: string | null; completed: boolean })[] = [];
  files = new Map<string, StoredFile & { inboundEmailId: string }>();
  failStoringAfter: number | null = null;

  async match(alias: string, sender: string) {
    if (alias !== ALIAS) return null;
    const member = boatJson.people.find(
      (p) =>
        boatJson.memberships.some((m) => m.personId === p.id) &&
        p.verifiedSenders.some((a) => a.toLowerCase() === sender.toLowerCase()),
    );
    return { boatId: BOAT_ID, personId: member?.id ?? null };
  }
  async hold(email: InboundEmail) {
    if (this.emails.some((e) => e.providerEmailId === email.providerEmailId)) return "duplicate" as const;
    this.emails.push({ ...email, id: `in-${this.emails.length + 1}`, status: "held", personId: null, completed: true });
    return "held" as const;
  }
  async beginFiling(email: InboundEmail, personId: string) {
    const existing = this.emails.find((e) => e.providerEmailId === email.providerEmailId);
    if (existing) return existing.completed ? ("duplicate" as const) : existing.id;
    const id = `in-${this.emails.length + 1}`;
    this.emails.push({ ...email, id, status: "filed", personId, completed: false });
    return id;
  }
  async storeFiles(email: InboundEmail, inboundEmailId: string, files: StoredFile[]) {
    for (const [index, file] of files.entries()) {
      if (this.failStoringAfter !== null && index >= this.failStoringAfter) throw new Error("storage down");
      const path = storagePath(email.boatId, inboundEmailId, index, file.filename);
      if (!this.files.has(path)) this.files.set(path, { ...file, inboundEmailId });
    }
  }
  async finishFiling(id: string) {
    this.emails.find((e) => e.id === id)!.completed = true;
  }
}

async function setup(...files: string[]) {
  const messages = await Promise.all(files.map((f) => fromEml(f)));
  const provider = new FakeProvider(messages);
  const store = new MemoryStore();
  const receive = (m: Message) => receiveEmail(m.event, { provider, store, inboundDomain: DOMAIN });
  return { messages, provider, store, receive };
}

const fixturePdf = (name: string) => new Uint8Array(readFileSync(join(fixtures, "documents", `${name}.pdf`)));

describe("receiveEmail with the sample boat's emails", () => {
  it.each([
    ["01-insurance-certificate.eml", "insurance-certificate", "00000000-0000-4000-8000-000000000101"],
    ["02-registration.eml", "registration", "00000000-0000-4000-8000-000000000103"],
    ["03-yard-invoice.eml", "yard-invoice", "00000000-0000-4000-8000-000000000102"],
    // Alex, from their second verified address rather than the one they sign in with.
    ["04-engine-manual.eml", "manual-excerpt", "00000000-0000-4000-8000-000000000101"],
  ])("files %s with its PDF as documents of the boat", async (file, pdf, sender) => {
    const { messages, store, receive } = await setup(file);
    const result = await receive(messages[0]);

    expect(result).toEqual({ outcome: "filed", boatId: BOAT_ID, inboundEmailId: expect.any(String), documents: 2 });
    expect(store.emails).toHaveLength(1);
    expect(store.emails[0]).toMatchObject({ status: "filed", personId: sender, completed: true, attachmentCount: 1 });

    const [message, attachment] = [...store.files.entries()];
    expect(message[0]).toMatch(new RegExp(`^${BOAT_ID}/email/in-1/0-.+\\.eml$`));
    expect(message[1]).toMatchObject({ type: "email", contentType: "message/rfc822" });
    expect(message[1].content).toEqual(messages[0].raw);

    expect(attachment[0]).toBe(`${BOAT_ID}/email/in-1/1-${pdf}.pdf`);
    expect(attachment[1]).toMatchObject({ type: "unsorted", contentType: "application/pdf", filename: `${pdf}.pdf` });
    expect(attachment[1].content).toEqual(fixturePdf(pdf));
  });

  it("holds 05-unknown-sender.eml without fetching or storing any of it", async () => {
    const { messages, provider, store, receive } = await setup("05-unknown-sender.eml");
    const result = await receive(messages[0]);

    expect(result).toEqual({ outcome: "held", boatId: BOAT_ID });
    expect(store.emails).toEqual([
      expect.objectContaining({
        status: "held",
        personId: null,
        fromAddress: "billing@unknown-sender.example.net",
        fromName: "Billing Desk",
        subject: "Invoice overdue - pay now",
        attachmentCount: 1,
      }),
    ]);
    expect(store.files.size).toBe(0);
    expect(provider.calls).toEqual([]);
  });

  it("files each message once when Resend delivers it twice", async () => {
    const { messages, store, receive } = await setup("03-yard-invoice.eml", "05-unknown-sender.eml");
    await receive(messages[0]);
    await receive(messages[1]);
    expect(await receive(messages[0])).toEqual({ outcome: "duplicate", boatId: BOAT_ID });
    expect(await receive(messages[1])).toEqual({ outcome: "duplicate", boatId: BOAT_ID });
    expect(store.emails).toHaveLength(2);
    expect(store.files.size).toBe(2);
  });

  it("finishes on a retry after storage failed halfway, without copies", async () => {
    const { messages, store, receive } = await setup("01-insurance-certificate.eml");
    store.failStoringAfter = 1;
    await expect(receive(messages[0])).rejects.toThrow("storage down");
    expect(store.emails[0].completed).toBe(false);
    expect(store.files.size).toBe(1);

    store.failStoringAfter = null;
    expect(await receive(messages[0])).toEqual({ outcome: "filed", boatId: BOAT_ID, inboundEmailId: expect.any(String), documents: 2 });
    expect(store.emails).toHaveLength(1);
    expect(store.files.size).toBe(2);
  });

  it("ignores mail to an address that isn't a boat's", async () => {
    const { messages, store, receive } = await setup("01-insurance-certificate.eml");
    const event = structuredClone(messages[0].event);
    event.data.received_for = [`nobody@${DOMAIN}`];
    expect(await receiveEmail(event, { provider: new FakeProvider([]), store, inboundDomain: DOMAIN })).toEqual({
      outcome: "unknown_address",
    });
    expect(await receive({ ...messages[0], event: { ...messages[0].event } })).toMatchObject({ outcome: "filed" });
  });

  it("only looks at addresses on the inbound domain", async () => {
    const { messages, store } = await setup("01-insurance-certificate.eml");
    const result = await receiveEmail(messages[0].event, {
      provider: new FakeProvider(messages),
      store,
      inboundDomain: "boats.heynewton.app",
    });
    expect(result).toEqual({ outcome: "unknown_address" });
  });

  it("keeps inline images in the original message only", async () => {
    const { messages, store, receive } = await setup("02-registration.eml");
    messages[0].attachments.unshift({
      id: "logo",
      filename: "logo.png",
      contentType: "image/png",
      contentDisposition: "inline",
      size: 3,
      downloadUrl: "https://download.test/logo",
    });
    expect(await receive(messages[0])).toMatchObject({ outcome: "filed", documents: 2 });
    expect([...store.files.values()].map((f) => f.filename)).not.toContain("logo.png");
  });
});

describe("aliasesFor", () => {
  const event = (data: Partial<ReceivedEvent["data"]>): ReceivedEvent => ({
    type: "email.received",
    created_at: "",
    data: { email_id: "e", created_at: "", from: "", to: [], message_id: "", subject: "", attachments: [], ...data },
  });

  it("prefers who the message was delivered to, which includes Bcc", () => {
    const e = event({ to: ["Someone <someone@example.com>"], received_for: ["Kittiwake-X7@Boats.HeyNewton.app"] });
    expect(aliasesFor(e, "boats.heynewton.app")).toEqual(["kittiwake-x7"]);
  });

  it("falls back to To and Cc, in order and without repeats", () => {
    const e = event({
      to: ["A <a@boats.heynewton.app>", "b@elsewhere.example"],
      cc: ["a@boats.heynewton.app", "c@boats.heynewton.app"],
    });
    expect(aliasesFor(e, "boats.heynewton.app")).toEqual(["a", "c"]);
  });

  it("doesn't match a look-alike domain", () => {
    const e = event({ to: ["a@evilboats.heynewton.app", "b@boats.heynewton.app.example"] });
    expect(aliasesFor(e, "boats.heynewton.app")).toEqual([]);
  });
});

describe("parseMailbox", () => {
  it.each([
    ["Alex Sample <Alex@Example.com>", { address: "alex@example.com", name: "Alex Sample" }],
    ['"Sample, Alex" <alex@example.com>', { address: "alex@example.com", name: "Sample, Alex" }],
    ["<alex@example.com>", { address: "alex@example.com", name: null }],
    [" alex@example.com ", { address: "alex@example.com", name: null }],
    ["Alex <Sample> <alex@example.com>", { address: "alex@example.com", name: "Alex <Sample>" }],
  ])("%s", (value, expected) => {
    expect(parseMailbox(value)).toEqual(expected);
  });

  it("stays fast on long hostile input", () => {
    const start = performance.now();
    parseMailbox(`${" ".repeat(100_000)}x`);
    parseMailbox(`"${" ".repeat(100_000)}<a@b>`);
    safeFilename(`${"-".repeat(100_000)}x`, "f");
    expect(performance.now() - start).toBeLessThan(200);
  });
});

describe("file names", () => {
  it("keeps storage paths to safe characters and the extension", () => {
    expect(safeFilename("Facture n°12 (été).pdf", "x")).toBe("Facture-n-12-ete-.pdf");
    expect(safeFilename("../../etc/passwd", "x")).toBe("etc-passwd");
    expect(safeFilename("", "attachment-1")).toBe("attachment-1");
    expect(storagePath("b", "e", 2, "a b.pdf")).toBe("b/email/e/2-a-b.pdf");
  });

  it("names the original message after its subject", () => {
    expect(messageFilename("Fwd: Invoice EPB-2026-0917 / Kittiwake")).toBe("Fwd: Invoice EPB-2026-0917 Kittiwake.eml");
    expect(messageFilename("")).toBe("Email.eml");
    expect(messageFilename(null)).toBe("Email.eml");
  });
});
