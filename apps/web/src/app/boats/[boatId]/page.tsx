import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { canInvite, getBoatRecords, getCurrentPerson, getMyBoat } from "@/lib/db";
import { boatEmailAddress } from "@/lib/email-in";
import { getBoatProcedures } from "@/lib/db/procedures";
import { attentionSummary, costSplit, schedule, todayUtc } from "@/lib/records";
import { roleNames } from "../roles";
import { AttentionSummary, BoatProcedures, CoOwnerBalance, ComingUp, Documents } from "./records";

export const metadata: Metadata = { title: "Your boat · Hey Newton" };

// Renewals and maintenance due within this many days, or this many engine hours, count as due soon.
const DUE_SOON_DAYS = 60;
const DUE_SOON_ENGINE_HOURS = 25;

const list = new Intl.ListFormat("en-GB", { type: "conjunction" });

// What to do next with the boat: steps that can be done now and aren't done yet. What isn't built
// yet is listed in one line instead.
function nextSteps(
  boatId: string,
  address: string | null,
  hasDocuments: boolean,
  inviteOthers: boolean,
): { steps: { title: string; description: ReactNode }[]; comingSoon: string[] } {
  const steps = [];
  const comingSoon = [];
  if (!address) {
    comingSoon.push("forwarding documents to the boat's own email address"); // #10: needs the inbound domain where this runs
  } else if (!hasDocuments) {
    steps.push({
      title: "Forward documents to the boat",
      description: (
        <>
          Send invoices and insurance to the boat&apos;s address, or import an existing Google Drive folder.
          Newton files them with the boat.{" "}
          <a href="#documents" className="inline-flex min-h-11 items-center font-medium underline">
            Find the address
          </a>
        </>
      ),
    });
  }
  if (inviteOthers) {
    steps.push({
      title: "Invite your co-owners",
      description: (
        <>
          Co-owners see the boat&apos;s records and shared costs, and can forward documents too.{" "}
          <Link href={`/boats/${boatId}/settings#people`} className="inline-flex min-h-11 items-center font-medium underline">
            Invite someone
          </Link>
        </>
      ),
    });
  }
  comingSoon.push("asking about the boat from its manuals and procedures"); // #14, #21
  return { steps, comingSoon };
}

export default function BoatHome({ params }: PageProps<"/boats/[boatId]">) {
  return (
    <main className="mx-auto flex w-full flex-1 max-w-5xl flex-col gap-10 px-4 py-10 sm:py-16">
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <Boat params={params} />
      </Suspense>
    </main>
  );
}

async function Boat({ params }: Pick<PageProps<"/boats/[boatId]">, "params">) {
  const { boatId } = await params;
  const person = await getCurrentPerson();
  if (!person) redirect("/sign-in");
  const boat = await getMyBoat(person, boatId);
  if (!boat) notFound();
  if (boat.deletingSince) return <BeingDeleted boatId={boat.boatId} boatName={boat.boatName} isOwner={boat.role === "owner"} />;

  const [records, procedures] = await Promise.all([getBoatRecords(boat.boatId), getBoatProcedures(boat.boatId)]);
  const today = todayUtc(new Date());
  const due = schedule(records.renewals, records.maintenance, {
    today,
    withinDays: DUE_SOON_DAYS,
    withinEngineHours: DUE_SOON_ENGINE_HOURS,
  });
  const split = costSplit(
    records.expenses,
    records.members.map((m) => ({ person_id: m.personId, ownership_share: m.ownershipShare })),
  );
  const documents = new Map(records.documents.map((d) => [d.id, d]));
  const address = boatEmailAddress(boat.emailAlias, process.env.INBOUND_EMAIL_DOMAIN);
  // Until someone else is on the boat, its owners and co-owners are asked to invite them.
  const next = nextSteps(boat.boatId, address, records.documents.length > 0, canInvite(boat.role) && records.members.length === 1);

  return (
    <>
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold break-words sm:text-4xl">{boat.boatName}</h1>
        <p className="text-zinc-600 dark:text-zinc-400">You&apos;re its {roleNames[boat.role].toLowerCase()}.</p>
        <AttentionSummary parts={attentionSummary(due, split, person.id, DUE_SOON_DAYS)} />
      </header>

      <ComingUp
        schedule={due}
        withinDays={DUE_SOON_DAYS}
        today={today}
        boatId={boat.boatId}
        documents={documents}
        maintenance={records.maintenance}
      />
      <CoOwnerBalance
        split={split}
        expenses={records.expenses}
        members={records.members}
        personId={person.id}
        boatId={boat.boatId}
        documents={documents}
      />
      <Documents documents={records.documents} boatId={boat.boatId} address={address} canImportDrive={canInvite(boat.role)} />
      <BoatProcedures procedures={procedures} />

      <section aria-labelledby="next-steps" className="flex flex-col gap-4">
        <h2 id="next-steps" className="text-xl font-semibold">
          Next steps
        </h2>
        {next.steps.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2">
            {next.steps.map((step) => (
              <li
                key={step.title}
                className="flex flex-col gap-2 rounded-2xl border border-black/10 p-5 dark:border-white/15"
              >
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-zinc-700 dark:text-zinc-300">{step.description}</p>
              </li>
            ))}
          </ul>
        )}
        <p className="text-zinc-600 dark:text-zinc-400">
          Coming soon: {list.format(next.comingSoon)}.
        </p>
      </section>
    </>
  );
}

// A boat whose deletion started but didn't finish (#115). Some of its files may already be gone,
// so its records aren't shown; an owner can finish deleting it.
function BeingDeleted({ boatId, boatName, isOwner }: { boatId: string; boatName: string; isOwner: boolean }) {
  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-3xl font-semibold break-words sm:text-4xl">{boatName}</h1>
      <p className="text-zinc-700 dark:text-zinc-300">This boat is being deleted.</p>
      <nav className="flex flex-wrap gap-x-6">
        {isOwner && (
          <Link href={`/boats/${boatId}/delete`} className="flex min-h-11 items-center font-medium underline">
            Finish deleting it
          </Link>
        )}
        <Link href="/boats" className="flex min-h-11 items-center font-medium underline">
          Your boats
        </Link>
      </nav>
    </section>
  );
}
