import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Auth-specific helpers for server-side authentication.
 *
 * These wrappers use the shared Supabase server client from the integrations layer
 * to provide convenient auth-focused methods.
 */

type AuthErrorLike = {
  message?: string;
  code?: string;
  status?: number;
};

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

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

function isNextDynamicServerError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybe = error as { digest?: unknown; description?: unknown };
  return (
    maybe.digest === "DYNAMIC_SERVER_USAGE" ||
    (typeof maybe.description === "string" &&
      maybe.description.includes("Dynamic server usage"))
  );
}

async function clearServerAuthState(
  supabase: SupabaseServerClient
): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Ignore cookie write failures in server component contexts.
  }
}

export async function getSupabaseSession() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      if (isRecoverableSessionError(error)) {
        await clearServerAuthState(supabase);
        return null;
      }
      if (isRateLimitedAuthError(error)) {
        return null;
      }
      console.error("Error getting session:", error);
      return null;
    }

    return session;
  } catch (error) {
    if (isNextDynamicServerError(error)) {
      throw error;
    }
    if (isRecoverableSessionError(error) || isRateLimitedAuthError(error)) {
      return null;
    }
    console.error("Error in getSupabaseSession:", error);
    return null;
  }
}

export async function getSupabaseUser() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      if (isRecoverableSessionError(error)) {
        await clearServerAuthState(supabase);
        return null;
      }
      if (isRateLimitedAuthError(error)) {
        return null;
      }
      console.error("Error getting user:", error);
      return null;
    }

    return user;
  } catch (error) {
    if (isNextDynamicServerError(error)) {
      throw error;
    }
    if (isRecoverableSessionError(error) || isRateLimitedAuthError(error)) {
      return null;
    }
    console.error("Error in getSupabaseUser:", error);
    return null;
  }
}
