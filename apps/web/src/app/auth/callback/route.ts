import { NextResponse, type NextRequest } from "next/server";
import { finishSignIn } from "@/lib/db";

// Where the magic link and Google sign-in land: swap the code for a session, then go to the
// person's boats. Google sends an error instead of a code when the person cancels.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (params.has("error")) {
    return NextResponse.redirect(new URL("/sign-in?error=google", request.url));
  }
  const code = params.get("code");
  const signedIn = code ? await finishSignIn(code) : false;
  const destination = signedIn ? "/boats" : "/sign-in/link-expired";
  return NextResponse.redirect(new URL(destination, request.url));
}
