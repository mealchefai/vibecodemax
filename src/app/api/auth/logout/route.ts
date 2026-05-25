import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type AuthErrorLike = {
  message?: string;
  code?: string;
};

function toAuthErrorLike(value: unknown): AuthErrorLike {
  if (!value || typeof value !== "object") {
    return {};
  }
  const maybe = value as Record<string, unknown>;
  return {
    message: typeof maybe.message === "string" ? maybe.message : undefined,
    code: typeof maybe.code === "string" ? maybe.code : undefined,
  };
}

function isMissingSessionError(error: unknown): boolean {
  const { message, code } = toAuthErrorLike(error);
  const normalizedMessage = (message || "").toLowerCase();
  const normalizedCode = (code || "").toLowerCase();

  return (
    normalizedCode === "session_not_found" ||
    normalizedCode === "refresh_token_not_found" ||
    normalizedCode === "invalid_refresh_token" ||
    normalizedMessage.includes("auth session missing") ||
    normalizedMessage.includes("session not found") ||
    normalizedMessage.includes("refresh token not found")
  );
}

export async function POST() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Authentication service not configured" },
        { status: 500 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      if (isMissingSessionError(error)) {
        return NextResponse.json({ success: true });
      }
      console.error("Supabase logout error:", error);
      return NextResponse.json({ error: "Logout failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
