"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import { removeBoat, type DeleteBoatState } from "./actions";

const errors = {
  not_owner: "Only the boat's owners can delete it.",
  name_mismatch: "Type the boat's name exactly as shown to confirm.",
  files_left: "Some files are still being removed, or new ones just arrived. Try again.",
  failed: "We couldn't finish deleting the boat. Try again in a minute: nothing deleted so far comes back.",
};

// What each kind of row is called in the summary, in the order shown.
const rowNames: [key: string, one: string, many: string][] = [
  ["documents", "document", "documents"],
  ["renewals", "renewal", "renewals"],
  ["maintenance_items", "maintenance item", "maintenance items"],
  ["expenses", "expense", "expenses"],
  ["inbound_emails", "email", "emails"],
  ["reminders_sent", "reminder sent", "reminders sent"],
  ["document_chunks", "search index entry", "search index entries"],
  ["memberships", "membership", "memberships"],
];

function count(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

// `intro` and `cancel` show until the boat is deleted, then the summary replaces them.
export function DeleteBoatForm({
  boatId,
  boatName,
  intro,
  cancel,
}: {
  boatId: string;
  boatName: string;
  intro: ReactNode;
  cancel: ReactNode;
}) {
  const [state, formAction, pending] = useActionState<DeleteBoatState, FormData>(
    removeBoat.bind(null, boatId),
    null,
  );
  const [typed, setTyped] = useState("");

  if (state?.ok) {
    const { files, rows } = state.removed;
    return (
      <div role="status" className="flex flex-col gap-3">
        <p className="font-medium">{state.boatName} is deleted. Newton removed:</p>
        <ul className="list-disc pl-6 text-zinc-700 dark:text-zinc-300">
          <li>{count(files, "file", "files")} from storage</li>
          {rowNames
            .filter(([key]) => (rows[key] ?? 0) > 0)
            .map(([key, one, many]) => (
              <li key={key}>{count(rows[key], one, many)}</li>
            ))}
        </ul>
        <Link href="/boats" className="flex min-h-11 items-center font-medium underline">
          Your boats
        </Link>
      </div>
    );
  }

  return (
    <>
      {intro}
      <form action={formAction} className="flex flex-col gap-3">
        <label htmlFor="name" className="font-medium">
          Type <span className="font-semibold">{boatName}</span> to confirm
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoComplete="off"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          aria-describedby={state ? "name-error" : undefined}
          className="min-h-11 rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
        {state && !state.ok && (
          <p id="name-error" role="alert" className="text-sm text-red-700 dark:text-red-400">
            {errors[state.error]}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || typed.trim() !== boatName}
          className="min-h-11 rounded-full bg-red-700 px-6 py-3 font-medium text-white hover:bg-red-700/90 disabled:opacity-60 sm:self-start"
        >
          {pending ? "Deleting…" : "Delete this boat and its files"}
        </button>
      </form>
      {cancel}
    </>
  );
}
