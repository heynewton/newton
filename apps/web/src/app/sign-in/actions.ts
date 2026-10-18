"use server";

import { headers } from "next/headers";
import { sendSignInLink, type SignInLinkResult } from "@/lib/db";

export type SignInState = { email: string; result: SignInLinkResult } | null;

export async function requestSignInLink(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "");
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const result = await sendSignInLink(email, `${origin}/auth/callback`);
  return { email, result };
}
