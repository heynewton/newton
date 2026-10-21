import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentPerson } from "@/lib/db";
import { StatusScreen, primaryAction } from "./status-screen";

export const metadata: Metadata = { title: "Not found · Hey Newton" };

// Unknown addresses, and boats that don't exist or that the person isn't on: the database can't
// tell those two apart for them, so the screen doesn't either.
export default function NotFound() {
  return (
    <StatusScreen
      title="This page isn't here"
      actions={
        <Suspense fallback={<HomepageLink />}>
          <WayBack />
        </Suspense>
      }
    >
      <p>There is nothing at this address, or it belongs to a boat that isn&apos;t shared with you.</p>
      <p>If someone added you to a boat, check that you signed in with the email they invited.</p>
    </StatusScreen>
  );
}

// Signed in: back to their boats. Otherwise, or while that is being checked: the homepage.
async function WayBack() {
  const person = await getCurrentPerson().catch(() => null);
  if (!person) return <HomepageLink />;
  return (
    <Link href="/boats" className={primaryAction}>
      Your boats
    </Link>
  );
}

function HomepageLink() {
  return (
    <Link href="/" className={primaryAction}>
      Back to the homepage
    </Link>
  );
}
