import type { Metadata } from "next";
import Image from "next/image";
import { isSignInAvailable } from "@/lib/db";
import { FIXTURE_PEOPLE, isFixtureSignInShown } from "@/lib/db/fixture-sign-in";
import { AuthPlaceholder } from "../auth-placeholder";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in · Hey Newton" };

export default function SignIn() {
  // Previews without a database keep the placeholder.
  if (!isSignInAvailable()) return <AuthPlaceholder title="Sign in" />;

  return (
    <main className="mx-auto flex w-full flex-1 max-w-md flex-col justify-center gap-4 px-4 py-16">
      <Image src="/icon.svg" alt="Hey Newton logo" width={56} height={56} />
      <h1 className="text-3xl font-semibold">Sign in</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Enter your email and we&apos;ll send you a link. No password needed.
      </p>
      <SignInForm />
      {isFixtureSignInShown() && <FixtureSignIn />}
    </main>
  );
}

// Dev site and previews only (#97): the sample boat's people, whose addresses get no email.
function FixtureSignIn() {
  return (
    <section className="mt-6 flex flex-col gap-3 border-t border-zinc-300 pt-6 dark:border-zinc-700">
      <h2 className="font-medium">Sign in as a sample-boat person</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Dev site and previews only. These people are made up, so no email is sent.
      </p>
      <form method="post" action="/auth/fixture-sign-in" className="flex flex-wrap gap-2">
        {FIXTURE_PEOPLE.map((person) => (
          <button
            key={person.email}
            type="submit"
            name="email"
            value={person.email}
            className="min-h-11 rounded-md border border-zinc-300 px-4 py-2 font-medium hover:bg-black/5 dark:border-zinc-700 dark:hover:bg-white/10"
          >
            {person.name}
          </button>
        ))}
      </form>
    </section>
  );
}
