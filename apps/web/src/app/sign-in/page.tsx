import type { Metadata } from "next";
import { SignInScreen } from "./sign-in-screen";

export const metadata: Metadata = { title: "Sign in · Hey Newton" };

export default function SignIn({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return <SignInScreen title="Sign in" searchParams={searchParams} />;
}
