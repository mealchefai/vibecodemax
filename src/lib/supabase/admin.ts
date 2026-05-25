import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type { Database } from "./database.types";

let adminClient: SupabaseClient<Database> | null = null;

/**
 * Creates a Supabase admin client using service role key.
 *
 * WARNING: This client bypasses Row Level Security (RLS).
 * Only use for administrative operations, webhooks, or system-level tasks.
 *
 * SERVER-ONLY: Never expose this client or its methods to the browser.
 */
export function supabaseAdmin() {
  // Runtime check to prevent accidental client-side usage
  if (typeof window !== "undefined") {
    throw new Error(
      "supabaseAdmin() cannot be used in the browser. This is a server-only client with elevated privileges."
    );
  }

  if (adminClient) {
    return adminClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.");
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY environment variable. " +
        "This key is required for admin operations. " +
        "Find it in your Supabase project settings under API > service_role key."
    );
  }

  adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
