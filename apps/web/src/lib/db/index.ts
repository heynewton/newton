import "server-only";
import { createClient, supabaseSettings } from "./client";

// The web app's only way into the database and auth. Components and pages call these
// functions, never the Supabase client, so the provider can change behind this module
// (docs/decisions/0001-auth.md). Every query runs as the signed-in person, under RLS.

export type MembershipRole = "owner" | "co_owner" | "crew" | "read_only";

export type Person = {
  id: string;
  email: string | null;
  displayName: string | null;
};

export type BoatMembership = {
  boatId: string;
  boatName: string;
  role: MembershipRole;
};

export type SignInLinkResult =
  | { ok: true }
  | { ok: false; reason: "invalid_email" | "unavailable" | "failed" };

export function isSignInAvailable(): boolean {
  return supabaseSettings() !== null;
}

// Emails a magic link. A new email address gets a new person on first sign-in.
export async function sendSignInLink(
  email: string,
  redirectTo: string,
): Promise<SignInLinkResult> {
  const address = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    return { ok: false, reason: "invalid_email" };
  }
  const supabase = await createClient();
  if (!supabase) return { ok: false, reason: "unavailable" };
  const { error } = await supabase.auth.signInWithOtp({
    email: address,
    options: { emailRedirectTo: redirectTo },
  });
  return error ? { ok: false, reason: "failed" } : { ok: true };
}

// Turns the code from a magic link into a session cookie. False if the link is invalid
// or expired.
export async function finishSignIn(code: string): Promise<boolean> {
  const supabase = await createClient();
  if (!supabase) return false;
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return !error;
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase?.auth.signOut();
}

// The signed-in person, or null when signed out.
export async function getCurrentPerson(): Promise<Person | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: personId } = await supabase.rpc("current_person_id");
  if (!personId) return null;
  const { data } = await supabase
    .from("people")
    .select("id, email, display_name")
    .eq("id", personId)
    .maybeSingle();
  return data ? { id: data.id, email: data.email, displayName: data.display_name } : null;
}

// The boats the signed-in person is on, with their role on each.
export async function listMyBoats(person: Person): Promise<BoatMembership[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("memberships")
    .select("role, boats!inner(id, name)")
    .eq("person_id", person.id)
    .order("name", { referencedTable: "boats" });
  if (error) throw new Error(`Could not load boats: ${error.message}`);
  return data.map((row) => ({
    boatId: row.boats.id,
    boatName: row.boats.name,
    role: row.role,
  }));
}
