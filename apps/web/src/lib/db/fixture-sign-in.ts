import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient, supabaseSettings } from "./client";

// Dev-only "Sign in as…" for the sample boat's people (#97). Their addresses are on reserved
// domains, so a magic link can never reach them. Instead the server makes the link with the
// secret key and finishes it straight away, which sets the session cookies. Only on where
// FIXTURE_SIGN_IN=1 (the dev site and previews, set by .github/workflows/deploy.yml), and only
// for the people below, whatever is posted.

// Test boat's people and the address each signs in with (fixtures/sample-boat/boat.json; a test
// checks the two agree).
export const FIXTURE_PEOPLE = [
  { name: "Alex Sample", email: "alex@example.com" },
  { name: "Sam Placeholder", email: "sam@example.net" },
  { name: "Jordan Fictional", email: "jordan@example.com" },
  { name: "Riley Testcase", email: "riley@example.org" },
] as const;

// Domains reserved for examples and tests (RFC 2606), which no real person's inbox is on.
const RESERVED_DOMAIN = /@(?:example\.(?:com|net|org)|(?:[a-z0-9-]+\.)*[a-z0-9-]+\.test)$/i;

export function isFixtureSignInShown(): boolean {
  return process.env.FIXTURE_SIGN_IN === "1" && supabaseSettings() !== null;
}

export function isFixtureEmail(email: string): boolean {
  return RESERVED_DOMAIN.test(email) && FIXTURE_PEOPLE.some((person) => person.email === email);
}

export type FixtureSignInResult =
  | { ok: true }
  | { ok: false; reason: "disabled" | "not_fixture" | "unavailable" | "failed" };

export async function signInAsFixturePerson(email: string): Promise<FixtureSignInResult> {
  if (!isFixtureSignInShown()) return { ok: false, reason: "disabled" };
  if (!isFixtureEmail(email)) return { ok: false, reason: "not_fixture" };
  // The secret key bypasses row-level security; here it only makes a sign-in link.
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const supabase = await createClient();
  if (!url || !secretKey || !supabase) return { ok: false, reason: "unavailable" };

  const admin = createSupabaseClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) return { ok: false, reason: "failed" };

  // Verified as the browser's client, so the session lands in its cookies.
  const { error: verifyError } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
  return verifyError ? { ok: false, reason: "failed" } : { ok: true };
}
