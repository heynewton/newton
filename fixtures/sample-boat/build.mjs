// Builds the sample boat's PDFs and .eml files from the text sources in documents/ and the
// email list below. Output is deterministic, so running it again without changes gives the
// same bytes. Run from the repo root: node fixtures/sample-boat/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const boat = JSON.parse(readFileSync(join(here, "boat.json"), "utf8")).boat;
const BOAT_ADDRESS = boat.inboundAddress;

const documents = {
  "insurance-certificate": "Test boat insurance certificate 2026-27",
  registration: "Test boat registration certificate",
  "yard-invoice": "Example Point Boatyard invoice EPB-2026-0917",
  "manual-excerpt": "Sample Marine SM-30 owner's manual, maintenance section",
  "sail-loft-invoice": "Voilerie Exemple facture VE-2026-0412",
};

const emails = [
  {
    file: "01-insurance-certificate.eml",
    from: "Alex Sample <alex@example.com>",
    date: "Tue, 14 Apr 2026 18:22:05 +0000",
    subject: "Fwd: Your policy documents SAMPLE-POL-000123",
    body: [
      "Insurance for the new season, for the boat file.",
      "",
      "---------- Forwarded message ---------",
      "From: Example Mutual Marine <policies@insurer.example.com>",
      "Date: Tue, 14 Apr 2026 09:10:00 +0000",
      "Subject: Your policy documents SAMPLE-POL-000123",
      "",
      "Dear Alex Sample,",
      "",
      "Thank you for renewing. Your certificate of insurance is attached.",
      "Policy period: 2026-05-01 to 2027-04-30.",
      "",
      "Example Mutual Marine",
    ],
    attachments: ["insurance-certificate"],
  },
  {
    file: "02-registration.eml",
    from: "Jordan Fictional <jordan@example.com>",
    date: "Sat, 18 Jan 2025 10:04:51 +0000",
    subject: "Registration certificate",
    body: [
      "Scan of the registration that came in the post. It is good until the end of 2026.",
      "",
      "Jordan",
    ],
    attachments: ["registration"],
  },
  {
    file: "03-yard-invoice.eml",
    from: "Sam Placeholder <sam@example.net>",
    date: "Sat, 03 Oct 2026 16:45:12 +0000",
    subject: "Fwd: Invoice EPB-2026-0917 - Test boat",
    body: [
      "Haul-out and engine service. I paid it on my card, so please split it.",
      "",
      "---------- Forwarded message ---------",
      "From: Example Point Boatyard <office@boatyard.example.net>",
      "Date: Fri, 02 Oct 2026 15:30:00 +0000",
      "Subject: Invoice EPB-2026-0917 - Test boat",
      "",
      "Hello, please find attached our invoice for the work on Test boat.",
      "Total due: USD 1,676.90 by 2026-11-01.",
      "",
      "Example Point Boatyard",
    ],
    attachments: ["yard-invoice"],
  },
  {
    file: "04-engine-manual.eml",
    from: "Alex Sample <alex.sample@example.org>",
    date: "Sun, 11 Oct 2026 08:15:40 +0000",
    subject: "Engine manual, maintenance pages",
    body: ["The maintenance pages from the engine manual, so Newton knows the intervals."],
    attachments: ["manual-excerpt"],
  },
  {
    // Not a member of the boat: Newton should hold this message, not file it.
    file: "05-unknown-sender.eml",
    from: "Billing Desk <billing@unknown-sender.example.net>",
    date: "Wed, 14 Oct 2026 03:12:09 +0000",
    subject: "Invoice overdue - pay now",
    body: ["Your invoice is overdue. See the attachment and pay today."],
    attachments: ["yard-invoice"],
  },
];

/**
 * A PDF with the text in Courier, so tables keep their columns. A form feed on its own line
 * starts a new page. Objects 1-6 are laid out as for a one-page PDF, and each later page adds a
 * page and a content object after them, so one-page PDFs don't change.
 */
function textToPdf(text, title) {
  const pages = text.replace(/\n$/, "").split("\n\f\n");
  const escape = (s) => s.replace(/[\\()]/g, (c) => `\\${c}`);
  const contents = pages.map((page, p) => {
    const lines = page.split("\n");
    if (lines.length > 56) throw new Error(`${title}: page ${p + 1} has ${lines.length} lines, more than fit`);
    const content = [
      "BT",
      "/F1 9.5 Tf",
      "13 TL",
      "48 750 Td",
      ...lines.map((line, i) => `${i === 0 ? "" : "T* "}(${escape(line)}) Tj`),
      "ET",
    ].join("\n");
    return `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`;
  });
  // Page p is object 3 (p = 0) or 7 + 2(p - 1); its content follows it.
  const pageRef = (p) => (p === 0 ? 3 : 7 + 2 * (p - 1));
  const contentRef = (p) => (p === 0 ? 5 : pageRef(p) + 1);
  const page = (p) =>
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents ${contentRef(p)} 0 R >>`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, p) => `${pageRef(p)} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    page(0),
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
    contents[0],
    `<< /Title (${escape(title)}) /Producer (Newton sample fixtures) >>`,
    ...pages.slice(1).flatMap((_, i) => [page(i + 1), contents[i + 1]]),
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((body, i) => {
    const offset = Buffer.byteLength(pdf, "latin1");
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

function base64Lines(buffer) {
  return buffer.toString("base64").match(/.{1,76}/g).join("\r\n");
}

function buildEmail(email, pdfs) {
  const boundary = `----=_sample_${email.file.replace(/\W/g, "_")}`;
  const parts = [
    `--${boundary}`,
    "Content-Type: text/plain; charset=us-ascii",
    "Content-Transfer-Encoding: 7bit",
    "",
    ...email.body,
  ];
  for (const name of email.attachments) {
    parts.push(
      `--${boundary}`,
      `Content-Type: application/pdf; name="${name}.pdf"`,
      `Content-Disposition: attachment; filename="${name}.pdf"`,
      "Content-Transfer-Encoding: base64",
      "",
      base64Lines(pdfs[name]),
    );
  }
  parts.push(`--${boundary}--`, "");
  const headers = [
    `From: ${email.from}`,
    `To: Test boat <${BOAT_ADDRESS}>`,
    `Date: ${email.date}`,
    `Subject: ${email.subject}`,
    `Message-ID: <${email.file.replace(".eml", "")}@sample.example.com>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
  ];
  return [...headers, ...parts].join("\r\n");
}

const pdfs = {};
mkdirSync(join(here, "documents"), { recursive: true });
mkdirSync(join(here, "emails"), { recursive: true });
for (const [name, title] of Object.entries(documents)) {
  const text = readFileSync(join(here, "documents", `${name}.txt`), "latin1");
  if (/[^\n\f\x20-\x7e]/.test(text)) throw new Error(`${name}.txt: use plain ASCII only`);
  pdfs[name] = textToPdf(text, title);
  writeFileSync(join(here, "documents", `${name}.pdf`), pdfs[name]);
}
for (const email of emails) {
  writeFileSync(join(here, "emails", email.file), buildEmail(email, pdfs));
}
console.log(`Wrote ${Object.keys(pdfs).length} PDFs and ${emails.length} emails.`);
