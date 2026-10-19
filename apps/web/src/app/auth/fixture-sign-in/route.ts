import { NextResponse, type NextRequest } from "next/server";
import { signInAsFixturePerson } from "@/lib/db/fixture-sign-in";

// Dev-only "Sign in as…" on /sign-in (#97): signs in as one of the sample boat's people, with no
// email sent. Not found where FIXTURE_SIGN_IN isn't on, and refuses any other address.
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const email = String(form?.get("email") ?? "");
  const result = await signInAsFixturePerson(email);
  if (result.ok) return NextResponse.redirect(new URL("/boats", request.url), 303);
  switch (result.reason) {
    case "disabled":
      return new NextResponse(null, { status: 404 });
    case "not_fixture":
      return NextResponse.json({ error: "Only the sample boat's people can sign in here" }, { status: 403 });
    case "unavailable":
      return NextResponse.json({ error: "Fixture sign-in is not set up here" }, { status: 503 });
    case "failed":
      return NextResponse.json({ error: "Could not sign in" }, { status: 502 });
  }
}
