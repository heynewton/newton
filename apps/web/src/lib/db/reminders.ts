import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { sentKey, type Digest, type ReminderBoat } from "@/lib/reminders";
import type { ReminderStore } from "@/lib/reminders/run";
import type { Database } from "./database.types";

// The reminders job's database side (#12). It runs on a schedule with no signed-in person, so it
// uses the server's secret key, which bypasses row-level security, and reads every boat.

export function reminderStoreFromEnv(): ReminderStore | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return new SupabaseReminderStore(
    createSupabaseClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  );
}

type Client = ReturnType<typeof createSupabaseClient<Database>>;

function check<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data as T;
}

export class SupabaseReminderStore implements ReminderStore {
  constructor(private readonly db: Client) {}

  async loadBoats(): Promise<ReminderBoat[]> {
    const [boats, renewals, maintenance, documents, members] = await Promise.all([
      this.db.from("boats").select("id, name").order("name"),
      this.db.from("renewals").select("id, boat_id, kind, title, reference, expires_on, document_id"),
      this.db
        .from("maintenance_items")
        .select("id, boat_id, title, every_months, every_engine_hours, last_done_on, last_done_engine_hours, document_id"),
      this.db.from("documents").select("id, boat_id, filename"),
      this.db
        .from("memberships")
        .select("boat_id, person_id, people!inner(display_name, email)")
        .in("role", ["owner", "co_owner"]),
    ]);
    const allRenewals = check(renewals, "renewals");
    const allMaintenance = check(maintenance, "maintenance_items");
    const allDocuments = check(documents, "documents");
    const allMembers = check(members, "memberships");

    return check(boats, "boats")
      .map((boat) => ({
        boatId: boat.id,
        boatName: boat.name,
        renewals: allRenewals.filter((r) => r.boat_id === boat.id),
        maintenance: allMaintenance.filter((m) => m.boat_id === boat.id),
        documents: allDocuments.filter((d) => d.boat_id === boat.id),
        recipients: allMembers
          .filter((m) => m.boat_id === boat.id && m.people.email)
          .map((m) => ({
            personId: m.person_id,
            name: m.people.display_name ?? m.people.email!,
            email: m.people.email!,
          })),
      }))
      .filter((b) => (b.renewals.length || b.maintenance.length) && b.recipients.length);
  }

  async loadSent(): Promise<Set<string>> {
    const rows = check(
      await this.db
        .from("reminders_sent")
        .select("person_id, item_type, item_id, due_on, due_at_engine_hours, status"),
      "reminders_sent",
    );
    return new Set(
      rows.map((r) =>
        sentKey(r.person_id, {
          itemType: r.item_type,
          itemId: r.item_id,
          dueOn: r.due_on,
          dueAtEngineHours: r.due_at_engine_hours,
          status: r.status,
        }),
      ),
    );
  }

  async recordSent(digest: Digest): Promise<void> {
    const rows = digest.boats.flatMap((boat) =>
      boat.items.map((item) => ({
        boat_id: boat.boatId,
        person_id: digest.recipient.personId,
        item_type: item.itemType,
        item_id: item.itemId,
        due_on: item.dueOn,
        due_at_engine_hours: item.dueAtEngineHours,
        status: item.status,
      })),
    );
    // Already recorded (a retried run) is fine.
    const { error } = await this.db.from("reminders_sent").upsert(rows, {
      onConflict: "person_id,item_type,item_id,due_on,due_at_engine_hours,status",
      ignoreDuplicates: true,
    });
    if (error) throw new Error(`reminders_sent: ${error.message}`);
  }
}
