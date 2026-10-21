import type { BoatMember, Invitation } from "@/lib/db";
import { roleNames } from "../../roles";
import { cancel } from "./actions";
import { InviteForm } from "./invite-form";

const card = "rounded-2xl border border-black/10 p-5 dark:border-white/15";
const muted = "text-zinc-600 dark:text-zinc-400";

// Who is on the boat, who is invited, and the form to invite someone. Shown to owners and
// co-owners; only they can invite (supabase/migrations/…_invitations.sql).
export function People({
  boatId,
  boatName,
  members,
  invitations,
  personId,
  siteUrl,
}: {
  boatId: string;
  boatName: string;
  members: BoatMember[];
  invitations: Invitation[];
  personId: string;
  siteUrl: string | null;
}) {
  return (
    <section aria-labelledby="people" className="flex flex-col gap-4">
      <h2 id="people" className="text-xl font-semibold">
        People on this boat
      </h2>
      <ul className={`${card} flex flex-col divide-y divide-black/10 py-0 dark:divide-white/15`}>
        {members.map((member) => (
          <li key={member.personId} className="flex flex-wrap items-baseline justify-between gap-x-4 py-3">
            <span className="min-w-0 break-words">
              {member.name}
              {member.personId === personId && <span className={muted}> (you)</span>}
            </span>
            <span className={muted}>{roleNames[member.role]}</span>
          </li>
        ))}
      </ul>

      {invitations.length > 0 && (
        <>
          <h3 className="font-semibold">Waiting to sign in</h3>
          <ul className={`${card} flex flex-col divide-y divide-black/10 py-0 dark:divide-white/15`}>
            {invitations.map((invitation) => (
              <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-x-4 py-2">
                <span className="min-w-0 break-all">{invitation.email}</span>
                <span className="flex items-center gap-4">
                  <span className={muted}>{roleNames[invitation.role]}</span>
                  <form action={cancel.bind(null, boatId, invitation.id)}>
                    <button
                      type="submit"
                      aria-label={`Cancel the invitation for ${invitation.email}`}
                      className="min-h-11 font-medium underline"
                    >
                      Cancel
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className={`${card} flex flex-col gap-4`}>
        <h3 className="font-semibold">Invite someone</h3>
        <p className="text-zinc-700 dark:text-zinc-300">
          If they already use Newton, they&apos;re on {boatName} at once. If not, they are as soon as they sign in
          with that address. Either way we email them.
        </p>
        <InviteForm boatId={boatId} boatName={boatName} siteUrl={siteUrl} />
      </div>
    </section>
  );
}
