import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ALPHA_BOAT_NOTE_MAX_LENGTH } from "@/lib/db";
import { AlphaSignUpForm } from "./alpha-sign-up-form";

export const metadata: Metadata = { title: "Join the alpha test · Hey Newton" };

const alphaTest = [
  "Free while the alpha test lasts.",
  "We open places a few boats at a time, and email you when yours is ready.",
  "Expect rough edges. Tell us what's missing and help decide what comes next.",
];

export default function GetStarted() {
  return (
    <main className="mx-auto flex w-full flex-1 max-w-md flex-col justify-center gap-4 px-4 py-16">
      <Image src="/icon.svg" alt="Hey Newton logo" width={56} height={56} />
      <h1 className="text-3xl font-semibold">Join the alpha test</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Newton is in alpha. Leave your email and we&apos;ll invite you to try it on your boat.
      </p>
      <ul className="flex flex-col gap-2 text-zinc-700 dark:text-zinc-300">
        {alphaTest.map((item) => (
          <li key={item} className="flex gap-3">
            <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-teal" />
            {item}
          </li>
        ))}
      </ul>
      <AlphaSignUpForm boatNoteMaxLength={ALPHA_BOAT_NOTE_MAX_LENGTH} />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        We only use your email to invite you to the alpha test. See the{" "}
        <Link href="/privacy" className="underline">
          privacy policy
        </Link>
        . Already invited?{" "}
        <Link href="/sign-in" className="underline">
          Sign in
        </Link>
        .
      </p>
    </main>
  );
}
