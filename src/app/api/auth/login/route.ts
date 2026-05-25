import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getClientIp } from "@/lib/security/client-ip";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const { email, password, captchaToken } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
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
      key: "auth:login:" + clientIp,
      limit: 10,
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!data.user || !data.session) {
      return NextResponse.json({ error: "Login failed" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || data.user.email,
      },
    });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
