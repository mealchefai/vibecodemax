import { createSupabaseServerClient } from "@/lib/supabase/server";

export type EntitlementStatus = "active" | "trialing" | "expired" | "revoked";
export type EntitlementSource = "subscription" | "one_time" | "manual";

export interface Entitlement {
  id: string;
  user_id: string;
  product_id: string;
  status: EntitlementStatus;
  source: EntitlementSource;
  granted_at: string;
  expires_at: string | null;
}

export async function getUserEntitlement(
  userId: string
): Promise<Entitlement | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("entitlements")
    .select("id, user_id, product_id, status, source, granted_at, expires_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("Failed to get user entitlement:", error);
    return null;
  }

  return data as Entitlement | null;
}
