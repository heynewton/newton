import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Link expired · Hey Newton" };

export default function LinkExpired() {
  return (
    <main className="mx-auto flex w-full flex-1 max-w-md flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-3xl font-semibold">That link didn&apos;t work</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Sign-in links work once and expire after an hour. They also only work in the browser
        you asked for them in.
      </p>
      <Link href="/sign-in" className="inline-flex min-h-11 items-center font-medium underline">
        Send a new link
      </Link>
    </main>
  );
}
