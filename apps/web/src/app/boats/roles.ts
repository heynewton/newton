import type { MembershipRole } from "@/lib/db";

export const roleNames: Record<MembershipRole, string> = {
  owner: "Owner",
  co_owner: "Co-owner",
  crew: "Crew",
  read_only: "Read-only",
};

// How a role reads after "as": "invited you to Kestrel as a co-owner".
export const roleInSentence: Record<MembershipRole, string> = {
  owner: "an owner",
  co_owner: "a co-owner",
  crew: "crew",
  read_only: "a read-only member",
};
