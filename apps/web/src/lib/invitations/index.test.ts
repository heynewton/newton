import { describe, expect, it } from "vitest";
import { renderInvitation, type InvitationEmail } from "./index";

const invitation: InvitationEmail = {
  inviterName: "Alex Sample",
  boatName: "Kittiwake",
  roleLabel: "a co-owner",
  outcome: "invited",
  boatId: "00000000-0000-4000-8000-000000000001",
  to: "sam@example.com",
};

describe("renderInvitation", () => {
  it("asks someone new to sign in with the invited address", () => {
    const email = renderInvitation(invitation, "https://heynewton.app/");
    expect(email.subject).toBe("Alex Sample invited you to Kittiwake on Hey Newton");
    expect(email.text).toContain("Alex Sample invited you to Kittiwake as a co-owner.");
    expect(email.text).toContain("Sign in with this address (sam@example.com)");
    expect(email.text).toContain("https://heynewton.app/sign-in");
    expect(email.text).toContain("you can ignore it");
    expect(email.html).toContain('<a href="https://heynewton.app/sign-in">Sign in to Hey Newton</a>');
  });

  it("links someone already on Newton straight to the boat", () => {
    const email = renderInvitation({ ...invitation, outcome: "added", roleLabel: "crew" }, "https://heynewton.app");
    expect(email.subject).toBe("You're on Kittiwake on Hey Newton");
    expect(email.text).toContain("Alex Sample added you to Kittiwake as crew.");
    expect(email.text).toContain(`https://heynewton.app/boats/${invitation.boatId}`);
    expect(email.text).not.toContain("ignore it");
  });

  it("escapes names in the HTML", () => {
    const email = renderInvitation({ ...invitation, inviterName: "<b>Alex</b>", boatName: "Tom & Jerry" }, "https://heynewton.app");
    expect(email.html).toContain("&lt;b&gt;Alex&lt;/b&gt; invited you to Tom &amp; Jerry");
    expect(email.html).not.toContain("<b>Alex</b>");
  });
});
