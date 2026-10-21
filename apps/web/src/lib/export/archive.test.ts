import { createHash } from "node:crypto";
import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
  EXPORT_FORMAT_VERSION,
  archiveFilename,
  buildExportArchive,
  safeArchivePath,
  type ExportInput,
  type Manifest,
} from "./archive";

async function readAll(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

function streamOf(...parts: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const part of parts) controller.enqueue(new TextEncoder().encode(part));
      controller.close();
    },
  });
}

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

const input = (overrides: Partial<ExportInput> = {}): ExportInput => ({
  exportedAt: new Date("2026-10-20T09:30:00Z"),
  boat: { id: "b1", name: "Test boat" },
  exportedBy: { personId: "p1", role: "owner" },
  tables: [
    { name: "boat", rows: [{ id: "b1", name: "Test boat" }] },
    { name: "expenses", rows: [{ id: "e1", amount_cents: 4200 }, { id: "e2", amount_cents: -100 }] },
    { name: "renewals", rows: [] },
  ],
  files: [
    { path: "b1/invoice.pdf", documentId: "d1", open: async () => streamOf("%PDF-", "invoice") },
    { path: "b1/mail/2/photo.jpg", documentId: "d2", open: async () => new TextEncoder().encode("jpeg") },
  ],
  ...overrides,
});

describe("buildExportArchive", () => {
  it("writes one JSON file per table, every file, and a manifest", async () => {
    const zip = unzipSync(await readAll(buildExportArchive(input())));
    expect(Object.keys(zip).sort()).toEqual([
      "data/boat.json",
      "data/expenses.json",
      "data/renewals.json",
      "files/b1/invoice.pdf",
      "files/b1/mail/2/photo.jpg",
      "manifest.json",
    ]);
    expect(JSON.parse(strFromU8(zip["data/expenses.json"]))).toEqual([
      { id: "e1", amount_cents: 4200 },
      { id: "e2", amount_cents: -100 },
    ]);
    expect(JSON.parse(strFromU8(zip["data/renewals.json"]))).toEqual([]);
    expect(strFromU8(zip["files/b1/invoice.pdf"])).toBe("%PDF-invoice");
    expect(strFromU8(zip["files/b1/mail/2/photo.jpg"])).toBe("jpeg");
  });

  it("describes the export in the manifest, with each file's size and checksum", async () => {
    const zip = unzipSync(await readAll(buildExportArchive(input())));
    const manifest = JSON.parse(strFromU8(zip["manifest.json"])) as Manifest;
    expect(manifest).toMatchObject({
      format: "newton-boat-export",
      format_version: EXPORT_FORMAT_VERSION,
      exported_at: "2026-10-20T09:30:00.000Z",
      boat: { id: "b1", name: "Test boat" },
      exported_by: { person_id: "p1", role: "owner" },
      tables: [
        { name: "boat", path: "data/boat.json", rows: 1 },
        { name: "expenses", path: "data/expenses.json", rows: 2 },
        { name: "renewals", path: "data/renewals.json", rows: 0 },
      ],
      files: [
        { path: "files/b1/invoice.pdf", document_id: "d1", size_bytes: 12, sha256: sha256("%PDF-invoice") },
        { path: "files/b1/mail/2/photo.jpg", document_id: "d2", size_bytes: 4, sha256: sha256("jpeg") },
      ],
    });
    expect(manifest.excluded.some((line) => line.startsWith("document_chunks"))).toBe(true);
  });

  it("works for a boat with no records and no files", async () => {
    const zip = unzipSync(await readAll(buildExportArchive(input({ tables: [], files: [] }))));
    expect(Object.keys(zip)).toEqual(["manifest.json"]);
  });

  it("opens files one at a time, as the archive is read", async () => {
    const opened: string[] = [];
    const files = ["a", "b", "c"].map((name) => ({
      path: `b1/${name}.pdf`,
      documentId: name,
      open: async () => {
        opened.push(name);
        return new TextEncoder().encode(name.repeat(1000));
      },
    }));
    const reader = buildExportArchive(input({ tables: [], files })).getReader();
    await reader.read();
    expect(opened).toEqual(["a"]);
    await reader.cancel();
  });

  it("fails the stream when a file can't be read, instead of ending a partial zip", async () => {
    const files = [{ path: "b1/gone.pdf", documentId: "d9", open: async () => Promise.reject(new Error("missing")) }];
    await expect(readAll(buildExportArchive(input({ files })))).rejects.toThrow("missing");
  });

  it("keeps two files whose paths clean up to the same name", async () => {
    const files = [
      { path: "b1/../x.pdf", documentId: "d1", open: async () => new TextEncoder().encode("1") },
      { path: "b1/x.pdf", documentId: "d2", open: async () => new TextEncoder().encode("2") },
    ];
    const zip = unzipSync(await readAll(buildExportArchive(input({ tables: [], files }))));
    expect(strFromU8(zip["files/b1/x.pdf"])).toBe("1");
    expect(strFromU8(zip["files/b1/x.pdf (2)"])).toBe("2");
  });
});

describe("safeArchivePath", () => {
  it("keeps ordinary paths", () => {
    expect(safeArchivePath("b1/mail/0-invoice.pdf")).toBe("b1/mail/0-invoice.pdf");
  });

  it("can't escape the folder it unpacks into", () => {
    expect(safeArchivePath("/../../etc/passwd")).toBe("etc/passwd");
    expect(safeArchivePath("b1\\..\\..\\x.pdf")).toBe("b1/x.pdf");
    expect(safeArchivePath("b1/./a\u0000b.pdf")).toBe("b1/ab.pdf");
    expect(safeArchivePath("../..")).toBe("unnamed");
  });
});

describe("archiveFilename", () => {
  it("names the archive after the boat and the day", () => {
    expect(archiveFilename("Test boat", new Date("2026-10-20T23:59:00Z"))).toBe("test-boat-export-2026-10-20.zip");
    expect(archiveFilename("Île de Ré II", new Date("2026-10-20T00:00:00Z"))).toBe("ile-de-re-ii-export-2026-10-20.zip");
    expect(archiveFilename("???", new Date("2026-10-20T00:00:00Z"))).toBe("boat-export-2026-10-20.zip");
  });
});
