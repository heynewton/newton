"use client";

import { useActionState } from "react";
import type { BoatProcedure } from "@/lib/db/procedures";
import {
  removeProcedure,
  saveProcedure,
  type ProcedureDeleteState,
  type ProcedureSaveState,
} from "./procedure-actions";

const muted = "text-zinc-600 dark:text-zinc-400";
const button =
  "min-h-11 w-fit rounded-full border border-black/15 px-5 font-medium hover:bg-black/5 disabled:opacity-60 dark:border-white/20 dark:hover:bg-white/10";

const saveErrors = {
  invalid_title: "Give the procedure a title of up to 120 characters.",
  invalid_content: "Add procedure text of up to 12,000 characters.",
  not_allowed: "Only the boat's owners and co-owners can change procedures.",
  indexing_unavailable: "Procedure search is unavailable until Voyage AI is configured.",
  failed: "We couldn't save and index the procedure. Try again in a minute.",
};

function ProcedureEditor({
  boatId,
  procedure,
  titleMaxLength,
  contentMaxLength,
}: {
  boatId: string;
  procedure: BoatProcedure | null;
  titleMaxLength: number;
  contentMaxLength: number;
}) {
  const [state, formAction, pending] = useActionState<ProcedureSaveState, FormData>(
    saveProcedure.bind(null, boatId, procedure?.id ?? null),
    null,
  );
  const id = procedure?.id ?? "new";
  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-2xl border border-black/10 p-5 dark:border-white/15">
      <h3 className="font-semibold">{procedure ? `Edit ${procedure.title}` : "Add a procedure"}</h3>
      <label htmlFor={`procedure-title-${id}`} className="font-medium">
        Title
      </label>
      <input
        id={`procedure-title-${id}`}
        name="title"
        type="text"
        required
        maxLength={titleMaxLength}
        defaultValue={state ? state.title : (procedure?.title ?? "")}
        className="min-h-11 rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
      />
      <label htmlFor={`procedure-content-${id}`} className="font-medium">
        Procedure
      </label>
      <textarea
        id={`procedure-content-${id}`}
        name="content"
        required
        maxLength={contentMaxLength}
        rows={6}
        defaultValue={state ? state.content : (procedure?.content ?? "")}
        className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
      />
      <p className={`text-sm ${muted}`}>Newton indexes procedures for boat-specific answers and cites the last edit.</p>
      {state &&
        ("saved" in state ? (
          <p role="status" className="text-sm text-green-700 dark:text-green-400">
            Saved and indexed.
          </p>
        ) : (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {saveErrors[state.error]}
          </p>
        ))}
      <button type="submit" disabled={pending} className={button}>
        {pending ? "Saving…" : procedure ? "Save changes" : "Add procedure"}
      </button>
    </form>
  );
}

function DeleteProcedure({ boatId, procedure }: { boatId: string; procedure: BoatProcedure }) {
  const [state, formAction, pending] = useActionState<ProcedureDeleteState, FormData>(
    removeProcedure.bind(null, boatId, procedure.id),
    null,
  );
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-x-4">
      <button type="submit" disabled={pending} className="min-h-11 font-medium text-red-700 underline disabled:opacity-60 dark:text-red-400">
        {pending ? "Deleting…" : "Delete"}
      </button>
      {state && (
        <span role={"deleted" in state ? "status" : "alert"} className={`text-sm ${"deleted" in state ? muted : "text-red-700 dark:text-red-400"}`}>
          {"deleted" in state ? "Deleted." : state.error === "not_allowed" ? "Only owners and co-owners can delete procedures." : "Couldn't delete this procedure."}
        </span>
      )}
    </form>
  );
}

export function ProcedureManager({
  boatId,
  procedures,
  titleMaxLength,
  contentMaxLength,
}: {
  boatId: string;
  procedures: BoatProcedure[];
  titleMaxLength: number;
  contentMaxLength: number;
}) {
  return (
    <section aria-labelledby="procedures" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="procedures" className="text-xl font-semibold">
          Boat procedures
        </h2>
        <p className={muted}>Add the boat-specific routines you want Newton to answer from.</p>
      </div>
      {procedures.map((procedure) => (
        <div key={procedure.id} className="flex flex-col gap-2">
          <ProcedureEditor
            boatId={boatId}
            procedure={procedure}
            titleMaxLength={titleMaxLength}
            contentMaxLength={contentMaxLength}
          />
          <DeleteProcedure boatId={boatId} procedure={procedure} />
        </div>
      ))}
      <ProcedureEditor boatId={boatId} procedure={null} titleMaxLength={titleMaxLength} contentMaxLength={contentMaxLength} />
    </section>
  );
}
