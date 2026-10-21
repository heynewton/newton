import { beforeEach, describe, expect, it, vi } from "vitest";

// The data-access layer with Supabase mocked out: what each function asks the client for, and
// how it turns the answers (and errors) into what pages get.

type Result = { data?: unknown; error?: { message: string; code?: string } | null };

// A stand-in for supabase-js: records every call and answers with the result set for it.
const calls: { method: string; args: unknown[] }[] = [];
let results: Record<string, Result> = {};

function answer(key: string): Result {
  return { data: null, error: null, ...results[key] };
}

function query(table: string) {
  const builder = {
    select: (...args: unknown[]) => (calls.push({ method: `${table}.select`, args }), builder),
    eq: (...args: unknown[]) => (calls.push({ method: `${table}.eq`, args }), builder),
    maybeSingle: async () => answer(table),
    then: (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(answer(table)).then(resolve, reject),
  };
  return builder;
}

const fakeClient = {
  auth: {
    signInWithOAuth: vi.fn(async (args: unknown) => (calls.push({ method: "auth.signInWithOAuth", args: [args] }), answer("signInWithOAuth"))),
    signInWithOtp: vi.fn(async (args: unknown) => (calls.push({ method: "auth.signInWithOtp", args: [args] }), answer("signInWithOtp"))),
    exchangeCodeForSession: vi.fn(async (code: string) => (calls.push({ method: "auth.exchangeCodeForSession", args: [code] }), answer("exchangeCodeForSession"))),
    signOut: vi.fn(async () => (calls.push({ method: "auth.signOut", args: [] }), answer("signOut"))),
  },
  rpc: vi.fn(async (fn: string, args?: unknown) => (calls.push({ method: `rpc.${fn}`, args: [args] }), answer(`rpc.${fn}`))),
  from: (table: string) => query(table),
  storage: {
    from: (bucket: string) => ({
      remove: async (paths: string[]) => (calls.push({ method: `storage.${bucket}.remove`, args: [paths] }), answer(`storage.${bucket}.remove`)),
    }),
  },
};

const createServerClient = vi.fn<(...args: unknown[]) => typeof fakeClient>(() => fakeClient);
vi.mock("@supabase/ssr", () => ({ createServerClient: (...args: unknown[]) => createServerClient(...args) }));

const cookieStore = { getAll: vi.fn(() => [{ name: "sb", value: "token" }]), set: vi.fn() };
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));

const db = await import("./index");

const ALEX = { id: "00000000-0000-4000-8000-000000000101", email: "alex@example.com", displayName: "Alex Sample" };
const BOAT_ID = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  calls.length = 0;
  results = {};
  createServerClient.mockClear();
  cookieStore.set.mockReset();
  vi.unstubAllGlobals();
  vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
});

function withoutSupabase() {
  vi.stubEnv("SUPABASE_URL", "");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "");
}

describe("sendSignInLink", () => {
  it.each(["", "   ", "alex", "alex@", "@example.com", "alex@example", "a b@example.com", "alex@@example.com"])(
    "refuses %j without calling Supabase",
    async (email) => {
      expect(await db.sendSignInLink(email, "https://heynewton.app/auth/callback")).toEqual({ ok: false, reason: "invalid_email" });
      expect(createServerClient).not.toHaveBeenCalled();
    },
  );

  it("says sign-in is unavailable without Supabase settings", async () => {
    withoutSupabase();
    expect(db.isSignInAvailable()).toBe(false);
    expect(await db.sendSignInLink("alex@example.com", "https://heynewton.app/auth/callback")).toEqual({
      ok: false,
      reason: "unavailable",
    });
  });

  it("reports a provider error as failed", async () => {
    results.signInWithOtp = { error: { message: "rate limited" } };
    expect(await db.sendSignInLink("alex@example.com", "https://heynewton.app/auth/callback")).toEqual({ ok: false, reason: "failed" });
  });

  it("sends the link to the trimmed address, back to the given page", async () => {
    expect(db.isSignInAvailable()).toBe(true);
    expect(await db.sendSignInLink("  alex@example.com ", "https://heynewton.app/auth/callback")).toEqual({ ok: true });
    expect(calls).toEqual([
      {
        method: "auth.signInWithOtp",
        args: [{ email: "alex@example.com", options: { emailRedirectTo: "https://heynewton.app/auth/callback" } }],
      },
    ]);
  });
});

