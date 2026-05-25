import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function sanitizeRedirect(
  raw: string | null | undefined,
  fallback: string
): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return fallback;
  }
  const normalized = raw.split("?")[0]?.split("#")[0] || raw;
  const isAllowedApiRedirect = normalized === "/api/payments/checkout";
  if (normalized.startsWith("/api/") && !isAllowedApiRedirect) {
    return fallback;
  }
  return raw;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const next = sanitizeRedirect(requestUrl.searchParams.get("next"), "/app");

  try {
    const supabase = await createSupabaseServerClient();
    const code = requestUrl.searchParams.get("code");
    const tokenHash = requestUrl.searchParams.get("token_hash");
    const type = requestUrl.searchParams.get("type");

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        throw error;
      }
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as
          | "magiclink"
          | "email_change"
          | "signup"
          | "recovery"
          | "invite",
      });
      if (error) {
        throw error;
      }
    }
  } catch (error) {
    console.warn("Auth callback exchange failed:", error);
    return NextResponse.redirect(
      new URL("/login?error=auth_callback_failed", request.url)
    );
  }

  return NextResponse.redirect(new URL(next, request.url));
}
