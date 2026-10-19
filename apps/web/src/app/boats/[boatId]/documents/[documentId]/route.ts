import { NextResponse } from "next/server";
import { getCurrentPerson, getDocumentLink } from "@/lib/db";

// Opens one of the boat's stored files. The page links here rather than to the file, so the
// signed URL is made only when someone opens it, by the server, for a member of the boat, and
// expires a minute later.
export async function GET(request: Request, { params }: RouteContext<"/boats/[boatId]/documents/[documentId]">) {
  const { boatId, documentId } = await params;
  const person = await getCurrentPerson();
  if (!person) return NextResponse.redirect(new URL("/sign-in", request.url));
  const link = await getDocumentLink(boatId, documentId);
  if (!link) return new NextResponse("Document not found", { status: 404 });
  return NextResponse.redirect(link, { headers: { "Cache-Control": "no-store" } });
}
