import type { MembershipRole } from "./index";

// Who can invite people to a boat, and as what (supabase/migrations/…_invitations.sql). Making
// someone an owner isn't done by invitation. Kept apart from ./index so forms in the browser can
// use it.
export const INVITE_ROLES = ["co_owner", "crew", "read_only"] as const satisfies readonly MembershipRole[];
export type InviteRole = (typeof INVITE_ROLES)[number];

export function canInvite(role: MembershipRole): boolean {
  return role === "owner" || role === "co_owner";
}
