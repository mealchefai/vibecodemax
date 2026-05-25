import { redirect } from "next/navigation";
import { getUser, requireUser } from "./require-user";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AdminUser } from "./types";

export type { AdminUser } from "./types";

type AdminRole = "super" | "moderator";

function normalizeAdminRole(role: string | null | undefined): AdminRole {
  if (role === "super") {
    return "super";
  }
  return "moderator";
}

function permissionsForRole(role: AdminRole): string[] {
  if (role === "super") {
    return ["read", "write", "delete"];
  }
  return ["read", "write"];
}

export async function requireAdmin(): Promise<AdminUser> {
  const user = await requireUser();
  const adminRole = await getAdminRole(user.id);
  if (!adminRole) {
    redirect("/not-authorized");
  }

  return {
    ...user,
    isAdmin: true,
    adminRole,
    permissions: permissionsForRole(adminRole),
  };
}

async function getAdminRole(userId: string): Promise<AdminRole | null> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check admin access: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const adminData = data as { role?: string | null };
  return normalizeAdminRole(adminData.role);
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const user = await getUser();
  if (!user) {
    return null;
  }

  const adminRole = await getAdminRole(user.id);
  if (!adminRole) {
    return null;
  }

  return {
    ...user,
    isAdmin: true,
    adminRole,
    permissions: permissionsForRole(adminRole),
  };
}

export async function getAdminStatus(userId: string): Promise<boolean> {
  const role = await getAdminRole(userId);
  return !!role;
}
