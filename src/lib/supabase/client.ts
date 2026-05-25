import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

export type { Database } from "./database.types";

let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null =
  null;

type AuthErrorLike = {
  message?: string;
  code?: string;
  status?: number;
};

function toAuthErrorLike(value: unknown): AuthErrorLike {
  if (!value || typeof value !== "object") {
    return {};
  }
  const maybe = value as Record<string, unknown>;
  return {
    message: typeof maybe.message === "string" ? maybe.message : undefined,
    code: typeof maybe.code === "string" ? maybe.code : undefined,
    status: typeof maybe.status === "number" ? maybe.status : undefined,
  };
}

function isRecoverableSessionError(error: unknown): boolean {
  const { message, code } = toAuthErrorLike(error);
  const normalizedMessage = (message || "").toLowerCase();
  const normalizedCode = (code || "").toLowerCase();

  if (
    normalizedCode === "refresh_token_not_found" ||
    normalizedCode === "invalid_refresh_token" ||
    normalizedCode === "invalid_grant" ||
    normalizedCode === "session_not_found"
  ) {
    return true;
  }

  return (
    normalizedMessage.includes("refresh token not found") ||
    normalizedMessage.includes("refresh_token_not_found") ||
    normalizedMessage.includes("invalid refresh token") ||
    normalizedMessage.includes("invalid_grant") ||
    normalizedMessage.includes("auth session missing") ||
    normalizedMessage.includes("session not found")
  );
}

function isRateLimitedAuthError(error: unknown): boolean {
  const { code, status, message } = toAuthErrorLike(error);
  return (
    status === 429 ||
    (code || "").toLowerCase() === "over_request_rate_limit" ||
    (message || "").toLowerCase().includes("rate limit")
  );
}

function clearPersistedAuthStorage(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key) {
        continue;
      }
      if (
        key.startsWith("sb-") ||
        key.includes("supabase.auth") ||
        key.includes("supabase-auth-token") ||
        key.includes("-auth-token")
      ) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore local storage access failures in restricted contexts.
  }
}

async function tryRecoverInvalidSession(
  client: ReturnType<typeof createBrowserClient<Database>>
): Promise<void> {
  try {
    const {
      data: { session },
      error,
    } = await client.auth.getSession();

    if (session || !error) {
      return;
    }

    if (isRecoverableSessionError(error) || isRateLimitedAuthError(error)) {
      await client.auth.signOut({ scope: "local" });
      clearPersistedAuthStorage();
    }
  } catch (error) {
    if (isRecoverableSessionError(error) || isRateLimitedAuthError(error)) {
      clearPersistedAuthStorage();
    }
  }
}

/**
 * Creates a Supabase browser client (singleton pattern).
 *
 * Safe to use in Client Components and browser-side code.
 * This is a pure client factory with no auth helpers.
 */
export function createSupabaseBrowserClient() {
  if (clientInstance) {
    return clientInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file."
    );
  }

  clientInstance = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  void tryRecoverInvalidSession(clientInstance);

  return clientInstance;
}

export const createClient = createSupabaseBrowserClient;
export const supabaseClient = createSupabaseBrowserClient;
