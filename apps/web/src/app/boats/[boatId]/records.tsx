import { formatCents } from "@newton/calc";
import type { BoatDocument, BoatMember, DocumentType } from "@/lib/db";
import {
  dueLine,
  formatDate,
  groupThousands,
  hours,
  type CostSplit,
  type ExpenseRow,
  type MaintenanceRow,
  type Schedule,
  type ScheduledItem,
} from "@/lib/records";

// The boat page's read-only record sections. Every date and amount shown here was computed by
// packages/calc (through @/lib/records); these components only lay them out, with the basis
// for each number next to it.

const card = "rounded-2xl border border-black/10 p-5 dark:border-white/15";
const muted = "text-zinc-600 dark:text-zinc-400";
const link = "inline-flex min-h-11 items-center font-medium underline";

const documentTypes: Record<DocumentType, string> = {
  unsorted: "Not sorted yet",
  email: "Email",
  invoice: "Invoice",
  receipt: "Receipt",
  insurance: "Insurance",
  registration: "Registration",
  manual: "Manual",
  contract: "Contract",
  survey: "Survey",
  other: "Other",
};

type Documents = Map<string, BoatDocument>;

function documentName(doc: BoatDocument): string {
  return doc.filename ?? `${documentTypes[doc.type]} document`;
}

function documentHref(boatId: string, documentId: string): string {
  return `/boats/${boatId}/documents/${documentId}`;
}

// Where a record came from: a link to its document, or a note that none is linked.
function Source({ boatId, documentId, documents }: { boatId: string; documentId: string | null; documents: Documents }) {
  const doc = documentId ? documents.get(documentId) : undefined;
  if (!doc) return <span className={`text-sm ${muted}`}>No source document linked.</span>;
  return (
    <a href={documentHref(boatId, doc.id)} target="_blank" rel="noopener" className={`${link} break-all`}>
      From {documentName(doc)}
    </a>
  );
}

function money(cents: number, currency: string): string {
  return `${currency} ${groupThousands(formatCents(cents))}`;
}

const statusStyles = {
  overdue: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  "due-soon": "bg-spinnaker/20 text-amber-800 dark:text-spinnaker",
  later: "bg-black/5 text-zinc-700 dark:bg-white/10 dark:text-zinc-300",
};

function ItemList({
  items,
  boatId,
  documents,
}: {
  items: ScheduledItem[];
  boatId: string;
  documents: Documents;
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => {
        const { due, basis } = dueLine(item);
        const byHours = item.by.includes("engine-hours");
        return (
          <li key={`${item.type}:${item.row.id}`} className={`${card} flex flex-col gap-1`}>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold break-words">{item.row.title}</h4>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[item.status]}`}>
                {item.type === "renewal" ? "Renewal" : "Maintenance"}
              </span>
            </div>
            <p className="font-medium">{due}</p>
            {byHours && (
              <p className="text-sm">
                {item.status === "overdue" ? "Past" : "Close to"} its engine hours at the last reading.
              </p>
            )}
            {basis && <p className={`text-sm ${muted}`}>{basis}</p>}
            <Source boatId={boatId} documentId={item.row.document_id} documents={documents} />
          </li>
        );
      })}
    </ul>
  );
}

