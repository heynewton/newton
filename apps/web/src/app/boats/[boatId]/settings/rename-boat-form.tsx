"use client";

import { useActionState } from "react";
import { changeBoatName, type RenameBoatState } from "./actions";

const errors = {
  invalid_name: "Give the boat a name of up to 100 characters.",
  not_owner: "Only the boat's owners can rename it.",
  failed: "We couldn't rename the boat. Try again in a minute.",
};

export function RenameBoatForm({
  boatId,
  boatName,
  maxLength,
}: {
  boatId: string;
  boatName: string;
  maxLength: number;
}) {
  const [state, formAction, pending] = useActionState<RenameBoatState, FormData>(
    changeBoatName.bind(null, boatId),
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label htmlFor="name" className="font-medium">
        Boat name
      </label>
      <input
        id="name"
        name="name"
        type="text"
        required
        maxLength={maxLength}
        autoComplete="off"
        // React resets the form after the action: keep what was typed when it was refused.
        defaultValue={state && !state.ok ? state.name : boatName}
        aria-describedby={`name-hint${state ? " name-result" : ""}`}
        className="min-h-11 rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
      />
      <p id="name-hint" className="text-sm text-zinc-600 dark:text-zinc-400">
        The boat&apos;s email address stays the same.
      </p>
      {state &&
        (state.ok ? (
          <p id="name-result" role="status" className="text-sm text-green-700 dark:text-green-400">
            Renamed to {state.boatName}.
          </p>
        ) : (
          <p id="name-result" role="alert" className="text-sm text-red-700 dark:text-red-400">
            {errors[state.error]}
          </p>
        ))}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-full bg-navy px-6 py-3 font-medium text-white hover:bg-navy/90 disabled:opacity-60 sm:self-start dark:bg-teal dark:text-navy dark:hover:bg-teal/90"
      >
        {pending ? "Saving…" : "Save name"}
      </button>
    </form>
  );
}
