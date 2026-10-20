import "server-only";
import type { ExportFile, ExportInput, ExportTable } from "@/lib/export/archive";
import { createClient } from "./client";
import { getMyBoat, type Person } from "./index";

// Reads everything a boat export contains (#16, docs/export.md). Every query runs as the
// signed-in person, under RLS, so an export can only hold rows and files that person can read,
// and only of the boat asked for. The role check below is the server's; RLS is the floor.

// Only owners and co-owners export: the archive is the whole boat, including held mail.
export const EXPORT_ROLES = ["owner", "co_owner"] as const;

// The most stored-file bytes one export sends. The archive streams, so memory isn't the limit;
// time is. A Vercel function runs for at most 300 seconds, and the download goes at the speed of
// the person's connection, so 500 MB leaves room on a slow one (about 2 MB/s). Also well under
// the zip format's 4 GiB without ZIP64, which fflate doesn't write.
export const EXPORT_MAX_FILE_BYTES = 500 * 1024 * 1024;

// PostgREST returns at most this many rows per request (`max_rows` in supabase/config.toml).
const PAGE_ROWS = 1000;

// The record tables exported whole: every column of every row with this boat's `boat_id`.
// `select *` so a column added later is exported without changing this file.
const BOAT_TABLES = [
  "memberships",
  "documents",
  "renewals",
  "maintenance_items",
  "expenses",
  "inbound_emails",
  "document_filings",
] as const;

type BoatTable = (typeof BOAT_TABLES)[number];
type Row = Record<string, unknown>;

export type BoatExport =
  | { ok: true; input: ExportInput }
  | { ok: false; reason: "not_found" | "forbidden" | "being_deleted" | "too_large"; fileBytes?: number };

export function canExport(role: string): boolean {
  return (EXPORT_ROLES as readonly string[]).includes(role);
}

export async function loadBoatExport(person: Person, boatId: string, now = new Date()): Promise<BoatExport> {
  const boat = await getMyBoat(person, boatId);
  if (!boat) return { ok: false, reason: "not_found" };
  if (!canExport(boat.role)) return { ok: false, reason: "forbidden" };
  // Deletion removes the files first (#115), so an export now would fail partway or miss files.
  if (boat.deletingSince) return { ok: false, reason: "being_deleted" };

  const supabase = await createClient();
  if (!supabase) return { ok: false, reason: "not_found" };

  async function allRows(table: BoatTable): Promise<Row[]> {
    const rows: Row[] = [];
    for (let from = 0; ; from += PAGE_ROWS) {
      // Ordered by every key column, so pages don't overlap or skip rows.
      const order = table === "memberships" ? "person_id" : "id";
      const { data, error } = await supabase!
        .from(table)
        .select("*")
        .eq("boat_id", boat!.boatId)
        .order(order)
        .range(from, from + PAGE_ROWS - 1);
      if (error) throw new Error(`Could not export ${table}: ${error.message}`);
      rows.push(...(data as Row[]));
      if (data.length < PAGE_ROWS) return rows;
    }
  }

  const [boatRow, ...tableRows] = await Promise.all([
    supabase.from("boats").select("*").eq("id", boat.boatId).single(),
    ...BOAT_TABLES.map(allRows),
  ]);
  if (boatRow.error) throw new Error(`Could not export the boat: ${boatRow.error.message}`);
  const byTable = Object.fromEntries(BOAT_TABLES.map((t, i) => [t, tableRows[i]])) as Record<BoatTable, Row[]>;

  const documents = byTable.documents;
  const fileBytes = documents.reduce((n, d) => n + Number(d.size_bytes ?? 0), 0);
  if (fileBytes > EXPORT_MAX_FILE_BYTES) return { ok: false, reason: "too_large", fileBytes };

  // Everyone the records refer to, by ID and name only: members, payers, who added a document
  // and who sent filed mail. RLS shows only people who share a boat with the exporter, so a
  // former member appears as an ID without a row here.
  const personIds = new Set<string>();
  for (const m of byTable.memberships) personIds.add(m.person_id as string);
  for (const e of byTable.expenses) personIds.add(e.paid_by as string);
  for (const d of documents) if (d.added_by) personIds.add(d.added_by as string);
  for (const m of byTable.inbound_emails) if (m.sender_person_id) personIds.add(m.sender_person_id as string);
  const people = await supabase
    .from("people")
    .select("id, display_name")
    .in("id", [...personIds])
    .order("id");
  if (people.error) throw new Error(`Could not export people: ${people.error.message}`);

  const tables: ExportTable[] = [
    { name: "boat", rows: [boatRow.data] },
    { name: "people", rows: people.data },
    ...BOAT_TABLES.map((name) => ({ name, rows: byTable[name] })),
  ];

  const files: ExportFile[] = documents.map((d) => ({
    path: d.storage_path as string,
    documentId: d.id as string,
    open: async () => {
      // Through RLS as the same person ("documents bucket: members read").
      const { data, error } = await supabase.storage.from("documents").download(d.storage_path as string);
      if (error || !data) throw new Error(`Could not export ${d.storage_path}: ${error?.message ?? "no file"}`);
      return data.stream();
    },
  }));

  return {
    ok: true,
    input: {
      exportedAt: now,
      boat: { id: boat.boatId, name: boat.boatName },
      exportedBy: { personId: person.id, role: boat.role },
      tables,
      files,
    },
  };
}
