import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Where email-in isn't set up (PR previews since #109: no Resend key or webhook secret there), the
// route answers 503 before reading the request, and never calls Resend or the database.

const fetchSpy = vi.fn<typeof fetch>();
const { POST } = await import("./route");

function post() {
  return POST(
    new Request("https://preview.vercel.app/api/email-in", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "email.received", data: { email_id: "e1", to: ["a@b.test"] } }),
    }),
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("RESEND_WEBHOOK_SECRET", "whsec_dGVzdA==");
  vi.stubEnv("INBOUND_EMAIL_DOMAIN", "boats.dev.heynewton.app");
  vi.stubEnv("SUPABASE_URL", "https://dev.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchSpy.mockReset();
});

describe("POST /api/email-in when not set up", () => {
  it.each(["RESEND_API_KEY", "RESEND_WEBHOOK_SECRET", "INBOUND_EMAIL_DOMAIN", "SUPABASE_SECRET_KEY"])(
    "answers 503 without %s",
    async (name) => {
      vi.stubEnv(name, "");
      const response = await post();
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: "Email-in is not set up here" });
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it("checks the signature once it is set up", async () => {
    const response = await post();
    expect(response.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
