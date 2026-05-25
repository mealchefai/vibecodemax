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
  const next = sanitizeRedirect(requestUrl.searchParams.get("next"), "/login");
  const failureReasonPath = (message: string) =>
    new URL(
      "/confirm-email?reason=" + encodeURIComponent(message),
      request.url
    );

  try {
    const supabase = await createSupabaseServerClient();
    const tokenHash = requestUrl.searchParams.get("token_hash");
    const type = requestUrl.searchParams.get("type");

    if (!tokenHash || !type) {
      return NextResponse.redirect(
        failureReasonPath("Missing confirmation parameters")
      );
    }

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "recovery" | "invite" | "email_change" | "signup",
    });
    if (error) {
      throw error;
    }
  } catch (error) {
    console.warn("Auth confirmation exchange failed:", error);
    const message =
      error instanceof Error ? error.message : "Unable to confirm your email.";
    return NextResponse.redirect(failureReasonPath(message));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
