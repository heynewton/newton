import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The dev-only fixture sign-in route (#97), with Supabase mocked out.

type LinkResult = { data: { properties: { hashed_token: string } }; error: { message: string } | null };
const generateLink = vi.fn<(args: { type: string; email: string }) => Promise<LinkResult>>(async () => ({
  data: { properties: { hashed_token: "hashed-token" } },
  error: null,
}));
const createSupabaseClient = vi.fn<(url: string, key: string, options: unknown) => unknown>(() => ({
  auth: { admin: { generateLink } },
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: (url: string, key: string, options: unknown) => createSupabaseClient(url, key, options),
}));

// The browser's client: verifying the token writes the session cookies through the cookie store.
const cookieStore = { getAll: vi.fn(() => []), set: vi.fn() };
type VerifyResult = { data: object; error: { message: string } | null };
const verifyOtp = vi.fn<(args: { type: string; token_hash: string }) => Promise<VerifyResult>>(async () => {
  cookieStore.set("sb-auth", "session", { path: "/" });
  return { data: {}, error: null };
});
const createServerClient = vi.fn<(url: string, key: string, options: unknown) => unknown>(() => ({ auth: { verifyOtp } }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (url: string, key: string, options: unknown) => createServerClient(url, key, options),
}));
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));

const { POST } = await import("./route");
const { FIXTURE_PEOPLE } = await import("@/lib/db/fixture-sign-in");

function post(email?: string) {
  const body = new FormData();
  if (email !== undefined) body.set("email", email);
  return POST(new NextRequest("https://preview.vercel.app/auth/fixture-sign-in", { method: "POST", body }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("FIXTURE_SIGN_IN", "1");
  vi.stubEnv("SUPABASE_URL", "https://dev.supabase.co");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
});

describe("POST /auth/fixture-sign-in", () => {
  it.each(["", "0", "true"])("is not found when FIXTURE_SIGN_IN is %j", async (flag) => {
    vi.stubEnv("FIXTURE_SIGN_IN", flag);
    const response = await post("alex@example.com");
    expect(response.status).toBe(404);
    expect(createSupabaseClient).not.toHaveBeenCalled();
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("is not found without a database, even with the flag on", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    expect((await post("alex@example.com")).status).toBe(404);
  });

  it.each([
    undefined,
    "",
    "someone@gmail.com",
    "ALEX@example.com",
    "alex@example.com.evil.io",
    "nobody@example.com",
    "alex.sample@example.org",
  ])("refuses %j without making a link", async (email) => {
    const response = await post(email);
    expect(response.status).toBe(403);
    expect(createSupabaseClient).not.toHaveBeenCalled();
  });

  it("signs a fixture person in: makes a link with the secret key and verifies it as the browser", async () => {
    const response = await post("alex@example.com");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://preview.vercel.app/boats");
    expect(createSupabaseClient).toHaveBeenCalledWith("https://dev.supabase.co", "sb_secret_test", expect.anything());
    expect(generateLink).toHaveBeenCalledWith({ type: "magiclink", email: "alex@example.com" });
    expect(createServerClient).toHaveBeenCalledWith("https://dev.supabase.co", "sb_publishable_test", expect.anything());
    expect(verifyOtp).toHaveBeenCalledWith({ type: "magiclink", token_hash: "hashed-token" });
    expect(cookieStore.set).toHaveBeenCalledWith("sb-auth", "session", { path: "/" });
  });

  it("says it isn't set up when the secret key is missing", async () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    expect((await post("sam@example.net")).status).toBe(503);
    expect(createSupabaseClient).not.toHaveBeenCalled();
  });

  it("fails when Supabase can't make the link", async () => {
    generateLink.mockResolvedValueOnce({ data: { properties: { hashed_token: "" } }, error: { message: "User not found" } });
    expect((await post("jordan@example.com")).status).toBe(502);
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("fails when the link doesn't verify", async () => {
    verifyOtp.mockResolvedValueOnce({ data: {}, error: { message: "Token has expired" } });
    expect((await post("riley@example.org")).status).toBe(502);
  });
});

describe("FIXTURE_PEOPLE", () => {
  it("are the sample boat's people, each with the address they sign in with", () => {
    const boat = JSON.parse(readFileSync(new URL("../../../../../../fixtures/sample-boat/boat.json", import.meta.url), "utf8"));
    const people = boat.people.map((p: { name: string; verifiedSenders: string[] }) => ({ name: p.name, email: p.verifiedSenders[0] }));
    expect(FIXTURE_PEOPLE).toEqual(people);
  });
});
