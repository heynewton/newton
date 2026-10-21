import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getBoatRecords, getCurrentPerson, getMyBoat } from "@/lib/db";
import { EXPORT_MAX_FILE_BYTES, canExport } from "@/lib/db/export";
import { ExportData } from "../records";

export const metadata: Metadata = { title: "Boat settings · Hey Newton" };

// Export and delete (#142), away from the everyday links of the boat page and linked from the
// header's account menu. Owners and co-owners only: crew and read-only members get the same 404 as
// a boat they're not on, and only owners see delete.
export default function BoatSettings({ params }: PageProps<"/boats/[boatId]/settings">) {
  return (
    <main className="mx-auto flex w-full flex-1 max-w-2xl flex-col gap-10 px-4 py-10 sm:py-16">
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <Settings params={params} />
      </Suspense>
    </main>
  );
}

async function Settings({ params }: Pick<PageProps<"/boats/[boatId]/settings">, "params">) {
  const { boatId } = await params;
  const person = await getCurrentPerson();
  if (!person) redirect("/sign-in");
  const boat = await getMyBoat(person, boatId);
  if (!boat || !canExport(boat.role)) notFound();
  // A boat being deleted can't be exported (its files are partly gone), only finished off.
  const records = boat.deletingSince ? null : await getBoatRecords(boat.boatId);

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">Boat settings</h1>
        <p className="break-words text-zinc-600 dark:text-zinc-400">{boat.boatName}</p>
      </header>

      {records && (
        <ExportData
          boatId={boat.boatId}
          fileBytes={records.documents.reduce((n, d) => n + (d.sizeBytes ?? 0), 0)}
          maxFileBytes={EXPORT_MAX_FILE_BYTES}
        />
      )}

      {boat.role === "owner" && (
        <section
          aria-labelledby="delete"
          className="flex flex-col gap-3 rounded-2xl border-2 border-red-700/40 p-5 dark:border-red-400/40"
        >
          <h2 id="delete" className="text-xl font-semibold text-red-700 dark:text-red-400">
            Delete this boat
          </h2>
          <p className="text-zinc-700 dark:text-zinc-300">
            {boat.deletingSince
              ? "Deleting this boat started but didn't finish."
              : "Removes the boat for everyone on it, with all its records and files. You'll be asked to confirm, and it can't be undone."}
          </p>
          <Link
            href={`/boats/${boat.boatId}/delete`}
            className="flex min-h-11 w-fit items-center rounded-full border-2 border-red-700 px-5 font-medium text-red-700 hover:bg-red-700/10 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-400/10"
          >
            {boat.deletingSince ? "Finish deleting it" : "Delete this boat…"}
          </Link>
        </section>
      )}

      <Link href={`/boats/${boat.boatId}`} className="flex min-h-11 w-fit items-center font-medium underline">
        Back to {boat.boatName}
      </Link>
    </>
  );
}
