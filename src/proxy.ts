import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

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

function isSupabaseAuthCookieName(name: string): boolean {
  return (
    name.startsWith("sb-") ||
    name.includes("supabase-auth-token") ||
    name.includes("-auth-token")
  );
}

function clearSupabaseAuthCookies(
  request: NextRequest,
  response: NextResponse
): void {
  const cookieNames = new Set<string>();
  for (const cookie of request.cookies.getAll()) {
    if (isSupabaseAuthCookieName(cookie.name)) {
      cookieNames.add(cookie.name);
    }
  }

  for (const name of cookieNames) {
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
    request.cookies.set(name, "");
  }
}

export async function proxy(request: NextRequest) {
  let env;
  try {
    env = getSupabaseEnv();
  } catch {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  try {
    const { error } = await supabase.auth.getUser();
    if (error && isRecoverableSessionError(error)) {
      clearSupabaseAuthCookies(request, response);
    }
  } catch (error) {
    if (isRecoverableSessionError(error)) {
      clearSupabaseAuthCookies(request, response);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
