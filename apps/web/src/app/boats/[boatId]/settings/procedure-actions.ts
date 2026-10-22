"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/db";
import { deleteBoatProcedure, saveBoatProcedure } from "@/lib/db/procedures";

export type ProcedureSaveState =
  | { title: string; content: string; saved: true }
  | { title: string; content: string; error: "invalid_title" | "invalid_content" | "not_allowed" | "indexing_unavailable" | "failed" }
  | null;

export async function saveProcedure(
  boatId: string,
  procedureId: string | null,
  _previous: ProcedureSaveState,
  formData: FormData,
): Promise<ProcedureSaveState> {
  const title = String(formData.get("title") ?? "");
  const content = String(formData.get("content") ?? "");
  const person = await getCurrentPerson();
  if (!person) redirect("/sign-in");
  const result = await saveBoatProcedure(person, boatId, procedureId, title, content);
  if (!result.ok) return { title, content, error: result.reason };
  revalidatePath(`/boats/${boatId}`);
  revalidatePath(`/boats/${boatId}/settings`);
  return { title: title.trim(), content: content.trim(), saved: true };
}

export type ProcedureDeleteState = { deleted: true } | { error: "not_allowed" | "failed" } | null;

export async function removeProcedure(
  boatId: string,
  procedureId: string,
  _previous: ProcedureDeleteState,
  _formData: FormData,
): Promise<ProcedureDeleteState> {
  void _previous;
  void _formData;
  const person = await getCurrentPerson();
  if (!person) redirect("/sign-in");
  const result = await deleteBoatProcedure(person, boatId, procedureId);
  if (!result.ok) return { error: result.reason };
  revalidatePath(`/boats/${boatId}`);
  revalidatePath(`/boats/${boatId}/settings`);
  return { deleted: true };
}
