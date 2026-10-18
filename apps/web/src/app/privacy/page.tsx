import type { Metadata } from "next";
import { LegalPlaceholder } from "../legal-placeholder";

export const metadata: Metadata = { title: "Privacy · Hey Newton" };

export default function Privacy() {
  return <LegalPlaceholder title="Privacy policy" />;
}
