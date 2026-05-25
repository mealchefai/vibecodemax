import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildPublicAppUrl,
  getPublicAppBaseUrl,
} from "@/lib/auth/redirect-url";

function isAllowedRedirectTo(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const redirectUrl = new URL(value);
    const allowedOrigin = new URL(getPublicAppBaseUrl()).origin;
    return redirectUrl.origin === allowedOrigin;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const requestedRedirectTo =
    typeof body?.redirectTo === "string" ? body.redirectTo : "";
  const redirectTo = isAllowedRedirectTo(requestedRedirectTo)
    ? requestedRedirectTo
    : buildPublicAppUrl("/auth/callback");

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to start Google sign-in." },
        { status: 400 }
      );
    }

    if (!data?.url) {
      return NextResponse.json(
        { error: "Google sign-in URL was not returned." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: data.url });
  } catch (error) {
    console.error("Google OAuth start failed:", error);
    return NextResponse.json(
      { error: "Unable to start Google sign-in." },
      { status: 500 }
    );
  }
}
