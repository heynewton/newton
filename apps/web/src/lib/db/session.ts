import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseSettings } from "./client";
import type { Database } from "./database.types";

// Called from the proxy on every page request: refreshes the sign-in session cookie before
// it expires, since Server Components can't write cookies themselves.
export async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const settings = supabaseSettings();
  if (!settings) return response;

  const supabase = createServerClient<Database>(settings.url, settings.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  // Validates the token and refreshes it if needed. Must run before the response is returned.
  await supabase.auth.getClaims();
  return response;
}
