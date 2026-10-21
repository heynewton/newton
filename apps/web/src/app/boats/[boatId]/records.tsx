import type { ReactNode } from "react";
import type { BoatDocument, BoatMember, DocumentType } from "@/lib/db";
import {
  balancesFor,
  dateOf,
  dueLine,
  dueState,
  formatDate,
  hours,
  latestOn,
  money,
  type CostSplit,
  type ExpenseRow,
  type MaintenanceRow,
  type Schedule,
  type ScheduledItem,
  type SummaryPart,
} from "@/lib/records";
import { Contact } from "../../legal-page";

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

// Where a record came from and when: its document and the day it arrived, or that it was entered
// by hand and how to add the document.
function Source({ boatId, documentId, documents }: { boatId: string; documentId: string | null; documents: Documents }) {
  const doc = documentId ? documents.get(documentId) : undefined;
  if (!doc) {
    return (
      <p className={`text-sm ${muted}`}>
        Entered by hand, no document. Forward the invoice or certificate to the boat to file it.
      </p>
    );
  }
  return (
    <p className="flex flex-col">
      <a href={documentHref(boatId, doc.id)} target="_blank" rel="noopener" className={`${link} w-fit break-all`}>
        From {documentName(doc)}
      </a>
      <span className={`-mt-2 text-sm ${muted}`}>
        {received(doc) === "emailed" ? "Emailed" : "Uploaded"} {formatDate(dateOf(doc.receivedAt))}
      </span>
    </p>
  );
}

function received(doc: BoatDocument): string {
  return doc.source === "email" ? "emailed" : "uploaded";
}

// A section's "source · freshness" line, under its heading.
function Freshness({ children }: { children: ReactNode }) {
  return <p className={`text-sm ${muted}`}>{children}</p>;
}

const statusStyles = {
  overdue: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  "due-soon": "bg-spinnaker/20 text-amber-800 dark:text-spinnaker",
  later: "bg-black/5 text-zinc-700 dark:bg-white/10 dark:text-zinc-300",
};

// The line under the boat's name: what needs attention, each part a link to its section. A boat
// with nothing to track yet gets what to do first instead.
export function AttentionSummary({ parts }: { parts: SummaryPart[] | null }) {
  if (parts === null) {
    return (
      <div className="flex flex-col">
        <p className="text-zinc-700 dark:text-zinc-300">
          Nothing to keep track of yet. Newton fills this page from the documents sent to the boat.
        </p>
        <a href="#documents" className={`${link} w-fit`}>
          Start with an insurance certificate or a yard invoice
        </a>
      </div>
    );
  }
  if (parts.length === 0) return null;
  // The separator ends each part but the last, so a wrapped line never starts with one.
  return (
    <p className="flex flex-wrap items-center gap-x-2">
      {parts.map((part, i) => (
        <span key={part.text} className="inline-flex items-center gap-x-2">
          <a href={`#${part.anchor}`} className={link}>
            {part.text}
          </a>
          {i < parts.length - 1 && (
            <span aria-hidden="true" className={muted}>
              ·
            </span>
          )}
        </span>
      ))}
    </p>
  );
}

// A `details` summary keeps its disclosure chevron, which turns when open, and stays 44 px tall.
// The browser's own marker is hidden because `display: flex` drops it in some browsers anyway.
function Summary({ children }: { children: ReactNode }) {
  return (
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="size-5 shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none"
      >
        <path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
    </summary>
  );
}

function ItemList({
  items,
  today,
  boatId,
  documents,
}: {
  items: ScheduledItem[];
  today: string;
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
            <h4 className="font-semibold break-words">{item.row.title}</h4>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className={`rounded-full px-2 py-0.5 text-sm font-medium ${statusStyles[item.status]}`}>
                {dueState(item, today)}
              </span>
              <span className={`text-sm ${muted}`}>{item.type === "renewal" ? "Renewal" : "Maintenance"}</span>
            </p>
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
        <Freshness>
          As of {formatDate(today)}. Due dates are worked out from each record&apos;s expiry date or last service
          and interval.
        </Freshness>
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
            <h3 id="overdue" className="scroll-mt-4 font-semibold">
              Overdue
            </h3>
            {overdue.length > 0 ? (
              <ItemList items={overdue} today={today} boatId={boatId} documents={documents} />
            ) : (
              <p className={muted}>Nothing overdue.</p>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <h3 id="due-soon" className="scroll-mt-4 font-semibold">
              Due in the next {withinDays} days
            </h3>
            {dueSoon.length > 0 ? (
              <ItemList items={dueSoon} today={today} boatId={boatId} documents={documents} />
            ) : (
              <p className={muted}>Nothing due in the next {withinDays} days.</p>
            )}
          </div>
          {later.length > 0 && (
            <details className="group flex flex-col gap-3">
              <Summary>
                <h3 className="font-semibold">Later ({later.length})</h3>
              </Summary>
              <ItemList items={later} today={today} boatId={boatId} documents={documents} />
            </details>
          )}
        </>
      )}
    </section>
  );
}