export function ComingUp({
  schedule,
  withinDays,
  today,
  boatId,
  documents,
  maintenance,
}: {
  schedule: Schedule;
  withinDays: number;
  today: string;
  boatId: string;
  documents: Documents;
  maintenance: MaintenanceRow[];
}) {
  const { overdue, dueSoon, later, engineHours } = schedule;
  const empty = overdue.length + dueSoon.length + later.length === 0;
  const reading = engineHours && maintenance.find((m) => m.id === engineHours.maintenanceId);
  return (
    <section aria-labelledby="coming-up" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="coming-up" className="text-xl font-semibold">
          Renewals and maintenance
        </h2>
        <p className={`text-sm ${muted}`}>
          As of {formatDate(today)}. Due dates are worked out from each record&apos;s expiry date or last service
          and interval.
        </p>
      </div>
      {empty ? (
        <p className={`${card} ${muted}`}>
          Nothing here yet. Renewals and maintenance will appear once insurance certificates, registrations and
          yard invoices are forwarded to the boat (coming soon).
        </p>
      ) : (
        <>
          {engineHours && reading && (
            <p className={`text-sm ${muted}`}>
              Engine hours are checked against the last reading Newton has: {hours(engineHours.hours)} on{" "}
              {formatDate(engineHours.on)}, recorded with &ldquo;{reading.title}&rdquo;. The meter has likely moved
              on since, so check it for anything due by hours.
            </p>
          )}
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold">Overdue</h3>
            {overdue.length > 0 ? (
              <ItemList items={overdue} boatId={boatId} documents={documents} />
            ) : (
              <p className={muted}>Nothing overdue.</p>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold">Due in the next {withinDays} days</h3>
            {dueSoon.length > 0 ? (
              <ItemList items={dueSoon} boatId={boatId} documents={documents} />
            ) : (
              <p className={muted}>Nothing due in the next {withinDays} days.</p>
            )}
          </div>
          {later.length > 0 && (
            <details className="group flex flex-col gap-3">
              <summary className="flex min-h-11 cursor-pointer items-center font-semibold">
                Later ({later.length})
              </summary>
              <ItemList items={later} boatId={boatId} documents={documents} />
            </details>
          )}
        </>
      )}
    </section>
  );
}

function BalancePhrase({ cents, currency }: { cents: number; currency: string }) {
  if (cents > 0) return <span className="text-teal-700 dark:text-teal">is owed {money(cents, currency)}</span>;
  if (cents < 0) return <span className="text-red-700 dark:text-red-300">owes {money(-cents, currency)}</span>;
  return <span>is square</span>;
}

export function CoOwnerBalance({
  split,
  expenses,
  members,
  boatId,
  documents,
}: {
  split: CostSplit;
  expenses: ExpenseRow[];
  members: BoatMember[];
  boatId: string;
  documents: Documents;
}) {
  const names = new Map(members.map((m) => [m.personId, m.name]));
  const name = (personId: string) => names.get(personId) ?? "A former member";
  return (
    <section aria-labelledby="balance" className="flex flex-col gap-4">
      <h2 id="balance" className="text-xl font-semibold">
        Co-owner balance
      </h2>
      {expenses.length === 0 ? (
        <p className={`${card} ${muted}`}>
          No shared expenses yet. Invoices and receipts forwarded to the boat (coming soon) will be added here and
          split between the co-owners by their ownership shares.
        </p>
      ) : !split.ok ? (
        <p className={`${card} ${muted}`}>
          The boat has expenses, but no ownership shares are set yet, so there is nothing to split them by. The
          balance appears once the co-owners&apos; shares are set.
        </p>
      ) : (
        split.byCurrency.map((c) => (
          <div key={c.currency} className={`${card} flex flex-col gap-4`}>
            <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/15">
              {c.balances.map((b) => (
                <li key={b.owner} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:justify-between">
                  <span className="font-medium">
                    {name(b.owner)} <BalancePhrase cents={b.balanceCents} currency={c.currency} />
                  </span>
                  <span className={`text-sm ${muted}`}>
                    Paid {money(b.paidCents, c.currency)}, their part {money(b.shareCents, c.currency)}
                  </span>
                </li>
              ))}
            </ul>
            <p className={`text-sm ${muted}`}>
              {c.counted.length === 0
                ? "No expenses paid by a co-owner yet."
                : `Split of ${c.counted.length} expense${c.counted.length === 1 ? "" : "s"} totalling ${money(
                    c.totalCents,
                    c.currency,
                  )}, from ${formatDate(c.firstOn!)} to ${formatDate(c.lastOn!)}, by ownership share: ${split.shares
                    .map((s) => `${name(s.person_id)} ${s.ownership_share}`)
                    .join(", ")}.`}
              {c.notCounted.length > 0 &&
                ` Not in the split: ${c.notCounted
                  .map((e) => `${e.description} (${money(e.amount_cents, c.currency)}, paid by ${name(e.paid_by)})`)
                  .join("; ")}, because the payer has no ownership share.`}
            </p>
            <details>
              <summary className="flex min-h-11 cursor-pointer items-center font-medium">
                The expenses ({c.counted.length + c.notCounted.length})
              </summary>
              <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/15">
                {[...c.counted, ...c.notCounted].map((e) => (
                  <li key={e.id} className="flex flex-col gap-1 py-3">
                    <span className="flex flex-col gap-x-4 sm:flex-row sm:justify-between">
                      <span className="break-words">{e.description}</span>
                      <span className="shrink-0 font-medium">{money(e.amount_cents, e.currency)}</span>
                    </span>
                    <span className={`text-sm ${muted}`}>
                      {formatDate(e.spent_on)}, paid by {name(e.paid_by)}
                    </span>
                    <Source boatId={boatId} documentId={e.document_id} documents={documents} />
                  </li>
                ))}
              </ul>
            </details>
          </div>
        ))
      )}
    </section>
  );
}

// The boat's email address, easy to select and copy on a phone.
export function EmailAddress({ address }: { address: string }) {
  return <strong className="font-semibold break-words select-all">{address}</strong>;
}

export function Documents({
  documents,
  boatId,
  address,
}: {
  documents: BoatDocument[];
  boatId: string;
  address: string | null;
}) {
  return (
    <section aria-labelledby="documents" className="flex flex-col gap-4">
      <h2 id="documents" className="text-xl font-semibold">
        Documents
      </h2>
      {address && (
        <p className="text-zinc-700 dark:text-zinc-300">
          Forward emails with their attachments to <EmailAddress address={address} />. Mail from people who
          aren&apos;t on the boat is held, not filed.
        </p>
      )}
      {documents.length === 0 ? (
        <p className={`${card} ${muted}`}>
          {address
            ? "No documents yet. Insurance certificates, invoices and manuals will be listed here once they are forwarded to the boat."
            : "No documents yet. Insurance certificates, invoices and manuals will be listed here once they are forwarded to the boat’s own email address (coming soon)."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-black/10 rounded-2xl border border-black/10 dark:divide-white/15 dark:border-white/15">
          {documents.map((doc) => (
            <li key={doc.id}>
              <a
                href={documentHref(boatId, doc.id)}
                target="_blank"
                rel="noopener"
                className="flex min-h-14 flex-col justify-center gap-0.5 px-5 py-3 hover:bg-black/5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 dark:hover:bg-white/10"
              >
                <span className="font-medium break-all underline">{documentName(doc)}</span>
                <span className={`shrink-0 text-sm ${muted}`}>
                  {documentTypes[doc.type]}, {doc.source === "email" ? "emailed" : "uploaded"}{" "}
                  {formatDate(doc.receivedAt.slice(0, 10))}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
