import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { buildPublicAppUrl } from "@/lib/auth/redirect-url";
import { getClientIp } from "@/lib/security/client-ip";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { enforceRateLimit } from "@/lib/security/rate-limit";

function normalizeRedirectPath(path: string): string {
  return path.split("?")[0]?.split("#")[0] || path;
}

function isSafeRedirect(path: string): boolean {
  const normalized = normalizeRedirectPath(path);
  const isAllowedApiRedirect = normalized === "/api/payments/checkout";

  return (
    path.startsWith("/") &&
    !path.startsWith("//") &&
    normalized !== "/login" &&
    normalized !== "/register" &&
    normalized !== "/forgot-password" &&
    normalized !== "/reset-password" &&
    (!normalized.startsWith("/api/") || isAllowedApiRedirect)
  );
}

function buildCallbackRedirect(next: unknown) {
  const safeNext =
    typeof next === "string" && isSafeRedirect(next) ? next : "/app";
  const params = new URLSearchParams({ next: safeNext });
  return buildPublicAppUrl(`/auth/callback?${params.toString()}`);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email;
    const next = body.next;
    const captchaToken = body.captchaToken;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Authentication service not configured" },
        { status: 500 }
      );
    }

    const clientIp = getClientIp(request.headers);

    const rateLimit = await enforceRateLimit({
      key: "auth:magic-link:" + clientIp,
      limit: 5,
      windowSeconds: 60,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error:
            rateLimit.error || "Too many requests. Please try again shortly.",
        },
        { status: rateLimit.error ? 503 : 429 }
      );
    }

    if (!captchaToken) {
      return NextResponse.json(
        { error: "Please complete the verification challenge" },
        { status: 400 }
      );
    }

    const captchaOk = await verifyTurnstile(captchaToken, clientIp);
    if (!captchaOk) {
      return NextResponse.json(
        { error: "Verification failed. Please try again." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: buildCallbackRedirect(next),
      },
    });

    if (error) {
      return NextResponse.json(
        { error: "Unable to send magic link." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "If an account exists for that email, a magic link has been sent.",
    });
  } catch (error) {
    console.error("Magic link API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
