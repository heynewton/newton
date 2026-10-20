"use server";

import { redirect } from "next/navigation";
import { deleteBoat, getCurrentPerson, type BoatRemoved } from "@/lib/db";

export type DeleteBoatState =
  | { ok: true; boatName: string; removed: BoatRemoved }
  | { ok: false; error: "not_owner" | "name_mismatch" | "files_left" | "failed" }
  | null;

export async function removeBoat(
  boatId: string,
  _previous: DeleteBoatState,
  formData: FormData,
): Promise<DeleteBoatState> {
  const person = await getCurrentPerson();
  if (!person) redirect("/sign-in");
  const typedName = String(formData.get("name") ?? "");
  const result = await deleteBoat(person, boatId, typedName);
  // No redirect on success: the summary of what was removed is the confirmation.
  return result.ok
    ? { ok: true, boatName: typedName.trim(), removed: result.removed }
    : { ok: false, error: result.reason };
}
