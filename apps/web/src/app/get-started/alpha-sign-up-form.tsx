"use client";

import { useActionState } from "react";
import { requestAlphaPlace, type AlphaSignUpState } from "./actions";

const errors = {
  invalid_email: "That doesn't look like an email address.",
  boat_note_too_long: "Keep the line about your boat under 500 characters.",
  unavailable: "Registration isn't available here yet.",
  failed: "We couldn't register you. Wait a minute and try again.",
};

export function AlphaSignUpForm({ boatNoteMaxLength }: { boatNoteMaxLength: number }) {
  const [state, formAction, pending] = useActionState<AlphaSignUpState, FormData>(
    requestAlphaPlace,
    null,
  );

  if (state?.result.ok) {
    return (
      <p role="status" className="text-zinc-700 dark:text-zinc-300">
        You&apos;re on the list. We&apos;ll email <strong>{state.email}</strong> when there&apos;s
        a place for your boat.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label htmlFor="email" className="font-medium">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state?.email}
        className="min-h-11 rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
      />
      <label htmlFor="boat" className="font-medium">
        Your boat <span className="font-normal text-zinc-600 dark:text-zinc-400">(optional)</span>
      </label>
      <textarea
        id="boat"
        name="boat"
        rows={3}
        maxLength={boatNoteMaxLength}
        placeholder="Type and size, where you sail, how many owners"
        defaultValue={state?.boatNote}
        className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
      />
      {state && !state.result.ok && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {errors[state.result.reason]}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-md bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Registering…" : "Register for the alpha test"}
      </button>
    </form>
  );
}
