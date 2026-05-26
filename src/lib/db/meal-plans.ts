import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type MealPlanStatus = "generating" | "ready" | "failed";

export interface MealPlan {
  id: string;
  user_id: string;
  job_id: string | null;
  bmr: number;
  tdee: number;
  daily_calories: number;
  status: MealPlanStatus;
  created_at: string;
  updated_at: string;
}

export async function getMostRecentMealPlan(
  userId: string
): Promise<MealPlan | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("meal_plans")
    .select("id, user_id, job_id, bmr, tdee, daily_calories, status, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to get most recent meal plan:", error);
    return null;
  }

  return data as MealPlan | null;
}

export async function getGeneratingMealPlan(
  userId: string
): Promise<MealPlan | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("meal_plans")
    .select("id, user_id, job_id, bmr, tdee, daily_calories, status, created_at, updated_at")
    .eq("user_id", userId)
    .eq("status", "generating")
    .maybeSingle();

  if (error) {
    console.error("Failed to get generating meal plan:", error);
    return null;
  }

  return data as MealPlan | null;
}

export async function createMealPlan(
  userId: string,
  data: { bmr: number; tdee: number; daily_calories: number }
): Promise<{ id: string }> {
  const admin = supabaseAdmin();

  const { data: row, error } = await admin
    .from("meal_plans")
    .insert({
      user_id: userId,
      bmr: data.bmr,
      tdee: data.tdee,
      daily_calories: data.daily_calories,
      status: "generating",
      job_id: null,
    })
    .select("id")
    .single();

  if (error || !row) {
    throw new Error(error?.message || "Failed to create meal plan");
  }

  return { id: row.id };
}

export async function setMealPlanJobId(
  mealPlanId: string,
  jobId: string
): Promise<void> {
  const admin = supabaseAdmin();

  const { error } = await admin
    .from("meal_plans")
    .update({ job_id: jobId })
    .eq("id", mealPlanId);

  if (error) {
    throw new Error(error.message || "Failed to update meal plan job_id");
  }
}
