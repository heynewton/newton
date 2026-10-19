import type { MembershipRole } from "@/lib/db";

export const roleNames: Record<MembershipRole, string> = {
  owner: "Owner",
  co_owner: "Co-owner",
  crew: "Crew",
  read_only: "Read-only",
};
