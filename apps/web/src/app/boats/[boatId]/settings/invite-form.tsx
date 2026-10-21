"use client";

import { useActionState } from "react";
import { INVITE_ROLES } from "@/lib/db/roles";
import { roleInSentence, roleNames } from "../../roles";
import { invite, type InviteState } from "./actions";

const errors = {
  invalid_email: "Enter their email address, like name@example.com.",
  invalid_role: "Choose co-owner, crew or read-only.",
  not_allowed: "Only the boat's owners and co-owners can invite people.",
  too_many: "20 invitations are already waiting. Cancel some before inviting more.",
  failed: "We couldn't send the invitation. Try again in a minute.",
};

const roleHints: Record<(typeof INVITE_ROLES)[number], string> = {
  co_owner: "Sees and changes the boat's records, including the shared costs, and can invite others.",
  crew: "Adds documents and records.",
  read_only: "Sees the boat's records, changes nothing.",
};

export function InviteForm({ boatId, boatName, siteUrl }: { boatId: string; boatName: string; siteUrl: string | null }) {
  const [state, formAction, pending] = useActionState<InviteState, FormData>(invite.bind(null, boatId), null);
  const error = state && "error" in state ? state.error : null;
  const done = state && "outcome" in state ? state : null;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="invite-email" className="font-medium">
          Their email address
        </label>
        <input
          id="invite-email"
          name="email"
          type="email"
          required
          autoComplete="off"
          inputMode="email"
          // React resets the form after each submit; after an error, the typed address comes back.
          defaultValue={error ? state?.email : undefined}
          aria-describedby={error ? "invite-error" : undefined}
          className="min-h-11 rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">Invite them as</legend>
        {INVITE_ROLES.map((role) => (
          <label key={role} className="flex min-h-11 items-start gap-3">
            <input
              type="radio"
              name="role"
              value={role}
              defaultChecked={(state?.role ?? "co_owner") === role}
              className="mt-1.5 size-4 accent-navy dark:accent-teal"
            />
            <span>
              <span className="font-medium">{roleNames[role]}</span>
              <span className="block text-sm text-zinc-600 dark:text-zinc-400">{roleHints[role]}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {error && (
        <p id="invite-error" role="alert" className="text-sm text-red-700 dark:text-red-400">
          {errors[error]}
        </p>
      )}
      <p role="status" className="text-zinc-700 empty:hidden dark:text-zinc-300">
        {done && <Done state={done} boatName={boatName} siteUrl={siteUrl} />}
      </p>

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-full bg-navy px-6 py-3 font-medium text-white hover:bg-navy/90 disabled:opacity-60 sm:self-start dark:bg-teal dark:text-navy dark:hover:bg-teal/90"
      >
        {pending ? "Inviting…" : "Invite"}
      </button>
    </form>
  );
}

function Done({
  state,
  boatName,
  siteUrl,
}: {
  state: Extract<NonNullable<InviteState>, { outcome: string }>;
  boatName: string;
  siteUrl: string | null;
}) {
  const who = <span className="font-medium break-all">{state.email}</span>;
  if (state.outcome === "already_on_boat") return <>{who} is already on {boatName}.</>;
  const told = state.emailed
    ? " We've emailed them."
    : ` We couldn't email them, so let them know${siteUrl ? ` they can sign in at ${siteUrl}` : ""} with that address.`;
  if (state.outcome === "added") {
    return (
      <>
        {who} is on {boatName} now, as {roleInSentence[state.role]}.{told}
      </>
    );
  }
  return (
    <>
      Invited {who} as {roleInSentence[state.role]}. They&apos;re on the boat as soon as they sign in with that
      address.{told}
    </>
  );
}
