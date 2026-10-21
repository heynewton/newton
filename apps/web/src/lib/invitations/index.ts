import type { Email } from "@/lib/reminders";

// The email someone gets when an owner or co-owner invites them to a boat. "added" means they
// already use Newton and are on the boat now; "invited" means they will be once they sign in with
// this address.

export type InvitationEmail = {
  inviterName: string;
  boatName: string;
  // How the role reads in a sentence: "a co-owner", "crew", "a read-only member".
  roleLabel: string;
  outcome: "added" | "invited";
  boatId: string;
  to: string;
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderInvitation(invitation: InvitationEmail, siteUrl: string): Email {
  const site = siteUrl.replace(/\/+$/, "");
  const { inviterName, boatName, roleLabel, outcome, to } = invitation;
  const link = outcome === "added" ? `${site}/boats/${invitation.boatId}` : `${site}/sign-in`;
  const subject =
    outcome === "added" ? `You're on ${boatName} on Hey Newton` : `${inviterName} invited you to ${boatName} on Hey Newton`;
  const lead =
    outcome === "added"
      ? `${inviterName} added you to ${boatName} as ${roleLabel}.`
      : `${inviterName} invited you to ${boatName} as ${roleLabel}.`;
  const action =
    outcome === "added"
      ? `It's in your boats on Newton now.`
      : `Sign in with this address (${to}) and the boat is there. Newton keeps the boat's documents, maintenance, renewals and shared costs in one place.`;
  const linkText = outcome === "added" ? `Open ${boatName}` : "Sign in to Hey Newton";
  const footer =
    outcome === "invited" ? "If you weren't expecting this, you can ignore it: nothing happens until you sign in." : null;

  const text = `${lead}\n\n${action}\n\n${linkText}: ${link}\n${footer ? `\n${footer}\n` : ""}`;
  const html = `<!doctype html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #18181b; line-height: 1.5;">
<p>${escapeHtml(lead)}</p>
<p>${escapeHtml(action)}</p>
<p><a href="${escapeHtml(link)}">${escapeHtml(linkText)}</a></p>
${footer ? `<p style="color: #52525b; font-size: 14px;">${escapeHtml(footer)}</p>\n` : ""}</body>
</html>`;
  return { subject, text, html };
}
