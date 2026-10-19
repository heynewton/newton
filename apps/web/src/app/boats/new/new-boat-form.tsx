"use client";

import { useActionState } from "react";
import { addBoat, type NewBoatState } from "./actions";

const errors = {
  invalid_name: "Give the boat a name of up to 100 characters.",
  failed: "We couldn't create the boat. Try again in a minute.",
};

export function NewBoatForm({ maxLength }: { maxLength: number }) {
  const [state, formAction, pending] = useActionState<NewBoatState, FormData>(addBoat, null);

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
        defaultValue={state?.name}
        aria-describedby={state ? "name-error" : undefined}
        className="min-h-11 rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
      />
      {state && (
        <p id="name-error" role="alert" className="text-sm text-red-700 dark:text-red-400">
          {errors[state.error]}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-full bg-navy px-6 py-3 font-medium text-white hover:bg-navy/90 disabled:opacity-60 sm:self-start dark:bg-teal dark:text-navy dark:hover:bg-teal/90"
      >
        {pending ? "Creating…" : "Create boat"}
      </button>
    </form>
  );
}
