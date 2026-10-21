"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentPerson, renameBoat } from "@/lib/db";

export type RenameBoatState =
  | { ok: true; boatName: string }
  | { ok: false; name: string; error: "invalid_name" | "not_owner" | "failed" }
  | null;

export async function changeBoatName(
  boatId: string,
  _previous: RenameBoatState,
  formData: FormData,
): Promise<RenameBoatState> {
  const person = await getCurrentPerson();
  if (!person) redirect("/sign-in");
  const name = String(formData.get("name") ?? "");
  const result = await renameBoat(person, boatId, name);
  if (!result.ok) return { ok: false, name, error: result.reason };
  // The name shows in the header's boat list (in the root layout) and on every boat page.
  revalidatePath("/", "layout");
  return { ok: true, boatName: result.boatName };
}
