import {
  dueLine,
  formatDate,
  hours,
  schedule,
  type MaintenanceRow,
  type RenewalRow,
  type ScheduledItem,
} from "../records";

// Email reminders for renewals and maintenance (#12). Works out, for each owner and co-owner,
// what to put in today's digest: what is due soon or overdue on their boats (from packages/calc,
// through @/lib/records), minus what they were already told about. Then writes the email. Pure,
// so it is tested without a database or a mail provider.

// Due within this many days, or engine hours, counts as coming up.
export const REMINDER_DAYS = 30;
export const REMINDER_ENGINE_HOURS = 25;

export type Recipient = { personId: string; name: string; email: string };

export type ReminderBoat = {
  boatId: string;
  boatName: string;
  renewals: RenewalRow[];
  maintenance: MaintenanceRow[];
  documents: { id: string; filename: string | null }[];
  // Owners and co-owners: the people who renew and pay.
  recipients: Recipient[];
};

export type ReminderStatus = "due_soon" | "overdue";

export type DigestItem = {
  boatId: string;
  itemType: "renewal" | "maintenance";
  itemId: string;
  title: string;
  status: ReminderStatus;
  dueOn: string | null;
  dueAtEngineHours: number | null;
  // "Expires 31 Dec 2026", "Was due 18 Oct 2026 or at 1,471 h, whichever comes first".
  due: string;
  // What the date was worked out from (principle 6).
  basis: string;
  // The document the record came from, or that it was entered by hand.
  source: string;
};

export type Digest = {
  recipient: Recipient;
  today: string;
  boats: { boatId: string; boatName: string; items: DigestItem[] }[];
};

// The key a sent reminder is remembered by: one per person, item, due date and status.
export function sentKey(personId: string, item: Pick<DigestItem, "itemType" | "itemId" | "dueOn" | "dueAtEngineHours" | "status">): string {
  return [personId, item.itemType, item.itemId, item.dueOn ?? "", item.dueAtEngineHours ?? "", item.status].join("|");
}

function digestItem(boat: ReminderBoat, item: ScheduledItem, engineHoursNote: string | null): DigestItem {
  const { due, basis } = dueLine(item);
  const documentId = item.row.document_id;
  const doc = documentId ? boat.documents.find((d) => d.id === documentId) : undefined;
  const byHours = item.by.includes("engine-hours") && engineHoursNote;
  return {
    boatId: boat.boatId,
    itemType: item.type,
    itemId: item.row.id,
    title: item.row.title,
    status: item.status === "overdue" ? "overdue" : "due_soon",
    dueOn: item.due.dueOn ?? null,
    dueAtEngineHours: item.due.dueAtEngineHours ?? null,
    due,
    basis: [basis, byHours ? engineHoursNote : ""].filter(Boolean).join(" "),
    source: doc ? `From ${doc.filename ?? "a stored document"}.` : "Entered by hand, no source document linked.",
  };
}

// Today's digests, one per person with something new to hear about. People with nothing new get
// none. Boats and items keep the order of `boats` and of calc's schedule (overdue first, then
// by due date).
export function buildDigests(boats: ReminderBoat[], alreadySent: Set<string>, today: string): Digest[] {
  const byPerson = new Map<string, Digest>();
  for (const boat of boats) {
    const due = schedule(boat.renewals, boat.maintenance, {
      today,
      withinDays: REMINDER_DAYS,
      withinEngineHours: REMINDER_ENGINE_HOURS,
    });
    const note = due.engineHours
      ? `Engine hours are checked against the last reading Newton has: ${hours(due.engineHours.hours)} on ${formatDate(due.engineHours.on)}.`
      : null;
    const items = [...due.overdue, ...due.dueSoon].map((item) => digestItem(boat, item, note));
    if (items.length === 0) continue;

    for (const recipient of boat.recipients) {
      const fresh = items.filter((item) => !alreadySent.has(sentKey(recipient.personId, item)));
      if (fresh.length === 0) continue;
      const digest = byPerson.get(recipient.personId) ?? { recipient, today, boats: [] };
      digest.boats.push({ boatId: boat.boatId, boatName: boat.boatName, items: fresh });
      byPerson.set(recipient.personId, digest);
    }
  }
  return [...byPerson.values()];
}

export type Email = { subject: string; text: string; html: string };

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function count(items: DigestItem[], status: ReminderStatus): number {
  return items.filter((i) => i.status === status).length;
}

// "Kittiwake: 1 overdue, 2 coming up" or, for several boats, "3 overdue, 2 coming up on your boats".
export function digestSubject(digest: Digest): string {
  const items = digest.boats.flatMap((b) => b.items);
  const parts = [];
  const overdue = count(items, "overdue");
  const soon = count(items, "due_soon");
  if (overdue) parts.push(`${overdue} overdue`);
  if (soon) parts.push(`${soon} coming up`);
  return digest.boats.length === 1
    ? `${digest.boats[0].boatName}: ${parts.join(", ")}`
    : `${parts.join(", ")} on your boats`;
}

// The digest as plain text and simple HTML. Each item says when it's due, what that was worked
// out from and where the record came from, and the email says when it was worked out.
export function renderDigest(digest: Digest, siteUrl: string): Email {
  const site = siteUrl.replace(/\/+$/, "");
  const label = (s: ReminderStatus) => (s === "overdue" ? "Overdue" : "Coming up");
  const asOf = `Worked out on ${formatDate(digest.today)} from the records on Newton.`;
  const footer =
    "You get this because you own or co-own these boats on Hey Newton. Each item is sent once when it comes up, and once more if it becomes overdue.";

  const text = [
    `Hi ${digest.recipient.name},`,
    "",
    ...digest.boats.flatMap((boat) => [
      boat.boatName.toUpperCase(),
      "",
      ...boat.items.flatMap((item) => [
        `- ${item.title} (${item.itemType}) - ${label(item.status)}`,
        `  ${item.due}.`,
        ...(item.basis ? [`  ${item.basis}`] : []),
        `  ${item.source}`,
        "",
      ]),
      `Open ${boat.boatName}: ${site}/boats/${boat.boatId}`,
      "",
    ]),
    asOf,
    "",
    footer,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<body style="font-family: -apple-system, system-ui, sans-serif; color: #18181b; line-height: 1.5; max-width: 560px; margin: 0 auto; padding: 16px;">
<p>Hi ${escapeHtml(digest.recipient.name)},</p>
${digest.boats
  .map(
    (boat) => `<h2 style="font-size: 18px; margin: 24px 0 8px;">${escapeHtml(boat.boatName)}</h2>
<ul style="padding-left: 20px; margin: 0;">
${boat.items
  .map(
    (item) => `<li style="margin-bottom: 12px;"><strong>${escapeHtml(item.title)}</strong> <span style="color: ${item.status === "overdue" ? "#991b1b" : "#92400e"};">${label(item.status)}</span><br>
${escapeHtml(item.due)}.${item.basis ? `<br><span style="color: #52525b;">${escapeHtml(item.basis)}</span>` : ""}<br>
<span style="color: #52525b;">${escapeHtml(item.source)}</span></li>`,
  )
  .join("\n")}
</ul>
<p><a href="${escapeHtml(`${site}/boats/${boat.boatId}`)}">Open ${escapeHtml(boat.boatName)}</a></p>`,
  )
  .join("\n")}
<p style="color: #52525b; font-size: 14px;">${escapeHtml(asOf)}</p>
<p style="color: #52525b; font-size: 14px;">${escapeHtml(footer)}</p>
</body>
</html>`;

  return { subject: digestSubject(digest), text, html };
}
