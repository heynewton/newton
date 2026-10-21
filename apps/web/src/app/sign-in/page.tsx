import type { Metadata } from "next";
import Image from "next/image";
import { Suspense, type ReactNode } from "react";
import { availableSignInProviders, isSignInAvailable, type SignInProvider } from "@/lib/db";
import { FIXTURE_PEOPLE, isFixtureSignInShown } from "@/lib/db/fixture-sign-in";
import { AuthPlaceholder } from "../auth-placeholder";
import { signInWithApple, signInWithGoogle } from "./actions";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in · Hey Newton" };

export default function SignIn({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // Previews without a database keep the placeholder.
  if (!isSignInAvailable()) return <AuthPlaceholder title="Sign in" />;

  return (
    <main className="mx-auto flex w-full flex-1 max-w-md flex-col justify-center gap-4 px-4 py-16">
      <Image src="/icon.svg" alt="Hey Newton logo" width={56} height={56} />
      <h1 className="text-3xl font-semibold">Sign in</h1>
      <Suspense fallback={<SignInOptionsShell providers={[]} />}>
        <SignInOptions searchParams={searchParams} />
      </Suspense>
      {isFixtureSignInShown() && <FixtureSignIn />}
    </main>
  );
}

// Asks the auth server which providers are on, so it renders per request, behind Suspense.
async function SignInOptions({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [providers, { error }] = await Promise.all([availableSignInProviders(), searchParams]);
  return <SignInOptionsShell providers={providers} providerFailed={error === "provider"} />;
}

const PROVIDER_NAMES: Record<SignInProvider, string> = { google: "Google", apple: "Apple" };

function SignInOptionsShell({
  providers,
  providerFailed = false,
}: {
  providers: SignInProvider[];
  providerFailed?: boolean;
}) {
  const names = providers.map((provider) => PROVIDER_NAMES[provider]).join(" or ");
  return (
    <>
      <p className="text-zinc-600 dark:text-zinc-400">
        {names
          ? `Continue with ${names}, or enter your email and we'll send you a link. No password needed.`
          : "Enter your email and we'll send you a link. No password needed."}
      </p>
      {providerFailed && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          That sign-in didn&apos;t finish. Try again, or use a link by email.
        </p>
      )}
      {providers.length > 0 && <ProviderSignIn providers={providers} />}
      <SignInForm />
    </>
  );
}

// One button per provider the auth server has turned on: Google (#131), Apple (#27).
function ProviderSignIn({ providers }: { providers: SignInProvider[] }) {
  return (
    <>
      {providers.map((provider) => (
        <ProviderButton key={provider} provider={provider} />
      ))}
      <p className="flex items-center gap-3 text-sm text-zinc-500 before:h-px before:flex-1 before:bg-zinc-300 after:h-px after:flex-1 after:bg-zinc-300 dark:before:bg-zinc-700 dark:after:bg-zinc-700">
        or
      </p>
    </>
  );
}

const PROVIDER_BUTTONS: Record<SignInProvider, { action: () => Promise<void>; logo: ReactNode }> = {
  google: { action: signInWithGoogle, logo: <GoogleLogo /> },
  apple: { action: signInWithApple, logo: <AppleLogo /> },
};

function ProviderButton({ provider }: { provider: SignInProvider }) {
  const { action, logo } = PROVIDER_BUTTONS[provider];
  return (
    <form action={action}>
      <button
        type="submit"
        className="flex min-h-11 w-full items-center justify-center gap-3 rounded-md border border-zinc-300 px-4 py-2 font-medium hover:bg-black/5 dark:border-zinc-700 dark:hover:bg-white/10"
      >
        {logo}
        Continue with {PROVIDER_NAMES[provider]}
      </button>
    </form>
  );
}

// Apple's logo in the text colour, as Apple's outlined "Sign in with Apple" button style allows.
function AppleLogo() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 814 1000" fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
    </svg>
  );
}

// Google's "G", in its own colours as Google's sign-in branding asks.
function GoogleLogo() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
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
