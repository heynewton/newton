import "server-only";
import type { ExpenseRow, MaintenanceRow, RenewalRow } from "@/lib/records";
import { createClient, supabaseSettings } from "./client";
import type { Database } from "./database.types";

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

// A boat the signed-in person is on, with what its page needs beyond the list.
export type MyBoat = BoatMembership & {
  // The part of the boat's email address before the @ (#10).
  emailAlias: string;
  // When an owner started deleting it (#115), or null. A boat being deleted takes no new records.
  deletingSince: string | null;
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
export async function getMyBoat(person: Person, boatId: string): Promise<MyBoat | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(boatId)) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("memberships")
    .select("role, boats!inner(id, name, email_alias, deleting_since)")
    .eq("person_id", person.id)
    .eq("boat_id", boatId)
    .maybeSingle();
  if (error) throw new Error(`Could not load the boat: ${error.message}`);
  return data
    ? {
        boatId: data.boats.id,
        boatName: data.boats.name,
        role: data.role,
        emailAlias: data.boats.email_alias,
        deletingSince: data.boats.deleting_since,
      }
    : null;
}

// What deleting a boat removed: files from Storage, and rows by table.
export type BoatRemoved = { files: number; rows: Record<string, number> };

export type DeleteBoatResult =
  | { ok: true; removed: BoatRemoved }
  | { ok: false; reason: "not_owner" | "name_mismatch" | "files_left" | "failed" };

// The Storage API removes at most this many files per call.
const STORAGE_REMOVE_BATCH = 1000;

// Deletes one of the signed-in person's boats, its rows and every file in its Storage folder
// (#115). Owners only: checked here, and again by the database functions and the bucket's delete
// policy, which all run as the signed-in person. The name must be typed exactly as confirmation.
//
// Marks the boat first, then removes the files, then the rows (see
// supabase/migrations/20261022140000_boat_delete.sql for why). Every step is safe to repeat, so a
// failure at any point is fixed by running it again.
export async function deleteBoat(person: Person, boatId: string, typedName: string): Promise<DeleteBoatResult> {
  const boat = await getMyBoat(person, boatId);
  if (!boat || boat.role !== "owner") return { ok: false, reason: "not_owner" };
  if (typedName.trim() !== boat.boatName) return { ok: false, reason: "name_mismatch" };
  const supabase = await createClient();
  if (!supabase) return { ok: false, reason: "failed" };

  const { data: paths, error: beginError } = await supabase.rpc("begin_boat_deletion", { boat: boatId });
  if (beginError) return { ok: false, reason: beginError.code === "42501" ? "not_owner" : "failed" };

  let files = 0;
  for (let i = 0; i < paths.length; i += STORAGE_REMOVE_BATCH) {
    const { data: removed, error } = await supabase.storage
      .from("documents")
      .remove(paths.slice(i, i + STORAGE_REMOVE_BATCH));
    // A file the policy doesn't let us delete comes back missing, not as an error: delete_boat
    // then finds it and refuses.
    if (error) return { ok: false, reason: "failed" };
    files += removed.length;
  }

  const { data: rows, error: deleteError } = await supabase.rpc("delete_boat", { boat: boatId });
  if (deleteError) {
    if (deleteError.code === "55000") return { ok: false, reason: "files_left" };
    if (deleteError.code === "42501") return { ok: false, reason: "not_owner" };
    return { ok: false, reason: "failed" };
  }
  return { ok: true, removed: { files, rows: rows as Record<string, number> } };
}

export type DocumentType = Database["public"]["Enums"]["document_type"];

export type BoatDocument = {
  id: string;
  type: DocumentType;
  source: "email" | "upload";
  filename: string | null;
  receivedAt: string;
  sizeBytes: number | null;
};

export type BoatMember = {
  personId: string;
  name: string;
  role: MembershipRole;
  ownershipShare: number;
};

export type BoatRecords = {
  documents: BoatDocument[];
  renewals: RenewalRow[];
  maintenance: MaintenanceRow[];
  expenses: ExpenseRow[];
  members: BoatMember[];
};

// Everything the boat page shows, read as the signed-in person: RLS only returns rows of boats
// they are on. Call getMyBoat first so a boat they're not on is a 404, not an empty page.
export async function getBoatRecords(boatId: string): Promise<BoatRecords> {
  const supabase = await createClient();
  if (!supabase) throw new Error("No database configured");
  const [documents, renewals, maintenance, expenses, members] = await Promise.all([
    supabase
      .from("documents")
      .select("id, type, source, filename, received_at, size_bytes")
      .eq("boat_id", boatId)
      .order("received_at", { ascending: false }),
    supabase
      .from("renewals")
      .select("id, kind, title, reference, expires_on, document_id")
      .eq("boat_id", boatId),
    supabase
      .from("maintenance_items")
      .select("id, title, every_months, every_engine_hours, last_done_on, last_done_engine_hours, document_id")
      .eq("boat_id", boatId),
    supabase
      .from("expenses")
      .select("id, description, amount_cents, currency, spent_on, paid_by, document_id")
      .eq("boat_id", boatId),
    supabase
      .from("memberships")
      .select("person_id, role, ownership_share, people!inner(display_name, email)")
      .eq("boat_id", boatId),
  ]);
  for (const result of [documents, renewals, maintenance, expenses, members]) {
    if (result.error) throw new Error(`Could not load the boat's records: ${result.error.message}`);
  }
  return {
    documents: documents.data!.map((d) => ({
      id: d.id,
      type: d.type,
      source: d.source,
      filename: d.filename,
      receivedAt: d.received_at,
      sizeBytes: d.size_bytes,
    })),
    renewals: renewals.data!,
    maintenance: maintenance.data!,
    expenses: expenses.data!,
    members: members.data!.map((m) => ({
      personId: m.person_id,
      name: m.people.display_name ?? m.people.email ?? "A member",
      role: m.role,
      ownershipShare: m.ownership_share,
    })),
  };
}

// How long a link to a stored document works. Long enough to open it, short enough that a
// copied or leaked link soon stops working.
const DOCUMENT_LINK_SECONDS = 60;

// A short-lived link to one of the boat's stored files, or null if the document isn't on a boat
// the signed-in person is on. Both the row and the signed URL go through RLS as that person.
export async function getDocumentLink(boatId: string, documentId: string): Promise<string | null> {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(boatId) || !uuid.test(documentId)) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("boat_id", boatId)
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw new Error(`Could not load the document: ${error.message}`);
  if (!data) return null;
  const { data: signed, error: signError } = await supabase.storage
    .from("documents")
    .createSignedUrl(data.storage_path, DOCUMENT_LINK_SECONDS);
  if (signError || !signed) return null;
  return signed.signedUrl;
}
