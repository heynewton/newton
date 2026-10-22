import { NextResponse } from "next/server";
import { SupabaseChunkStore, VoyageEmbedder, indexDocument, shouldIndex } from "@newton/indexing";
import { fileDocument, type DocumentFile } from "@newton/agent";
import { driveImportDatabase } from "@/lib/db/drive";
import { filingStoreFromEnv } from "@/lib/db/filing";
import { canInvite, getCurrentPerson, getMyBoat } from "@/lib/db";
import { importDriveFolder } from "@/lib/google-drive";
import { filingModelFromEnv, pdfText } from "@/lib/filing";

export const maxDuration = 300;

async function indexManual(
  database: NonNullable<ReturnType<typeof driveImportDatabase>>,
  documentId: string,
  boatId: string,
  pdf: Uint8Array,
) {
  await indexDocument({
    document: { id: documentId, boatId },
    pdf,
    embedder: new VoyageEmbedder(),
    store: new SupabaseChunkStore({
      from: (table) => database.from(table),
      rpc: (fn, args) => database.rpc(fn, args),
    }),
  });
}

interface ImportRequest {
  boatId?: unknown;
  folderId?: unknown;
  accessToken?: unknown;
}

export async function POST(request: Request) {
  const person = await getCurrentPerson();
  if (!person) return NextResponse.json({ error: "Sign in to import documents." }, { status: 401 });

  let input: ImportRequest;
  try {
    const body = await request.text();
    if (body.length > 20_000) return NextResponse.json({ error: "Invalid import request." }, { status: 413 });
    input = JSON.parse(body) as ImportRequest;
  } catch {
    return NextResponse.json({ error: "Invalid import request." }, { status: 400 });
  }

  if (
    typeof input.boatId !== "string" ||
    typeof input.folderId !== "string" ||
    !/^[\w-]{1,200}$/.test(input.folderId) ||
    typeof input.accessToken !== "string" ||
    input.accessToken.length < 20 ||
    input.accessToken.length > 10_000
  ) {
    return NextResponse.json({ error: "Select a Google Drive folder and try again." }, { status: 400 });
  }
  const boat = await getMyBoat(person, input.boatId);
  if (!boat || !canInvite(boat.role)) return NextResponse.json({ error: "Only owners and co-owners can import documents." }, { status: 403 });
  if (boat.deletingSince) return NextResponse.json({ error: "This boat is being deleted." }, { status: 409 });

  const database = driveImportDatabase();
  const filingStore = filingStoreFromEnv();
  const model = filingModelFromEnv();
  if (!database || !filingStore || !model) {
    return NextResponse.json({ error: "Google Drive import is not configured here." }, { status: 503 });
  }

  let importedFolder;
  try {
    importedFolder = await importDriveFolder(input.accessToken, input.folderId);
  } catch (error) {
    console.error("drive import: could not read selected folder", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Google Drive could not read that folder. Reconnect and try again." }, { status: 502 });
  }
  const { files, skipped } = importedFolder;
  const { data: existingRows, error: existingError } = await database
    .from("documents")
    .select("id, drive_file_id, type")
    .eq("boat_id", boat.boatId)
    .not("drive_file_id", "is", null);
  if (existingError) throw new Error(`Could not check imported Drive files: ${existingError.message}`);
  const existingDocuments = new Map(
    (existingRows ?? []).flatMap((row) => (row.drive_file_id ? [[row.drive_file_id, row] as const] : [])),
  );
  let imported = 0;
  let alreadyImported = 0;
  let indexed = 0;
  let retried = 0;
  const failed: { name: string; reason: string }[] = [];

  for (const source of files) {
    const existing = existingDocuments.get(source.id);
    if (existing) {
      alreadyImported++;
      if (existing.type === "unsorted") {
        try {
          const result = await fileDocument({
            documentId: existing.id,
            store: filingStore,
            model,
            extractText: pdfText,
            fileOverride: { filename: source.name, contentType: source.contentType, content: source.content },
          });
          if (result.outcome === "failed") {
            const { error } = await database.from("documents").delete().eq("id", existing.id).eq("boat_id", boat.boatId);
            if (error) throw new Error(`Could not remove a failed temporary import: ${error.message}`);
            failed.push({ name: source.name, reason: result.error ?? "Document filing failed." });
          } else if (result.outcome !== "already_filed") {
            retried++;
            if (
              result.plan?.documentType === "manual" &&
              shouldIndex({ type: "manual", contentType: source.contentType })
            ) {
              await indexManual(database, existing.id, boat.boatId, source.content);
              indexed++;
            }
          }
        } catch (error) {
          failed.push({ name: source.name, reason: error instanceof Error ? error.message : "Could not process this file." });
        }
        continue;
      }
      if (existing.type === "manual" && shouldIndex({ type: "manual", contentType: source.contentType })) {
        const { count, error } = await database
          .from("document_chunks")
          .select("id", { count: "exact", head: true })
          .eq("document_id", existing.id)
          .eq("boat_id", boat.boatId);
        if (error) {
          failed.push({ name: source.name, reason: `Could not check manual search index: ${error.message}` });
        } else if (count === 0) {
          try {
            await indexManual(database, existing.id, boat.boatId, source.content);
            indexed++;
          } catch (error) {
            failed.push({ name: source.name, reason: error instanceof Error ? error.message : "Manual indexing failed." });
          }
        }
      }
      continue;
    }
    const sourceUrl =
      source.webViewLink && new URL(source.webViewLink).hostname === "drive.google.com"
        ? source.webViewLink
        : `https://drive.google.com/open?id=${encodeURIComponent(source.id)}`;
    const { data: document, error: insertError } = await database
      .from("documents")
      .insert({
        boat_id: boat.boatId,
        source: "drive",
        storage_path: null,
        drive_file_id: source.id,
        source_url: sourceUrl,
        source_modified_at: source.modifiedTime,
        filename: source.name,
        content_type: source.contentType,
        size_bytes: source.content.byteLength,
        added_by: person.id,
      })
      .select("id")
      .single();
    if (insertError) {
      if (insertError.code === "23505") {
        alreadyImported++;
        continue;
      }
      throw new Error(`Could not save Drive document metadata: ${insertError.message}`);
    }

    const file: DocumentFile = {
      filename: source.name,
      contentType: source.contentType,
      content: source.content,
    };
    try {
      const result = await fileDocument({
        documentId: document.id,
        store: filingStore,
        model,
        extractText: pdfText,
        fileOverride: file,
      });
      if (result.outcome === "failed") {
        const { error } = await database.from("documents").delete().eq("id", document.id).eq("boat_id", boat.boatId);
        if (error) throw new Error(`Could not remove a failed temporary import: ${error.message}`);
        failed.push({ name: source.name, reason: result.error ?? "Document filing failed." });
        continue;
      }
      if (result.plan?.documentType === "manual" && shouldIndex({ type: "manual", contentType: source.contentType })) {
        await indexManual(database, document.id, boat.boatId, source.content);
        indexed++;
      }
      imported++;
    } catch (error) {
      failed.push({ name: source.name, reason: error instanceof Error ? error.message : "Could not process this file." });
    }
  }

  return NextResponse.json({
    imported,
    alreadyImported,
    indexed,
    retried,
    skipped,
    failed,
  });
}
