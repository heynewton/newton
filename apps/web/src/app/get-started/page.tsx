import type { Metadata } from "next";
import { SignInScreen } from "../sign-in/sign-in-screen";

export const metadata: Metadata = { title: "Get started · Hey Newton" };

export default function GetStarted({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <SignInScreen
      title="Get started"
      searchParams={searchParams}
      intro={
        <p
          role="note"
          className="rounded-md border border-spinnaker/60 bg-spinnaker/10 px-4 py-3 text-sm text-zinc-800 dark:text-zinc-200"
        >
          <strong>Newton is in alpha.</strong> It&apos;s free while we test it. Expect rough
          edges and features that change, and tell us what&apos;s missing.
        </p>
      }
    />
  );
}
