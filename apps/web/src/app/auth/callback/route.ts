import { NextResponse, type NextRequest } from "next/server";
import { finishSignIn } from "@/lib/db";

// Where the magic link lands: swap its code for a session, then go to the person's boats.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const signedIn = code ? await finishSignIn(code) : false;
  const destination = signedIn ? "/boats" : "/sign-in/link-expired";
  return NextResponse.redirect(new URL(destination, request.url));
}
