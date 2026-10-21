"use server";

import { registerForAlpha, type AlphaSignUpResult } from "@/lib/db";

export type AlphaSignUpState = { email: string; boatNote: string; result: AlphaSignUpResult } | null;

export async function requestAlphaPlace(
  _previous: AlphaSignUpState,
  formData: FormData,
): Promise<AlphaSignUpState> {
  const email = String(formData.get("email") ?? "");
  const boatNote = String(formData.get("boat") ?? "");
  return { email, boatNote, result: await registerForAlpha(email, boatNote) };
}
