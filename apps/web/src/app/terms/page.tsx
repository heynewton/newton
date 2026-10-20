import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, List, Section, ToDecide } from "../legal-page";

export const metadata: Metadata = { title: "Terms · Hey Newton" };

// When the text changes, change this date too.
const LAST_UPDATED = "2026-10-19";

export default function Terms() {
  return (
    <LegalPage title="Terms of use" lastUpdated={LAST_UPDATED} draft>
      <Section id="about" title="About these terms">
        <p>
          These terms cover the Hey Newton service at heynewton.app (&ldquo;Newton&rdquo;), run by{" "}
          <ToDecide>the name of the person or organisation responsible, and a postal address</ToDecide>
          . By creating an account you agree to them. How we handle your data is in the{" "}
          <Link className="underline" href="/privacy">
            privacy policy
          </Link>
          .
        </p>
      </Section>

      <Section id="safety" title="Newton supports the skipper; it doesn't replace them">
        <p>
          Newton helps you find information about your boat. It does not replace navigation,
          seamanship or good judgement, and it is not a source of official information.
        </p>
        <List>
          <li>
            The skipper is always responsible for the boat and the people on board. Don&apos;t rely
            on Newton for any decision that affects safety.
          </li>
          <li>
            Use official charts, tide tables, notices to mariners, weather forecasts and the
            boat&apos;s own instruments for navigation. Newton&apos;s answers come with their source
            and how old the data is: check them against those sources.
          </li>
          <li>
            Newton can be wrong, out of date, or unavailable (no signal, an outage, a provider
            problem). Answers written by an AI model can be mistaken even when they cite a source.
          </li>
          <li>
            Reminders and cost splits are aids. You remain responsible for renewing insurance and
            certificates and for maintaining the boat. A cost split is arithmetic on what is
            recorded, not accounting, tax or legal advice; co-owners settle up between themselves.
          </li>
        </List>
      </Section>

      <Section id="account" title="Your account">
        <List>
          <li>An account is for one person. Keep access to your email secure: anyone who can read it can sign in as you.</li>
          <li>
            You must be at least <ToDecide>a minimum age, for example 16</ToDecide> to create an
            account.
          </li>
          <li>
            A boat&apos;s owner decides who is on the boat and with which role. Everyone on a boat
            can read its documents and records.
          </li>
        </List>
      </Section>

      <Section id="content" title="Your content">
        <List>
          <li>
            What you and your boat&apos;s members send to Newton stays yours. You allow us to store
            and process it, including through the providers in the privacy policy, only to run
            Newton for your boat.
          </li>
          <li>
            Only forward or add documents you are entitled to share, including other people&apos;s
            details in them.
          </li>
          <li>
            Keep the originals of important documents. Newton is not a legal archive.
          </li>
        </List>
      </Section>

      <Section id="use" title="Acceptable use">
        <p>Don&apos;t use Newton to:</p>
        <List>
          <li>break the law, or store content you have no right to hold;</li>
          <li>send spam, malware or other people&apos;s mail through a boat&apos;s address;</li>
          <li>try to reach another boat&apos;s data, or get around limits and security;</li>
          <li>overload the service, or scrape it with automated tools.</li>
        </List>
        <p>
          If you find a security problem, please tell us privately at{" "}
          <ToDecide>the contact for security reports</ToDecide> rather than in public.
        </p>
      </Section>

      <Section id="free" title="A free service, with no guarantee">
        <p>
          Newton is a free hobby project. It is provided &ldquo;as is&rdquo;, without any
          warranty, and we don&apos;t promise it will always be available, correct or kept running.
          We may change or stop features at any time.
        </p>
        <p>
          <ToDecide>
            a limitation of liability that works under the law that applies (consumer law may not
            allow excluding all liability)
          </ToDecide>
        </p>
        <p>If Newton ever becomes a paid service, paid plans will have their own terms.</p>
      </Section>

      <Section id="licence" title="Open source">
        <p>
          Newton&apos;s code is open source under the{" "}
          <a className="underline" href="https://github.com/heynewton/newton/blob/main/LICENSE">
            GNU Affero General Public License v3.0
          </a>
          . The licence covers the code; these terms cover the service we run at heynewton.app. If
          you run your own copy of the code, the licence applies to it and these terms don&apos;t.
        </p>
      </Section>

      <Section id="ending" title="Ending your account">
        <List>
          <li>
            You can stop using Newton at any time and ask us to delete your account or your boat,
            as described in the{" "}
            <Link className="underline" href="/privacy#rights">
              privacy policy
            </Link>
            . Ask for a copy of your data first if you want one.
          </li>
          <li>
            We may suspend or close an account that breaks these terms. Unless the problem is
            serious, we tell you first and give you a chance to fix it.
          </li>
          <li>
            If we shut Newton down, we tell account holders at least{" "}
            <ToDecide>a notice period, for example 30 days</ToDecide> before, so you can download
            your data.
          </li>
        </List>
      </Section>

      <Section id="changes" title="Changes to these terms">
        <p>
          When these terms change, we update the date at the top and email account holders about
          significant changes before they apply. If you don&apos;t agree, you can close your
          account.
        </p>
      </Section>

      <Section id="law" title="Law and contact">
        <p>
          These terms are governed by <ToDecide>the applicable law and courts</ToDecide>. Questions
          go to <ToDecide>the contact email address</ToDecide>.
        </p>
      </Section>
    </LegalPage>
  );
}
