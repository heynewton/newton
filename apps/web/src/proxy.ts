import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@/lib/db/session";

export async function proxy(request: NextRequest) {
  const { response, signedIn } = await refreshSession(request);

  // A signed-in person's home is their boats, not the marketing page. /boats sends them on
  // to /boats/new, their one boat, or a picker (#32).
  if (signedIn && request.nextUrl.pathname === "/") {
    const redirect = NextResponse.redirect(new URL("/boats", request.url));
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }
  return response;
}

export const config = {
  // Every page, but not static files, images or the email-in webhook (no session there).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/email-in|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
