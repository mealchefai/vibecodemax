import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export type Goal = "lose" | "maintain" | "gain";

export type Gender = "male" | "female";

export interface HealthProfile {
  user_id: string;
  age: number;
  gender: Gender;
  weight_kg: number;
  height_cm: number;
  activity_level: ActivityLevel;
  goal: Goal;
  dietary_preferences: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface HealthProfileInput {
  age: number;
  gender: Gender;
  weight_kg: number;
  height_cm: number;
  activity_level: ActivityLevel;
  goal: Goal;
  dietary_preferences: string[] | null;
}

export async function getHealthProfile(
  userId: string
): Promise<HealthProfile | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("user_health_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    if (error?.code !== "PGRST116") {
      // PGRST116 = no rows found — not an error condition here
      console.error("Failed to get health profile:", error);
    }
    return null;
  }

  return data as HealthProfile;
}

export async function upsertHealthProfile(
  userId: string,
  data: HealthProfileInput
): Promise<{ success: boolean; error?: string }> {
  // Use admin client to bypass RLS for the INSERT leg of the upsert.
  // The server action calling this function already verifies the authenticated
  // user's identity via requireUser() before reaching this point.
  const admin = supabaseAdmin();

  const { error } = await admin.from("user_health_profiles").upsert(
    {
      user_id: userId,
      ...data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("Failed to upsert health profile:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
