import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Where the magic link and Google sign-in come back to, with the data layer mocked out.

const finishSignIn = vi.fn<(code: string) => Promise<boolean>>(async () => true);
vi.mock("@/lib/db", () => ({ finishSignIn: (code: string) => finishSignIn(code) }));

const { GET } = await import("./route");

function get(query: string) {
  return GET(new NextRequest(`https://heynewton.app/auth/callback${query}`));
}

beforeEach(() => finishSignIn.mockClear());

describe("the sign-in callback", () => {
  it("swaps the code for a session and goes to the person's boats", async () => {
    const response = await get("?code=code-123");
    expect(finishSignIn).toHaveBeenCalledWith("code-123");
    expect(response.headers.get("location")).toBe("https://heynewton.app/boats");
  });

  it("sends an invalid or expired code to the link-expired page", async () => {
    finishSignIn.mockResolvedValueOnce(false);
    expect((await get("?code=old")).headers.get("location")).toBe("https://heynewton.app/sign-in/link-expired");
    expect((await get("")).headers.get("location")).toBe("https://heynewton.app/sign-in/link-expired");
  });

  it("sends a cancelled Google sign-in back to sign-in with a message", async () => {
    const response = await get("?error=access_denied&error_description=The+user+denied+access");
    expect(finishSignIn).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://heynewton.app/sign-in?error=google");
  });
});
