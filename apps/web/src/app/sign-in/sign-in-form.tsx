"use client";

import { useActionState } from "react";
import { requestSignInLink, type SignInState } from "./actions";

const errors = {
  invalid_email: "That doesn't look like an email address.",
  unavailable: "Sign-in isn't available here yet.",
  failed: "We couldn't send the link. Wait a minute and try again.",
};

export function SignInForm() {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(
    requestSignInLink,
    null,
  );

  if (state?.result.ok) {
    return (
      <p role="status" className="text-zinc-700 dark:text-zinc-300">
        Check your inbox. We sent a sign-in link to <strong>{state.email}</strong>. It works
        once, for one hour.
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
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
