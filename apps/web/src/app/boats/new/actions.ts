"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createBoat } from "@/lib/db";

export type NewBoatState = { name: string; error: "invalid_name" | "failed" } | null;

export async function addBoat(_previous: NewBoatState, formData: FormData): Promise<NewBoatState> {
  const name = String(formData.get("name") ?? "");
  const result = await createBoat(name);
  if (result.ok) {
    // The header's boat list (boats/layout.tsx) is kept across navigations, so ask for it again.
    revalidatePath("/boats", "layout");
    redirect(`/boats/${result.boatId}`);
  }
  if (result.reason === "signed_out") redirect("/sign-in");
  return { name, error: result.reason };
}
