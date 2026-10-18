import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentPerson, listMyBoats, signOut, type MembershipRole } from "@/lib/db";

export const metadata: Metadata = { title: "Your boats · Hey Newton" };

const roleNames: Record<MembershipRole, string> = {
  owner: "Owner",
  co_owner: "Co-owner",
  crew: "Crew",
  read_only: "Read-only",
};

export default function Boats() {
  return (
    <main className="mx-auto flex w-full flex-1 max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold">Your boats</h1>
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <MyBoats />
      </Suspense>
    </main>
  );
}

async function MyBoats() {
  const person = await getCurrentPerson();
  if (!person) redirect("/sign-in");
  const boats = await listMyBoats(person);

  return (
    <>
      {boats.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">
          You&apos;re not on a boat yet. Adding your first boat is coming next.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {boats.map((boat) => (
            <li key={boat.boatId} className="flex justify-between py-3">
              <span className="font-medium">{boat.boatName}</span>
              <span className="text-zinc-600 dark:text-zinc-400">{roleNames[boat.role]}</span>
            </li>
          ))}
        </ul>
      )}
      <form
        action={async () => {
          "use server";
          await signOut();
          redirect("/");
        }}
        className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400"
      >
        <span>Signed in as {person.displayName ?? person.email}</span>
        <button type="submit" className="min-h-11 font-medium underline">
          Sign out
        </button>
      </form>
    </>
  );
}
