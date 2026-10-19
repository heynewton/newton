import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The proxy's session refresh, with Supabase mocked out.

type CookieAdapter = {
  getAll: () => { name: string; value: string }[];
  setAll: (cookies: { name: string; value: string; options: object }[], headers: Record<string, string>) => void;
};

let claims: object | null = null;
let onGetClaims: ((cookies: CookieAdapter) => void) | null = null;
const createServerClient = vi.fn((_url: string, _key: string, options: { cookies: CookieAdapter }) => ({
  auth: {
    getClaims: async () => {
      onGetClaims?.(options.cookies);
      return { data: claims ? { claims } : null, error: null };
    },
  },
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (url: string, key: string, options: { cookies: CookieAdapter }) => createServerClient(url, key, options),
}));

const { refreshSession } = await import("./session");

const request = () => new NextRequest("http://localhost:3000/boats", { headers: { cookie: "sb-auth=old" } });

beforeEach(() => {
  claims = null;
  onGetClaims = null;
  createServerClient.mockClear();
  vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
});

describe("refreshSession", () => {
  it("is signed out without Supabase settings, and doesn't create a client", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    const { signedIn, response } = await refreshSession(request());
    expect(signedIn).toBe(false);
    expect(response.status).toBe(200);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("is signed out when the token has no valid claims", async () => {
    expect((await refreshSession(request())).signedIn).toBe(false);
  });

  it("is signed in when the token has claims, reading the request's cookies", async () => {
    claims = { sub: "auth-user" };
    let seen: { name: string; value: string }[] = [];
    onGetClaims = (cookies) => (seen = cookies.getAll());
    expect((await refreshSession(request())).signedIn).toBe(true);
    expect(seen).toEqual([{ name: "sb-auth", value: "old" }]);
  });

  it("puts refreshed cookies and cache headers on the response", async () => {
    claims = { sub: "auth-user" };
    onGetClaims = (cookies) =>
      cookies.setAll([{ name: "sb-auth", value: "new", options: { path: "/", httpOnly: true } }], {
        "Cache-Control": "private, no-store",
      });
    const { response } = await refreshSession(request());
    expect(response.cookies.get("sb-auth")?.value).toBe("new");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
