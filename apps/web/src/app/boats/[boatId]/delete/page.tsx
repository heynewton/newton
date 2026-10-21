import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentPerson, getMyBoat } from "@/lib/db";
import { canExport } from "@/lib/db/export";
import { DeleteBoatForm } from "./delete-boat-form";

export const metadata: Metadata = { title: "Delete boat · Hey Newton" };

// Deleting a boat (#115). Owners only: anyone else gets the same 404 as a boat they're not on.
export default function DeleteBoat({ params }: PageProps<"/boats/[boatId]/delete">) {
  return (
    <main className="mx-auto flex w-full flex-1 max-w-md flex-col justify-center gap-4 px-4 py-16">
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <Confirm params={params} />
      </Suspense>
    </main>
  );
}

async function Confirm({ params }: Pick<PageProps<"/boats/[boatId]/delete">, "params">) {
  const { boatId } = await params;
  const person = await getCurrentPerson();
  if (!person) redirect("/sign-in");
  const boat = await getMyBoat(person, boatId);
  if (!boat || boat.role !== "owner") notFound();

  return (
    <>
      <h1 className="text-3xl font-semibold break-words">Delete {boat.boatName}</h1>
      <DeleteBoatForm
        boatId={boat.boatId}
        boatName={boat.boatName}
        intro={
          <p className="text-zinc-700 dark:text-zinc-300">
            {boat.deletingSince ? (
              "Deleting this boat started but didn't finish. Confirm again to finish it."
            ) : (
              <>
                This deletes the boat for everyone on it: its documents and their files, renewals,
                maintenance, expenses, emails and members. It can&apos;t be undone.{" "}
                {canExport(boat.role) ? (
                  <>
                    To keep a copy,{" "}
                    <a href={`/boats/${boat.boatId}/export`} download className="font-medium underline">
                      download all of the boat&apos;s data
                    </a>{" "}
                    first.
                  </>
                ) : (
                  "To keep a copy, download the files you need first."
                )}
              </>
            )}
          </p>
        }
        cancel={
          !boat.deletingSince && (
            <Link href={`/boats/${boat.boatId}/settings`} className="flex min-h-11 items-center font-medium underline">
              Keep the boat
            </Link>
          )
        }
      />
    </>
  );
}
