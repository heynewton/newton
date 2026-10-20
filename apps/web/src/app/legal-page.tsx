import Link from "next/link";
import type { ReactNode } from "react";

// The layout shared by /privacy and /terms. The texts live in each page as plain sections, so
// updating one is an edit to its page and a new `lastUpdated` date.

// Who runs the service and how to reach them, used by both pages.
export const ADDRESS = "61 E 86th Street, Suite 74, New York, NY 10028";
export const CONTACT_EMAIL = "privacy@heynewton.app";

export function Contact() {
  return (
    <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
      {CONTACT_EMAIL}
    </a>
  );
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function LegalPage({
  title,
  lastUpdated,
  draft = false,
  children,
}: {
  title: string;
  // ISO date (YYYY-MM-DD) of the last change to the text.
  lastUpdated: string;
  // Shows a notice that the text is not final. Remove once the maintainer signs it off (#33).
  draft?: boolean;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-12 sm:py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="text-sm text-zinc-500">
          Last updated <time dateTime={lastUpdated}>{dateFormat.format(new Date(lastUpdated))}</time>
        </p>
      </header>
      {draft && (
        <p
          role="note"
          className="rounded-2xl border border-spinnaker/60 bg-spinnaker/10 p-4 text-sm text-zinc-800 dark:text-zinc-200"
        >
          <strong>Draft.</strong> This text is being reviewed and is not final yet. Accounts
          aren&apos;t open to the public until it is.
        </p>
      )}
      <div className="flex flex-col gap-8 break-words">{children}</div>
      <Link href="/" className="font-medium underline">
        Back to the homepage
      </Link>
    </main>
  );
}

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 text-zinc-700 dark:text-zinc-300">
      <h2 id={id} className="text-xl font-semibold text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function List({ children }: { children: ReactNode }) {
  return <ul className="flex list-disc flex-col gap-2 pl-5">{children}</ul>;
}

// A fact or choice the maintainer still has to provide. Kept visible on purpose, so an
// unfinished text can't pass for a finished one.
export function ToDecide({ children }: { children: ReactNode }) {
  return (
    <mark
      data-to-decide
      className="rounded bg-spinnaker/25 px-1 text-zinc-900 dark:bg-spinnaker/30 dark:text-zinc-100"
    >
      [To decide: {children}]
    </mark>
  );
}
