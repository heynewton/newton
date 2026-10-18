import type { Metadata } from "next";
import { LegalPlaceholder } from "../legal-placeholder";

export const metadata: Metadata = { title: "Terms · Hey Newton" };

export default function Terms() {
  return <LegalPlaceholder title="Terms of use" />;
}
