import type { Metadata } from "next";
import { AuthPlaceholder } from "../auth-placeholder";

export const metadata: Metadata = { title: "Get started · Hey Newton" };

export default function GetStarted() {
  return <AuthPlaceholder title="Get started for free" />;
}
