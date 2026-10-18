import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Database } from "./database.types";

// Supabase settings from the environment. Null when they are not set (for example on a
// preview without a database), and callers then show sign-in as unavailable.
export function supabaseSettings(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

// A Supabase client acting as the signed-in person, so row-level security applies.
// Create one per request; never share it.
export async function createClient() {
  const settings = supabaseSettings();
  if (!settings) return null;
  // Database reads happen per request, never at prerender (the Supabase client reads the clock).
  await connection();
  const cookieStore = await cookies();
  return createServerClient<Database>(settings.url, settings.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components can't set cookies. The proxy refreshes the session instead.
        }
      },
    },
  });
}
