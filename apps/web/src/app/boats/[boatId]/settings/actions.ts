"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cancelInvitation, getCurrentPerson, getMyBoat, inviteToBoat, type InviteRole } from "@/lib/db";
import { renderInvitation } from "@/lib/invitations";
import { ResendMailer } from "@/lib/reminders/resend";
import { roleInSentence } from "../../roles";

export type InviteState =
  | { email: string; role: string; error: "invalid_email" | "invalid_role" | "not_allowed" | "too_many" | "failed" }
  | { email: string; role: InviteRole; outcome: "added" | "invited" | "already_on_boat"; emailed: boolean }
  | null;

export async function invite(boatId: string, _previous: InviteState, formData: FormData): Promise<InviteState> {
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  const person = await getCurrentPerson();
  if (!person) redirect("/sign-in");
  const boat = await getMyBoat(person, boatId);
  if (!boat) return { email, role, error: "not_allowed" };

  const result = await inviteToBoat(boat.boatId, email, role);
  if (!result.ok) return { email, role, error: result.reason };
  revalidatePath(`/boats/${boat.boatId}`, "layout");
  if (result.outcome === "already_on_boat") return { email, role: role as InviteRole, outcome: result.outcome, emailed: false };

  const emailed = await sendInvitationEmail({
    to: email,
    inviterName: person.displayName ?? person.email ?? "Someone on the boat",
    boatName: boat.boatName,
    boatId: boat.boatId,
    roleLabel: roleInSentence[role as InviteRole],
    outcome: result.outcome,
  });
  return { email, role: role as InviteRole, outcome: result.outcome, emailed };
}

// Tells the person by email. Where Resend isn't set up (previews, a local stack without a key)
// nothing is sent, and the page says so, so the inviter can tell them instead. A failed send
// doesn't undo the invitation.
async function sendInvitationEmail(invitation: Parameters<typeof renderInvitation>[0]): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const siteUrl = process.env.SITE_URL;
  if (!apiKey || !siteUrl) return false;
  const mailer = new ResendMailer(apiKey, process.env.REMINDERS_FROM || undefined, process.env.RESEND_API_URL || undefined);
  // Pressing Invite twice within a minute sends one email.
  const minute = new Date().toISOString().slice(0, 16);
  try {
    await mailer.send(
      invitation.to,
      renderInvitation(invitation, siteUrl),
      `invitations/${invitation.boatId}/${invitation.to.toLowerCase()}/${minute}`,
    );
    return true;
  } catch (error) {
    console.error("invitations: email not sent", error instanceof Error ? error.message : error);
    return false;
  }
}

export async function cancel(boatId: string, invitationId: string): Promise<void> {
  await cancelInvitation(boatId, invitationId);
  revalidatePath(`/boats/${boatId}/settings`);
}
