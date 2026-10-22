export const MAX_DRIVE_IMPORT_FILES = 100;
export const MAX_DRIVE_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_DRIVE_IMPORT_BYTES = 100 * 1024 * 1024;

const GOOGLE_MIME_TYPES = new Map([
  ["application/vnd.google-apps.document", "application/pdf"],
  ["application/vnd.google-apps.spreadsheet", "application/pdf"],
  ["application/vnd.google-apps.presentation", "application/pdf"],
]);
const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string | null;
  webViewLink: string | null;
  size: string | null;
}

export interface ImportedDriveFile extends DriveFile {
  contentType: string;
  content: Uint8Array;
}

export interface DriveFolderImport {
  files: ImportedDriveFile[];
  skipped: { name: string; reason: string }[];
}

interface DriveListResponse {
  files?: DriveFile[];
  nextPageToken?: string;
}

function authHeaders(accessToken: string): HeadersInit {
  const headers = new Headers();
  headers.set("Authorization", ["Bearer", accessToken].join(" "));
  return headers;
}

async function listChildren(accessToken: string, folderId: string): Promise<DriveFile[]> {
  const children: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const escapedFolderId = folderId.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const query = new URLSearchParams({
      q: "'" + escapedFolderId + "' in parents and trashed = false",
      fields: "nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink,size)",
      pageSize: "1000",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });
    if (pageToken) query.set("pageToken", pageToken);
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${query}`, {
      headers: authHeaders(accessToken),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Google Drive could not list folder contents (HTTP ${response.status})`);
    const page = (await response.json()) as DriveListResponse;
    children.push(...(page.files ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return children;
}

async function downloadFile(accessToken: string, file: DriveFile): Promise<{ contentType: string; content: Uint8Array }> {
  const exportedType = GOOGLE_MIME_TYPES.get(file.mimeType);
  const contentType = exportedType ?? file.mimeType;
  if (!exportedType && !SUPPORTED_MIME_TYPES.has(contentType)) {
    throw new Error(`Unsupported file type: ${file.mimeType}`);
  }
  const endpoint = exportedType
    ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}/export?mimeType=${encodeURIComponent(exportedType)}`
    : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`;
  const response = await fetch(endpoint, { headers: authHeaders(accessToken), cache: "no-store" });
  if (!response.ok) throw new Error(`Google Drive could not read this file (HTTP ${response.status})`);
  const declaredSize = Number(response.headers.get("content-length") ?? file.size ?? 0);
  if (declaredSize > MAX_DRIVE_FILE_BYTES) throw new Error("File is larger than 20 MiB");

  if (!response.body) throw new Error("Google Drive returned an empty file");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_DRIVE_FILE_BYTES) {
      await reader.cancel();
      throw new Error("File is larger than 20 MiB");
    }
    chunks.push(value);
  }
  const content = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    content.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { contentType, content };
}

/** Reads supported files under a selected folder without persisting their bytes. */
export async function importDriveFolder(accessToken: string, folderId: string): Promise<DriveFolderImport> {
  const files: ImportedDriveFile[] = [];
  const skipped: DriveFolderImport["skipped"] = [];
  const visited = new Set<string>();
  const queue = [folderId];
  let limitReached = false;
  let totalBytes = 0;

  while (queue.length > 0 && !limitReached) {
    const currentFolder = queue.shift()!;
    if (visited.has(currentFolder)) continue;
    visited.add(currentFolder);
    for (const child of await listChildren(accessToken, currentFolder)) {
      if (child.mimeType === FOLDER_MIME_TYPE) {
        queue.push(child.id);
        continue;
      }
      if (files.length + skipped.length >= MAX_DRIVE_IMPORT_FILES) {
        skipped.push({ name: child.name, reason: "The import limit of 100 files was reached." });
        limitReached = true;
        break;
      }
      if (!GOOGLE_MIME_TYPES.has(child.mimeType) && !SUPPORTED_MIME_TYPES.has(child.mimeType)) {
        skipped.push({ name: child.name, reason: "Unsupported file type." });
        continue;
      }
      if (Number(child.size ?? 0) > MAX_DRIVE_IMPORT_BYTES - totalBytes) {
        skipped.push({ name: child.name, reason: "The import limit of 100 MiB was reached." });
        continue;
      }
      try {
        const downloaded = await downloadFile(accessToken, child);
        if (downloaded.content.byteLength > MAX_DRIVE_IMPORT_BYTES - totalBytes) {
          skipped.push({ name: child.name, reason: "The import limit of 100 MiB was reached." });
          continue;
        }
        totalBytes += downloaded.content.byteLength;
        files.push({ ...child, contentType: downloaded.contentType, content: downloaded.content });
      } catch (error) {
        skipped.push({
          name: child.name,
          reason: error instanceof Error ? error.message : "Could not read this file.",
        });
      }
    }
  }
  if (queue.length && !limitReached) skipped.push({ name: "Remaining folders", reason: "The import limit of 100 files was reached." });
  return { files, skipped };
}
