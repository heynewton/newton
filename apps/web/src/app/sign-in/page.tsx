import type { Metadata } from "next";
import Image from "next/image";
import { isSignInAvailable } from "@/lib/db";
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
    </main>
  );
}
