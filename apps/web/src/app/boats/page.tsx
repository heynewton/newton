import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentPerson, listMyBoats } from "@/lib/db";
import { roleNames } from "./roles";

export const metadata: Metadata = { title: "Your boats · Hey Newton" };

// Where a signed-in person lands: no boat → add one, one boat → its home, several → pick one.
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
  if (boats.length === 0) redirect("/boats/new");
  if (boats.length === 1) redirect(`/boats/${boats[0].boatId}`);

  return (
    <ul className="flex flex-col gap-3">
      {boats.map((boat) => (
        <li key={boat.boatId}>
          <Link
            href={`/boats/${boat.boatId}`}
            className="flex min-h-14 items-center justify-between gap-4 rounded-2xl border border-black/10 px-5 py-3 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
          >
            <span className="font-medium break-words">{boat.boatName}</span>
            <span className="shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
              {roleNames[boat.role]}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