// "is owed USD 312.44", or "are owed …" after "You (Alex Sample)".
function BalancePhrase({ cents, currency, isYou }: { cents: number; currency: string; isYou: boolean }) {
  if (cents > 0) {
    return (
      <span className="text-teal-700 dark:text-teal">
        {isYou ? "are" : "is"} owed {money(cents, currency)}
      </span>
    );
  }
  if (cents < 0) {
    return (
      <span className="text-red-700 dark:text-red-300">
        {isYou ? "owe" : "owes"} {money(-cents, currency)}
      </span>
    );
  }
  return <span>{isYou ? "are" : "is"} square</span>;
}

export function CoOwnerBalance({
  split,
  expenses,
  members,
  personId,
  boatId,
  documents,
}: {
  split: CostSplit;
  expenses: ExpenseRow[];
  members: BoatMember[];
  /** The signed-in person, whose line comes first as "You". */
  personId: string;
  boatId: string;
  documents: Documents;
}) {
  const names = new Map(members.map((m) => [m.personId, m.name]));
  const name = (personId: string) => names.get(personId) ?? "A former member";
  const latest = latestOn(expenses.map((e) => e.spent_on));
  return (
    <section aria-labelledby="balance" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="balance" className="scroll-mt-4 text-xl font-semibold">
          Co-owner balance
        </h2>
        {latest && (
          <Freshness>
            From {expenses.length} expense{expenses.length === 1 ? "" : "s"}, the latest on {formatDate(latest)}.
          </Freshness>
        )}
      </div>
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
              {balancesFor(c.balances, personId).map((b) => (
                <li key={b.owner} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:justify-between">
                  <span className="font-medium">
                    {b.isYou ? `You (${name(b.owner)})` : name(b.owner)}{" "}
                    <BalancePhrase cents={b.balanceCents} currency={c.currency} isYou={b.isYou} />
                  </span>
                  <span className={`text-sm ${muted}`}>
                    Paid {money(b.paidCents, c.currency)}, {b.isYou ? "your" : "their"} part{" "}
                    {money(b.shareCents, c.currency)}
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
            <details className="group">
              <Summary>
                <span className="font-medium">The expenses ({c.counted.length + c.notCounted.length})</span>
              </Summary>
              <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/15">
                {[...c.counted, ...c.notCounted].map((e) => (
                  <li key={e.id} className="flex flex-col gap-1 py-3">
                    <span className="flex flex-col gap-x-4 sm:flex-row sm:justify-between">
                      <span className="break-words">{e.description}</span>
                      <span className="shrink-0 font-medium">{money(e.amount_cents, e.currency)}</span>
                    </span>
                    <span className={`text-sm ${muted}`}>
                      Spent {formatDate(e.spent_on)}, paid by {name(e.paid_by)}
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
  const lastReceived = latestOn(documents.map((d) => d.receivedAt));
  return (
    <section aria-labelledby="documents" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="documents" className="scroll-mt-4 text-xl font-semibold">
          Documents
        </h2>
        {lastReceived && <Freshness>Last received {formatDate(lastReceived)}.</Freshness>}
      </div>
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
                  {documentTypes[doc.type]}, {received(doc)} {formatDate(dateOf(doc.receivedAt))}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Owners and co-owners download the whole boat (#16, docs/export.md). Others don't see this.
export function ExportData({
  boatId,
  fileBytes,
  maxFileBytes,
}: {
  boatId: string;
  fileBytes: number;
  maxFileBytes: number;
}) {
  const megabytes = (bytes: number) =>
    bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${Math.ceil(bytes / 1024 / 1024)} MB`;
  return (
    <section aria-labelledby="export" className="flex flex-col gap-4">
      <h2 id="export" className="text-xl font-semibold">
        Your boat&apos;s data
      </h2>
      <div className={`${card} flex flex-col gap-3`}>
        <p className="text-zinc-700 dark:text-zinc-300">
          Download every record and file of the boat in one zip, to keep a copy or move it elsewhere. The
          records are JSON files,{" "}
          <a className="underline" href="https://github.com/heynewton/newton/blob/main/docs/export.md">
            described here
          </a>
          .
        </p>
        {fileBytes > maxFileBytes ? (
          <p className={muted}>
            The boat&apos;s files ({megabytes(fileBytes)}) are more than one download can hold (
            {megabytes(maxFileBytes)}). Write to <Contact /> and we&apos;ll send the archive another way.
          </p>
        ) : (
          <a
            href={`/boats/${boatId}/export`}
            download
            className="flex min-h-11 w-fit items-center rounded-full border border-black/15 px-5 font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Download all data ({megabytes(fileBytes)} of files)
          </a>
        )}
      </div>
    </section>
  );
}
