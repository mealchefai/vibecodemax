import { createServerClient as createSsrServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";
import type { Database } from "./database.types";

export type { Database } from "./database.types";

/**
 * Creates a Supabase server client with cookie handling.
 *
 * This client is session-aware when auth cookies exist, and works as
 * an anonymous client when no cookies are present (graceful degradation).
 *
 * Safe to use in Server Components, Route Handlers, and Server Actions.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createSsrServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set({ name, value, ...options });
          }
        } catch {
          // Called from a Server Component; ignore.
          // This is expected when reading session in Server Components.
        }
      },
    },
  });
}

export const createServerClient = createSupabaseServerClient;
export const supabaseServer = createSupabaseServerClient;

export async function createSupabaseReadOnlyClient() {
  const { url, anonKey } = getSupabaseEnv();

  return createClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
