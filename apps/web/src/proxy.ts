import type { NextRequest } from "next/server";
import { refreshSession } from "@/lib/db/session";

export function proxy(request: NextRequest) {
  return refreshSession(request);
}

export const config = {
  // Every page, but not static files or images.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
