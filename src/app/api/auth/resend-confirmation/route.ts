import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getClientIp } from "@/lib/security/client-ip";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const { email, captchaToken } = await request.json();

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
      key: "auth:resend-confirmation:" + clientIp,
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
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Unable to resend confirmation email." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Confirmation email sent. Check your inbox.",
    });
  } catch (error) {
    console.error("Resend confirmation API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
