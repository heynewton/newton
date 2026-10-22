import { afterEach, describe, expect, it, vi } from "vitest";
import { importDriveFolder } from "./index";

function driveFile(id: string, name: string, mimeType: string) {
  return {
    id,
    name,
    mimeType,
    modifiedTime: "2026-10-21T10:00:00.000Z",
    webViewLink: `https://drive.google.com/file/d/${id}/view`,
    size: "4",
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("importDriveFolder", () => {
  it("walks subfolders, exports Google Docs to PDF and returns supported file bytes", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          files: [
            driveFile("subfolder", "Manuals", "application/vnd.google-apps.folder"),
            driveFile("pdf", "invoice.pdf", "application/pdf"),
            driveFile("unsupported", "archive.zip", "application/zip"),
          ],
        }),
      )
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "application/pdf" } }))
      .mockResolvedValueOnce(Response.json({ files: [driveFile("doc", "manual", "application/vnd.google-apps.document")] }))
      .mockResolvedValueOnce(new Response(new Uint8Array([4, 5]), { headers: { "content-type": "application/pdf" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await importDriveFolder("test-token", "root");

    expect(result.files.map((file) => [file.id, file.contentType, [...file.content]])).toEqual([
      ["pdf", "application/pdf", [1, 2, 3]],
      ["doc", "application/pdf", [4, 5]],
    ]);
    expect(result.skipped).toEqual([{ name: "archive.zip", reason: "Unsupported file type." }]);
    expect(fetchMock.mock.calls[3]?.[0]).toContain("/files/doc/export");
    expect(fetchMock.mock.calls[3]?.[0]).toContain("mimeType=application%2Fpdf");
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get("Authorization")).toBe(["Bearer", "test-token"].join(" "));
  });

  it("skips a file declared larger than the per-file limit without downloading it", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ files: [driveFile("large", "large.pdf", "application/pdf")] }))
      .mockResolvedValueOnce(
        new Response(null, { headers: { "content-length": String(20 * 1024 * 1024 + 1) } }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await importDriveFolder("test-token", "root");

    expect(result.files).toEqual([]);
    expect(result.skipped).toEqual([{ name: "large.pdf", reason: "File is larger than 20 MiB" }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("enforces the per-file limit while streaming when the size is unknown", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ files: [driveFile("large", "large.pdf", "application/pdf")] }))
      .mockResolvedValueOnce(
        new Response(new Uint8Array(20 * 1024 * 1024 + 1), { headers: { "content-length": "0" } }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await importDriveFolder("test-token", "root");

    expect(result.files).toEqual([]);
    expect(result.skipped).toEqual([{ name: "large.pdf", reason: "File is larger than 20 MiB" }]);
  });

  it("limits an import to 100 files", async () => {
    const files = Array.from({ length: 101 }, (_, i) => driveFile(`id-${i}`, `file-${i}.pdf`, "application/pdf"));
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ files }))
      .mockImplementation(async () => new Response(new Uint8Array([1])));
    vi.stubGlobal("fetch", fetchMock);

    const result = await importDriveFolder("test-token", "root");

    expect(result.files).toHaveLength(100);
    expect(result.skipped.at(-1)).toEqual({ name: "file-100.pdf", reason: "The import limit of 100 files was reached." });
  });
});
