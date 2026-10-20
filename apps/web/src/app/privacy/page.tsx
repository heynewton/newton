import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, List, Section, ToDecide } from "../legal-page";

export const metadata: Metadata = { title: "Privacy · Hey Newton" };

// When the text changes, change this date too. What each part is based on (tables, providers,
// regions) is in docs/architecture.md, docs/tokens.md and docs/decisions/.
const LAST_UPDATED = "2026-10-19";

// The services that see Newton's data on our behalf. Keep in step with docs/architecture.md.
const processors = [
  {
    name: "Supabase",
    role: "Database, file storage and sign-in. Holds everything listed above.",
    where: "United States (AWS US East, North Virginia).",
    href: "https://supabase.com/privacy",
  },
  {
    name: "Vercel",
    role: "Hosts the website and runs the daily reminder job. Every page request passes through it.",
    where: <ToDecide>Vercel&apos;s function region for heynewton.app (to check)</ToDecide>,
    href: "https://vercel.com/legal/privacy-policy",
  },
  {
    name: "Resend",
    role: "Sends sign-in links and reminder emails, and receives mail sent to boat addresses. Keeps received mail and its logs for 30 days.",
    where: "United States (sends from US East; account data and logs are in the US).",
    href: "https://resend.com/legal/privacy-policy",
  },
  {
    name: "Cloudflare",
    role: "DNS for heynewton.app only. It does not see your data or the content of pages.",
    where: "Global network.",
    href: "https://www.cloudflare.com/privacypolicy/",
  },
  {
    name: "Anthropic (Claude API)",
    role: "Coming soon, not used by the website yet: reading filed documents to propose records, and answering questions from excerpts of the boat's manuals.",
    where: <ToDecide>Anthropic&apos;s processing region and retention for API data (to check)</ToDecide>,
    href: "https://www.anthropic.com/legal/privacy",
  },
  {
    name: "Voyage AI",
    role: "Coming soon, not used by the website yet: turns the text of manuals into search vectors. Training on our content is switched off, and Voyage deletes it once processed.",
    where: "United States.",
    href: "https://www.voyageai.com/privacy",
  },
];

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" lastUpdated={LAST_UPDATED} draft>
      <Section id="who" title="Who we are">
        <p>
          Hey Newton (&ldquo;Newton&rdquo;, &ldquo;we&rdquo;) is a free hobby project that keeps a
          boat&apos;s documents, maintenance and co-owner costs organised. It is run by{" "}
          <ToDecide>the name of the person or organisation responsible, and a postal address</ToDecide>
          . For anything about your data, write to{" "}
          <ToDecide>the contact email address</ToDecide>.
        </p>
        <p>
          Newton&apos;s code is open source, so you can read exactly how your data is handled on{" "}
          <a className="underline" href="https://github.com/heynewton/newton">
            GitHub
          </a>
          .
        </p>
      </Section>

      <Section id="short" title="The short version">
        <List>
          <li>We keep what you and your boat&apos;s other members send to Newton, and use it only to run Newton for that boat.</li>
          <li>Only the people on a boat can see its data, according to their role.</li>
          <li>No advertising, no tracking, no selling or sharing your data with anyone who doesn&apos;t help run Newton.</li>
          <li>Your data is stored in the United States, with the providers listed below.</li>
          <li>You can ask for a copy of your boat&apos;s data, or for it to be deleted, at any time.</li>
        </List>
      </Section>

      <Section id="what" title="What we store and why">
        <List>
          <li>
            <strong>Your account.</strong> The email address you sign in with, your name if you
            give one, and when you joined. We need these to sign you in and to show the other
            people on your boat who you are.
          </li>
          <li>
            <strong>Signing in.</strong> Newton signs you in with a link sent to your email; there
            is no password. Our sign-in provider records when you sign in and technical details of
            each request, such as your IP address, to keep accounts secure.
          </li>
          <li>
            <strong>One cookie.</strong> A sign-in cookie keeps you signed in. There are no
            analytics, advertising or tracking cookies.
          </li>
          <li>
            <strong>Boats and the people on them.</strong> The boat&apos;s name, who is on it, each
            person&apos;s role (owner, co-owner, crew or read-only) and ownership share, so Newton
            knows who can see and change what, and how to split costs.
          </li>
          <li>
            <strong>Documents.</strong> Files filed for the boat, such as invoices, insurance,
            certificates and manuals, with their name, type, size, date and who added them.
          </li>
          <li>
            <strong>Records.</strong> Renewals, maintenance items and expenses (amount, date, who
            paid, notes), each linked to the document it came from, so Newton can remind you and
            work out who owes whom.
          </li>
          <li>
            <strong>Email sent to a boat&apos;s address.</strong> When a member forwards mail to
            the boat, Newton stores the whole message and its attachments as the boat&apos;s
            documents. You can tell Newton other addresses you forward from; we keep those too.
            When someone who isn&apos;t a member writes to the address, the message is held, not
            filed: Newton keeps only the sender&apos;s address and name, the subject and the number
            of attachments, and doesn&apos;t download the rest.
          </li>
          <li>
            <strong>Reminders.</strong> Which reminders we have emailed to whom, and when, so you
            aren&apos;t reminded twice. Reminder emails include the item, its due date and the
            document it came from.
          </li>
          <li>
            <strong>Manual search (coming soon).</strong> The text of the boat&apos;s manuals, split
            into passages with their page numbers, and a search vector for each, so Newton can find
            the right page when you ask a question.
          </li>
          <li>
            <strong>Questions (coming soon).</strong> When you ask Newton a question, the question
            and the few manual passages it found are sent to Claude to write the answer.{" "}
            <ToDecide>whether questions and answers are stored, and for how long</ToDecide>
          </li>
          <li>
            <strong>Technical logs.</strong> Our providers keep short-lived logs of requests (time,
            page, IP address, browser) to run and secure the service.
          </li>
        </List>
        <p>
          We use all of this only to provide Newton to you and your boat, to keep it secure, and to
          fix problems. Under data protection law, that is to perform our agreement with you (the{" "}
          <Link className="underline" href="/terms">
            terms
          </Link>
          ) and our legitimate interest in running a secure service.{" "}
          <ToDecide>confirm these legal bases, and the law that applies</ToDecide>
        </p>
      </Section>

      <Section id="third-parties" title="People mentioned in forwarded mail">
        <p>
          Invoices, insurance papers and emails often name other people: a boatyard, an insurer, a
          crew member, a previous owner. When a member forwards them, those details are stored with
          the boat&apos;s documents, seen only by the boat&apos;s members, and used only to keep
          that boat&apos;s records. Newton doesn&apos;t contact these people or build profiles of
          them.
        </p>
        <p>
          Members should forward only what they are entitled to share. If you are mentioned in a
          boat&apos;s documents, or you wrote to a boat&apos;s address, you can ask us what we hold
          about you and ask for it to be deleted, using the contact address above.
        </p>
      </Section>

      <Section id="who-sees" title="Who can see your data">
        <List>
          <li>
            <strong>The people on your boat.</strong> Every member can read the boat&apos;s
            documents and records. Owners, co-owners and crew can add to them; owners and
            co-owners can delete documents. The database enforces this, not just the website.
          </li>
          <li>
            <strong>The people who run Newton,</strong> only when needed to fix a problem or answer
            your request. <ToDecide>who on the team has access to production data</ToDecide>
          </li>
          <li>
            <strong>The providers below,</strong> only to do their part of running Newton.
          </li>
        </List>
        <p>We don&apos;t sell your data, show ads, or share it with anyone else.</p>
      </Section>

      <Section id="processors" title="Providers that process your data">
        <ul className="flex flex-col gap-3">
          {processors.map((p) => (
            <li
              key={p.name}
              className="flex flex-col gap-1 rounded-2xl border border-black/10 p-4 dark:border-white/15"
            >
              <a className="font-semibold text-foreground underline" href={p.href}>
                {p.name}
              </a>
              <span>{p.role}</span>
              <span className="text-sm text-zinc-500">Where: {p.where}</span>
            </li>
          ))}
        </ul>
        <p>
          These providers are mostly in the United States, so your data leaves the European Union.{" "}
          <ToDecide>
            the safeguard for each transfer (for example the providers&apos; data processing
            agreements with standard contractual clauses, or the EU–US Data Privacy Framework), and
            whether to move to EU regions
          </ToDecide>
        </p>
      </Section>

      <Section id="retention" title="How long we keep it">
        <List>
          <li>
            <strong>Your account</strong> is kept until you ask us to delete it.
          </li>
          <li>
            <strong>A boat&apos;s documents and records</strong> are kept while the boat is on
            Newton. They belong to the boat, not to one member, so they stay when a member leaves.
          </li>
          <li>
            <strong>Held mail</strong> (the sender, subject and attachment count of mail from
            non-members) is kept with the boat today.{" "}
            <ToDecide>a shorter limit, for example 90 days</ToDecide>
          </li>
          <li>
            <strong>Copies at Resend</strong> of mail sent to a boat&apos;s address are deleted
            after 30 days.
          </li>
          <li>
            <strong>Logs and backups</strong> are kept by our providers for their standard periods.{" "}
            <ToDecide>the log and backup periods on our plans</ToDecide>
          </li>
          <li>
            When we delete an account or a boat at your request, we do it within{" "}
            <ToDecide>a number of days, for example 30</ToDecide>, including its files.
          </li>
        </List>
      </Section>

      <Section id="rights" title="Your rights, and how to use them">
        <p>You can ask us to:</p>
        <List>
          <li>
            <strong>Get a copy</strong> of your data, or of your whole boat&apos;s records and files
            if you are an owner or co-owner. Today you ask us and we send an archive; a download
            button for owners and co-owners is planned.
          </li>
          <li>
            <strong>Correct</strong> anything that is wrong.
          </li>
          <li>
            <strong>Delete</strong> your account, or a boat and everything filed for it if you are
            its owner. When you delete your account, the boat&apos;s records you added stay with the
            boat for its other members.{" "}
            <ToDecide>how a former member is shown on records they added, such as expenses they paid</ToDecide>
          </li>
          <li>
            <strong>Object to</strong> or <strong>restrict</strong> how we use your data.
          </li>
        </List>
        <p>
          Write to <ToDecide>the contact email address</ToDecide> from the address you sign in
          with. We answer within one month. If you aren&apos;t satisfied, you can complain to{" "}
          <ToDecide>the data protection authority that applies</ToDecide>.
        </p>
        <p>
          When a boat is sold, its record is meant to move to the new owner with its history.
          That isn&apos;t built yet; until then, ask us.
        </p>
      </Section>

      <Section id="security" title="Security">
        <p>
          Every page is served over HTTPS. Each boat&apos;s data is separated in the database by
          row-level security, files are in private storage and opened through links that expire
          after a short time, and sign-in uses one-time email links rather than passwords.
        </p>
      </Section>

      <Section id="children" title="Children">
        <p>
          Newton is not meant for children. You must be at least{" "}
          <ToDecide>a minimum age, for example 16</ToDecide> to create an account.
        </p>
      </Section>

      <Section id="changes" title="Changes to this policy">
        <p>
          When this policy changes, we update the date at the top. If a change affects how your
          data is used, we email account holders before it applies.
        </p>
      </Section>
    </LegalPage>
  );
}
