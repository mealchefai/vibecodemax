import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSupabaseUser } from "./supabase/server";
import { getProfile } from "@/lib/db/profiles";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import type { User } from "./types";

export type { User } from "./types";

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

function toUser(supabaseUser: SupabaseAuthUser): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || null,
    name: supabaseUser.user_metadata?.name || supabaseUser.email || null,
    avatar_url: supabaseUser.user_metadata?.avatar_url || null,
    created_at: supabaseUser.created_at,
    updated_at: supabaseUser.updated_at,
  };
}

async function toUserWithProfile(
  supabaseUser: SupabaseAuthUser
): Promise<User> {
  const user = toUser(supabaseUser);
  const profile = await getProfile(user.id);

  return {
    ...user,
    name: profile?.display_name || user.name,
    avatar_url: user.avatar_url,
  };
}

function isValidRedirectPath(pathname: string): boolean {
  return pathname.startsWith("/") && !pathname.startsWith("//");
}

function normalizeRedirectPath(pathname: string): string {
  return pathname.split("?")[0]?.split("#")[0] || pathname;
}

function isDisallowedRedirectPath(pathname: string): boolean {
  const normalized = normalizeRedirectPath(pathname);
  const isAllowedApiRedirect = normalized === "/api/payments/checkout";
  if (normalized === "/login" || normalized === "/register") {
    return true;
  }
  if (normalized === "/forgot-password" || normalized === "/reset-password") {
    return true;
  }
  if (normalized.startsWith("/api/") && !isAllowedApiRedirect) {
    return true;
  }
  return false;
}

function isSafeRedirectPath(pathname: string): boolean {
  return isValidRedirectPath(pathname) && !isDisallowedRedirectPath(pathname);
}

export async function requireUser(): Promise<User> {
  const supabaseUser = await getSupabaseUser();

  if (supabaseUser) {
    return await toUserWithProfile(supabaseUser);
  }

  const fallback = "/app";
  let nextPath: string = fallback;

  try {
    const headersList = await headers();
    const fullUrl =
      headersList.get("x-pathname") || headersList.get("referer") || "";
    const rawPath = fullUrl.includes("://")
      ? new URL(fullUrl).pathname
      : fullUrl || "";
    if (isSafeRedirectPath(rawPath)) {
      nextPath = rawPath;
    }
  } catch {
    nextPath = fallback;
  }

  redirect(`/login?next=${encodeURIComponent(nextPath)}`);
}

export async function getUser(): Promise<User | null> {
  try {
    const supabaseUser = await getSupabaseUser();
    if (!supabaseUser) return null;
    return await toUserWithProfile(supabaseUser);
  } catch (error) {
    if (isNextDynamicServerError(error)) {
      throw error;
    }
    console.warn("Error in getUser:", error);
    return null;
  }
}
