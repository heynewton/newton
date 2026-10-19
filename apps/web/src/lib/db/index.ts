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
    .eq("person_id", person.id);
  if (error) throw new Error(`Could not load boats: ${error.message}`);
  // Sorted here: ordering by an embedded table only sorts inside each row's embed.
  return data
    .map((row) => ({ boatId: row.boats.id, boatName: row.boats.name, role: row.role }))
    .sort((a, b) => a.boatName.localeCompare(b.boatName));
}

export type CreateBoatResult =
  | { ok: true; boatId: string }
  | { ok: false; reason: "invalid_name" | "signed_out" | "failed" };

// The longest boat name the database accepts (boats.name check constraint).
export const BOAT_NAME_MAX_LENGTH = 100;

// Creates a boat with the signed-in person as its owner. One database call, so the boat and
// the owner membership are created together or not at all.
export async function createBoat(name: string): Promise<CreateBoatResult> {
  const boatName = name.trim();
  if (boatName.length === 0 || boatName.length > BOAT_NAME_MAX_LENGTH) {
    return { ok: false, reason: "invalid_name" };
  }
  const supabase = await createClient();
  if (!supabase) return { ok: false, reason: "signed_out" };
  const { data, error } = await supabase.rpc("create_boat", { boat_name: boatName });
  if (error) {
    if (error.code === "42501") return { ok: false, reason: "signed_out" };
    if (error.code === "23514") return { ok: false, reason: "invalid_name" };
    return { ok: false, reason: "failed" };
  }
  return { ok: true, boatId: data };
}

// One of the signed-in person's boats, with their role on it. Null if the boat doesn't
// exist or they are not on it (RLS can't tell the two apart, and neither should the page).
export async function getMyBoat(person: Person, boatId: string): Promise<BoatMembership | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(boatId)) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("memberships")
    .select("role, boats!inner(id, name)")
    .eq("person_id", person.id)
    .eq("boat_id", boatId)
    .maybeSingle();
  if (error) throw new Error(`Could not load the boat: ${error.message}`);
  return data ? { boatId: data.boats.id, boatName: data.boats.name, role: data.role } : null;
}
