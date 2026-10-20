import { Zip, ZipDeflate, ZipPassThrough } from "fflate";

// Builds a boat's export archive (#16, format in docs/export.md) as a stream, so a large boat is
// sent while it is read instead of being held in memory first. Knows nothing about the database:
// lib/db/export.ts reads the boat and hands its rows and files here.

// Bumped when the archive changes in a way a reader would notice: a file renamed or removed, or
// a field whose meaning changes. New tables and new columns don't bump it.
export const EXPORT_FORMAT_VERSION = 1;

export type ExportTable = {
  // The file's name in the archive, without `.json`, e.g. "expenses".
  name: string;
  rows: unknown[];
};

export type ExportFile = {
  // Where it goes in the archive, under `files/`.
  path: string;
  documentId: string;
  // Opened only when its turn comes, so one file at a time is in memory.
  open: () => Promise<ReadableStream<Uint8Array> | Uint8Array>;
};

export type ExportInput = {
  exportedAt: Date;
  boat: { id: string; name: string };
  exportedBy: { personId: string; role: string };
  tables: ExportTable[];
  files: ExportFile[];
};

export type ManifestFile = {
  path: string;
  document_id: string | null;
  size_bytes: number;
  sha256: string;
};

export type Manifest = {
  format: "newton-boat-export";
  format_version: number;
  exported_at: string;
  boat: { id: string; name: string };
  exported_by: { person_id: string; role: string };
  tables: { name: string; path: string; rows: number }[];
  files: ManifestFile[];
  excluded: string[];
};

// What the archive leaves out, and why. docs/export.md says the same at more length.
export const EXCLUDED = [
  "document_chunks: search passages and their embeddings, recomputed from the files in files/.",
  "sender_addresses: each person's own forwarding addresses, private to them.",
  "reminders_sent: the log of which reminder emails went to whom, private to each recipient.",
  "people's email addresses and sign-in details: only each member's ID and name are included.",
];

// The archive's file name, e.g. "kittiwake-export-2026-10-20.zip".
export function archiveFilename(boatName: string, exportedAt: Date): string {
  const slug =
    boatName
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40)
      .replace(/-+$/, "") || "boat";
  return `${slug}-export-${exportedAt.toISOString().slice(0, 10)}.zip`;
}

// A path inside the zip that unpacks where it says: no leading slash, no "..", no backslashes,
// no empty or control characters. Storage paths are written by Newton, but a filename in them
// came from an email.
export function safeArchivePath(path: string): string {
  const parts = path
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.replace(/[\u0000-\u001f\u007f]/g, "").trim())
    .filter((part) => part !== "" && part !== "." && part !== "..");
  return parts.length > 0 ? parts.join("/") : "unnamed";
}

const json = (value: unknown) => new TextEncoder().encode(JSON.stringify(value, null, 2) + "\n");

async function* chunksOf(source: ReadableStream<Uint8Array> | Uint8Array): AsyncGenerator<Uint8Array> {
  if (source instanceof Uint8Array) {
    yield source;
    return;
  }
  const reader = source.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

async function sha256Hex(chunks: Uint8Array[]): Promise<string> {
  // Web Crypto has no incremental digest, so hash per file from its chunks. One file is in
  // memory at a time anyway (Storage downloads it whole).
  const total = chunks.reduce((n, c) => n + c.byteLength, 0);
  const all = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    all.set(c, offset);
    offset += c.byteLength;
  }
  const digest = await crypto.subtle.digest("SHA-256", all);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

// The zip's bytes, produced as the reader asks for them: each pull writes one more entry, so a
// slow download slows the reads from Storage instead of filling memory. If a file can't be read
// the stream fails, and the browser reports a failed download rather than saving a partial zip.
//
// Order: the tables, then the files, then manifest.json last, so the manifest lists every file
// with its size and checksum. An archive without manifest.json is incomplete.
export function buildExportArchive(input: ExportInput): ReadableStream<Uint8Array> {
  const pending: Uint8Array[] = [];
  let zipError: Error | null = null;
  const zip = new Zip((error, chunk) => {
    if (error) zipError = error;
    else pending.push(chunk);
  });
  const mtime = input.exportedAt;

  const addWhole = (path: string, data: Uint8Array) => {
    const entry = new ZipDeflate(path, { level: 6 });
    entry.mtime = mtime;
    zip.add(entry);
    entry.push(data, true);
  };

  async function* entries(): AsyncGenerator<void> {
    const tables: Manifest["tables"] = [];
    for (const table of input.tables) {
      const path = `data/${table.name}.json`;
      addWhole(path, json(table.rows));
      tables.push({ name: table.name, path, rows: table.rows.length });
      yield;
    }

    const files: ManifestFile[] = [];
    const used = new Set<string>();
    for (const file of input.files) {
      let path = `files/${safeArchivePath(file.path)}`;
      // Two storage paths can clean up to the same name; keep both.
      for (let n = 2; used.has(path); n++) path = `files/${safeArchivePath(file.path)} (${n})`;
      used.add(path);

      // Stored as is: documents are mostly PDFs and photos, already compressed.
      const entry = new ZipPassThrough(path);
      entry.mtime = mtime;
      zip.add(entry);
      const chunks: Uint8Array[] = [];
      for await (const chunk of chunksOf(await file.open())) {
        chunks.push(chunk);
        entry.push(chunk, false);
        if (pending.length > 0) yield;
      }
      entry.push(new Uint8Array(0), true);
      files.push({
        path,
        document_id: file.documentId,
        size_bytes: chunks.reduce((n, c) => n + c.byteLength, 0),
        sha256: await sha256Hex(chunks),
      });
      yield;
    }

    const manifest: Manifest = {
      format: "newton-boat-export",
      format_version: EXPORT_FORMAT_VERSION,
      exported_at: input.exportedAt.toISOString(),
      boat: input.boat,
      exported_by: { person_id: input.exportedBy.personId, role: input.exportedBy.role },
      tables,
      files,
      excluded: EXCLUDED,
    };
    addWhole("manifest.json", json(manifest));
    zip.end();
    yield;
  }

  const steps = entries();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        while (pending.length === 0) {
          const { done } = await steps.next();
          if (zipError) throw zipError;
          if (done) {
            controller.close();
            return;
          }
        }
        controller.enqueue(pending.shift()!);
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel() {
      await steps.return(undefined);
    },
  });
}
