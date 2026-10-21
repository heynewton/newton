"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sendSignInLink, startGoogleSignIn, type SignInLinkResult } from "@/lib/db";

export type SignInState = { email: string; result: SignInLinkResult } | null;

async function callbackUrl(): Promise<string> {
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  return `${origin}/auth/callback`;
}

export async function requestSignInLink(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "");
  const result = await sendSignInLink(email, await callbackUrl());
  return { email, result };
}

// Sends the person to Google, which returns them to the same callback as a magic link.
export async function signInWithGoogle(): Promise<void> {
  const url = await startGoogleSignIn(await callbackUrl());
  redirect(url ?? "/sign-in?error=google");
}
