import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BOAT_NAME_MAX_LENGTH, getCurrentPerson } from "@/lib/db";
import { NewBoatForm } from "./new-boat-form";

export const metadata: Metadata = { title: "Add your boat · Hey Newton" };

// The one form we can't avoid (principle 3): it asks only for the name. Make, model,
// registration and home port come later from forwarded documents.
export default function NewBoat() {
  return (
    <main className="mx-auto flex w-full flex-1 max-w-md flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-3xl font-semibold">Add your boat</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Just the name for now. Newton fills in the rest from the documents you send it, and
        you&apos;ll be the boat&apos;s owner.
      </p>
      <NewBoatForm maxLength={BOAT_NAME_MAX_LENGTH} />
      <Suspense>
        <RequireSignIn />
      </Suspense>
    </main>
  );
}

// Sends signed-out visitors to sign in.
async function RequireSignIn() {
  if (!(await getCurrentPerson())) redirect("/sign-in");
  return null;
}