describe("Google and Apple sign-in", () => {
  function authSettings(response: Response | Error) {
    const fetch = vi.fn(async () => {
      if (response instanceof Error) throw response;
      return response;
    });
    vi.stubGlobal("fetch", fetch);
    return fetch;
  }

  it.each([
    [{ google: true, apple: false, github: true }, ["google"]],
    [{ google: false, apple: true }, ["apple"]],
    [{ google: true, apple: true }, ["google", "apple"]],
  ])("offers the providers the auth server has turned on (%o)", async (external, expected) => {
    const fetch = authSettings(Response.json({ external }));
    expect(await db.availableSignInProviders()).toEqual(expected);
    expect(fetch).toHaveBeenCalledWith("http://127.0.0.1:54321/auth/v1/settings", expect.objectContaining({ headers: { apikey: "sb_publishable_test" } }));
  });

  it.each([
    ["both are off", Response.json({ external: { google: false, apple: false } })],
    ["the settings can't be read", new Response("nope", { status: 500 })],
    ["the auth server is down", new Error("connection refused")],
  ])("offers none when %s", async (_case, response) => {
    authSettings(response);
    expect(await db.availableSignInProviders()).toEqual([]);
  });

  it("offers none, and doesn't start, without Supabase settings", async () => {
    withoutSupabase();
    const fetch = authSettings(Response.json({ external: { google: true, apple: true } }));
    expect(await db.availableSignInProviders()).toEqual([]);
    expect(await db.startProviderSignIn("apple", "https://heynewton.app/auth/callback")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });

  it.each(["google", "apple"] as const)("starts with %s, back to the given page", async (provider) => {
    results.signInWithOAuth = { data: { provider, url: `https://auth.example/authorize?provider=${provider}` } };
    expect(await db.startProviderSignIn(provider, "https://heynewton.app/auth/callback")).toBe(`https://auth.example/authorize?provider=${provider}`);
    expect(calls).toEqual([
      {
        method: "auth.signInWithOAuth",
        args: [{ provider, options: { redirectTo: "https://heynewton.app/auth/callback", skipBrowserRedirect: true } }],
      },
    ]);
  });

  it("is null when the provider refuses", async () => {
    results.signInWithOAuth = { error: { message: "Unsupported provider: provider is not enabled" } };
    expect(await db.startProviderSignIn("apple", "https://heynewton.app/auth/callback")).toBeNull();
  });
});

describe("finishSignIn and signOut", () => {
  it("exchanges the link's code for a session", async () => {
    expect(await db.finishSignIn("code-123")).toBe(true);
    expect(calls).toEqual([{ method: "auth.exchangeCodeForSession", args: ["code-123"] }]);
  });

  it("is false for an invalid or expired code", async () => {
    results.exchangeCodeForSession = { error: { message: "invalid flow state" } };
    expect(await db.finishSignIn("old")).toBe(false);
  });

  it("is false without Supabase settings, and signing out does nothing", async () => {
    withoutSupabase();
    expect(await db.finishSignIn("code-123")).toBe(false);
    await db.signOut();
    expect(calls).toEqual([]);
  });

  it("signs out", async () => {
    await db.signOut();
    expect(calls).toEqual([{ method: "auth.signOut", args: [] }]);
  });
});

describe("the Supabase client", () => {
  it("acts as the signed-in person through their cookies", async () => {
    await db.signOut();
    expect(createServerClient).toHaveBeenCalledWith("http://127.0.0.1:54321", "sb_publishable_test", expect.any(Object));
    const options = createServerClient.mock.calls[0]![2] as {
      cookies: { getAll: () => unknown; setAll: (c: { name: string; value: string; options: object }[]) => void };
    };
    expect(options.cookies.getAll()).toEqual([{ name: "sb", value: "token" }]);
    options.cookies.setAll([{ name: "sb", value: "new", options: { path: "/" } }]);
    expect(cookieStore.set).toHaveBeenCalledWith("sb", "new", { path: "/" });
  });

  it("doesn't fail when a Server Component can't set cookies", async () => {
    await db.signOut();
    const options = createServerClient.mock.calls[0]![2] as { cookies: { setAll: (c: object[]) => void } };
    cookieStore.set.mockImplementation(() => {
      throw new Error("Cookies can only be modified in a Server Action or Route Handler");
    });
    expect(() => options.cookies.setAll([{ name: "sb", value: "new", options: {} }])).not.toThrow();
  });
});

describe("getCurrentPerson", () => {
  it("is null when signed out", async () => {
    expect(await db.getCurrentPerson()).toBeNull();
    expect(calls.map((c) => c.method)).toEqual(["rpc.current_person_id"]);
  });

  it("is null without Supabase settings", async () => {
    withoutSupabase();
    expect(await db.getCurrentPerson()).toBeNull();
  });

  it("maps the person's row", async () => {
    results["rpc.current_person_id"] = { data: ALEX.id };
    results.people = { data: { id: ALEX.id, email: ALEX.email, display_name: ALEX.displayName } };
    expect(await db.getCurrentPerson()).toEqual(ALEX);
    expect(calls).toContainEqual({ method: "people.eq", args: ["id", ALEX.id] });
  });

  it("is null when the person's row can't be read", async () => {
    results["rpc.current_person_id"] = { data: ALEX.id };
    expect(await db.getCurrentPerson()).toBeNull();
  });
});

describe("listMyBoats and getMyBoat", () => {
  it("maps memberships to boats with roles, sorted by name", async () => {
    results.memberships = {
      data: [
        { role: "read_only", boats: { id: "b2", name: "Petrel" } },
        { role: "owner", boats: { id: "b1", name: "Kittiwake" } },
        { role: "co_owner", boats: { id: "b3", name: "albatross" } },
      ],
    };
    expect(await db.listMyBoats(ALEX)).toEqual([
      { boatId: "b3", boatName: "albatross", role: "co_owner" },
      { boatId: "b1", boatName: "Kittiwake", role: "owner" },
      { boatId: "b2", boatName: "Petrel", role: "read_only" },
    ]);
    expect(calls).toContainEqual({ method: "memberships.eq", args: ["person_id", ALEX.id] });
  });

  it("throws when the boats can't be loaded, and is empty without Supabase", async () => {
    results.memberships = { error: { message: "boom" } };
    await expect(db.listMyBoats(ALEX)).rejects.toThrow("Could not load boats: boom");
    withoutSupabase();
    expect(await db.listMyBoats(ALEX)).toEqual([]);
  });

  it("finds one of the person's boats", async () => {
    results.memberships = { data: { role: "owner", boats: { id: BOAT_ID, name: "Kittiwake" } } };
    expect(await db.getMyBoat(ALEX, BOAT_ID)).toEqual({ boatId: BOAT_ID, boatName: "Kittiwake", role: "owner" });
    expect(calls).toContainEqual({ method: "memberships.eq", args: ["boat_id", BOAT_ID] });
  });

  it("is null for a boat they're not on, and doesn't query for an ID that isn't one", async () => {
    expect(await db.getMyBoat(ALEX, BOAT_ID)).toBeNull();
    calls.length = 0;
    expect(await db.getMyBoat(ALEX, "not-a-uuid")).toBeNull();
    expect(calls).toEqual([]);
  });
});

describe("deleteBoat", () => {
  const owner = { role: "owner", boats: { id: BOAT_ID, name: "Kittiwake", email_alias: "kittiwake", deleting_since: null } };
  const paths = [`${BOAT_ID}/a.pdf`, `${BOAT_ID}/email/1/0-b.pdf`];
  const rows = { documents: 2, memberships: 1 };

  it("marks the boat, removes its files, then deletes its rows, and reports what went", async () => {
    results.memberships = { data: owner };
    results["rpc.begin_boat_deletion"] = { data: paths };
    results["storage.documents.remove"] = { data: paths.map((name) => ({ name })) };
    results["rpc.delete_boat"] = { data: rows };
    expect(await db.deleteBoat(ALEX, BOAT_ID, " Kittiwake ")).toEqual({ ok: true, removed: { files: 2, rows } });
    expect(calls.filter((c) => !c.method.startsWith("memberships."))).toEqual([
      { method: "rpc.begin_boat_deletion", args: [{ boat: BOAT_ID }] },
      { method: "storage.documents.remove", args: [paths] },
      { method: "rpc.delete_boat", args: [{ boat: BOAT_ID }] },
    ]);
  });

  it("removes files in batches of 1000", async () => {
    const many = Array.from({ length: 2001 }, (_, i) => `${BOAT_ID}/${i}.pdf`);
    results.memberships = { data: owner };
    results["rpc.begin_boat_deletion"] = { data: many };
    results["storage.documents.remove"] = { data: [{ name: "x" }] };
    results["rpc.delete_boat"] = { data: rows };
    await db.deleteBoat(ALEX, BOAT_ID, "Kittiwake");
    const batches = calls.filter((c) => c.method === "storage.documents.remove").map((c) => (c.args[0] as string[]).length);
    expect(batches).toEqual([1000, 1000, 1]);
  });

  it.each(["co_owner", "crew", "read_only"])("refuses a %s without touching anything", async (role) => {
    results.memberships = { data: { ...owner, role } };
    expect(await db.deleteBoat(ALEX, BOAT_ID, "Kittiwake")).toEqual({ ok: false, reason: "not_owner" });
    expect(calls.some((c) => c.method.startsWith("rpc.") || c.method.startsWith("storage."))).toBe(false);
  });

  it("refuses a boat the person isn't on", async () => {
    expect(await db.deleteBoat(ALEX, BOAT_ID, "Kittiwake")).toEqual({ ok: false, reason: "not_owner" });
  });

  it("refuses when the typed name doesn't match exactly", async () => {
    results.memberships = { data: owner };
    expect(await db.deleteBoat(ALEX, BOAT_ID, "kittiwake")).toEqual({ ok: false, reason: "name_mismatch" });
    expect(calls.some((c) => c.method.startsWith("rpc."))).toBe(false);
  });

  it("stops before deleting rows when removing files fails", async () => {
    results.memberships = { data: owner };
    results["rpc.begin_boat_deletion"] = { data: paths };
    results["storage.documents.remove"] = { error: { message: "storage down" } };
    expect(await db.deleteBoat(ALEX, BOAT_ID, "Kittiwake")).toEqual({ ok: false, reason: "failed" });
    expect(calls.some((c) => c.method === "rpc.delete_boat")).toBe(false);
  });

  it.each([
    ["55000", "files_left"],
    ["42501", "not_owner"],
    ["XX000", "failed"],
  ])("maps delete_boat error %s to %s", async (code, reason) => {
    results.memberships = { data: owner };
    results["rpc.begin_boat_deletion"] = { data: [] };
    results["rpc.delete_boat"] = { error: { message: "no", code } };
    expect(await db.deleteBoat(ALEX, BOAT_ID, "Kittiwake")).toEqual({ ok: false, reason });
  });
});

describe("registerForAlpha", () => {
  it.each(["", "   ", "sam", "sam@example", "a b@example.com", `${"x".repeat(310)}@example.com`])(
    "refuses the address %j without calling Supabase",
    async (email) => {
      expect(await db.registerForAlpha(email, "")).toEqual({ ok: false, reason: "invalid_email" });
      expect(calls).toEqual([]);
    },
  );

  it("refuses an overlong line about the boat without calling Supabase", async () => {
    expect(await db.registerForAlpha("sam@example.com", "x".repeat(501))).toEqual({ ok: false, reason: "boat_note_too_long" });
    expect(calls).toEqual([]);
  });

  it("registers the trimmed address and line about the boat", async () => {
    expect(await db.registerForAlpha(" sam@example.com ", "  Sample 30, sample harbour ")).toEqual({ ok: true });
    expect(calls).toEqual([
      { method: "rpc.register_for_alpha", args: [{ email_address: "sam@example.com", boat_note: "Sample 30, sample harbour" }] },
    ]);
  });

  it("leaves out an empty line about the boat", async () => {
    expect(await db.registerForAlpha("sam@example.com", "   ")).toEqual({ ok: true });
    expect(calls).toEqual([{ method: "rpc.register_for_alpha", args: [{ email_address: "sam@example.com" }] }]);
  });

  it("fails when the database does", async () => {
    results["rpc.register_for_alpha"] = { error: { message: "no", code: "XX000" } };
    expect(await db.registerForAlpha("sam@example.com", "")).toEqual({ ok: false, reason: "failed" });
  });

  it("is unavailable without Supabase settings", async () => {
    withoutSupabase();
    expect(await db.registerForAlpha("sam@example.com", "")).toEqual({ ok: false, reason: "unavailable" });
  });
});

describe("createBoat", () => {
  it.each(["", "   ", "x".repeat(101)])("refuses the name %j without calling Supabase", async (name) => {
    expect(await db.createBoat(name)).toEqual({ ok: false, reason: "invalid_name" });
    expect(calls).toEqual([]);
  });

  it("creates the boat with the trimmed name", async () => {
    results["rpc.create_boat"] = { data: BOAT_ID };
    expect(await db.createBoat("  Kittiwake ")).toEqual({ ok: true, boatId: BOAT_ID });
    expect(calls).toEqual([{ method: "rpc.create_boat", args: [{ boat_name: "Kittiwake" }] }]);
    expect(await db.createBoat("x".repeat(100))).toEqual({ ok: true, boatId: BOAT_ID });
  });

  it.each([
    ["42501", "signed_out"],
    ["23514", "invalid_name"],
    ["XX000", "failed"],
  ])("maps database error %s to %s", async (code, reason) => {
    results["rpc.create_boat"] = { error: { message: "no", code } };
    expect(await db.createBoat("Kittiwake")).toEqual({ ok: false, reason });
  });

  it("is signed out without Supabase settings", async () => {
    withoutSupabase();
    expect(await db.createBoat("Kittiwake")).toEqual({ ok: false, reason: "signed_out" });
  });
});
