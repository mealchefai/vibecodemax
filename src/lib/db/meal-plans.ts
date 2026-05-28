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

export async function getMealPlanByJobId(
  jobId: string
): Promise<{ id: string } | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("meal_plans")
    .select("id")
    .eq("job_id", jobId)
    .maybeSingle();

  if (error) {
    console.error("Failed to get meal plan by job id:", error);
    return null;
  }

  return data as { id: string } | null;
}

export interface MealRow {
  id: string;
  day: number;
  meal_type: "breakfast" | "lunch" | "dinner";
  name: string;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  image_file_id: string | null;
}

export interface MealPlanWithMeals extends MealPlan {
  meals: MealRow[];
}

// Raw shape returned by the nested Supabase select — typed manually because
// the auto-generated database.types.ts does not include FK relationships.
interface RawMealPlanWithMeals {
  id: string;
  user_id: string;
  job_id: string | null;
  bmr: number;
  tdee: number;
  daily_calories: number;
  status: string;
  created_at: string;
  updated_at: string;
  meals: Array<{
    id: string;
    day: number;
    meal_type: string;
    name: string;
    description: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    image_file_id: string | null;
  }>;
}

export async function getMealPlanWithMeals(
  planId: string
): Promise<MealPlanWithMeals | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("meal_plans")
    .select(
      `id, user_id, job_id, bmr, tdee, daily_calories, status, created_at, updated_at,
       meals (
         id, day, meal_type, name, description,
         calories, protein_g, carbs_g, fat_g, image_file_id
       )`
    )
    .eq("id", planId)
    .order("day", { referencedTable: "meals", ascending: true })
    .maybeSingle();

  if (error) {
    console.error("Failed to get meal plan with meals:", error);
    return null;
  }

  if (!data) return null;

  const row = data as unknown as RawMealPlanWithMeals;

  return {
    id: row.id,
    user_id: row.user_id,
    job_id: row.job_id ?? null,
    bmr: row.bmr,
    tdee: row.tdee,
    daily_calories: row.daily_calories,
    status: row.status as MealPlanStatus,
    created_at: row.created_at,
    updated_at: row.updated_at,
    meals: (row.meals ?? []) as MealRow[],
  };
}

export async function updateMealPlanStatus(
  mealPlanId: string,
  status: "ready" | "failed"
): Promise<void> {
  const admin = supabaseAdmin();

  const { error } = await admin
    .from("meal_plans")
    .update({ status })
    .eq("id", mealPlanId);

  if (error) {
    throw new Error(error.message || "Failed to update meal plan status");
  }
}
