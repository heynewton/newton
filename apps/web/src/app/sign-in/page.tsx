import type { Metadata } from "next";
import { AuthPlaceholder } from "../auth-placeholder";

export const metadata: Metadata = { title: "Sign in · Hey Newton" };

export default function SignIn() {
  return <AuthPlaceholder title="Sign in" />;
}
