import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { triggerJob } from "@/lib/jobs/trigger";
import { getClientIp } from "@/lib/security/client-ip";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, captchaToken } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Authentication service not configured" },
        { status: 500 }
      );
    }

    const clientIp = getClientIp(request.headers);
    const rateLimit = await enforceRateLimit({
      key: "auth:register:" + clientIp,
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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      return NextResponse.json(
        {
          error:
            "Registration could not be completed. Check your details and try again.",
        },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: "Registration failed" },
        { status: 400 }
      );
    }

    try {
      await triggerJob({
        type: "email/welcome",
        userId: null,
        input: {
          name,
          email,
          userId: data.user.id,
          provider: "auth",
          providerEventId: data.user.id,
          dedupeKey: `auth:welcome:${data.user.id}:email/welcome`,
        },
      });
    } catch (jobError) {
      console.error("Failed to queue welcome email job:", jobError);
    }

    const needsConfirmation = !data.session;

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name,
      },
      needsConfirmation,
    });
  } catch (error) {
    console.error("Register API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
