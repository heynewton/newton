import { NextResponse } from "next/server";
import { CONTACT_EMAIL } from "@/app/legal-page";
import { getCurrentPerson } from "@/lib/db";
import { EXPORT_MAX_FILE_BYTES, loadBoatExport } from "@/lib/db/export";
import { archiveFilename, buildExportArchive } from "@/lib/export/archive";

// Vercel's longest run for a function. The archive streams, so this bounds the download's time,
// and EXPORT_MAX_FILE_BYTES keeps a boat's files inside it.
export const maxDuration = 300;

// Downloads the boat's export archive (#16, docs/export.md). Owners and co-owners only.
export async function GET(request: Request, { params }: RouteContext<"/boats/[boatId]/export">) {
  const { boatId } = await params;
  const person = await getCurrentPerson();
  if (!person) return NextResponse.redirect(new URL("/sign-in", request.url));

  const result = await loadBoatExport(person, boatId);
  if (!result.ok) {
    const [status, message] =
      result.reason === "not_found"
        ? [404, "Boat not found"]
        : result.reason === "forbidden"
          ? [403, "Only the boat's owners and co-owners can export its data."]
          : result.reason === "being_deleted"
            ? [409, "This boat is being deleted, so its data can't be exported."]
            : [
              413,
              `This boat's files are over the ${EXPORT_MAX_FILE_BYTES / 1024 / 1024} MB a download can hold. ` +
                `Write to ${CONTACT_EMAIL} and we'll send the archive another way.`,
            ];
    return new NextResponse(message, { status, headers: { "Cache-Control": "no-store" } });
  }

  const filename = archiveFilename(result.input.boat.name, result.input.exportedAt);
  return new Response(buildExportArchive(result.input), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
