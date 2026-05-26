import { supabaseAdmin } from "@/lib/supabase/admin";

export interface MealInsert {
  meal_plan_id: string;
  day: number;
  meal_type: "breakfast" | "lunch" | "dinner";
  name: string;
  description: string;
  ingredients: string[];
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export async function insertMeals(
  meals: MealInsert[]
): Promise<{ id: string }[]> {
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("meals")
    .insert(meals)
    .select("id");

  if (error || !data) {
    throw new Error(error?.message || "Failed to insert meals");
  }

  return data as { id: string }[];
}

export async function updateMealImageFileId(
  mealId: string,
  fileId: string
): Promise<void> {
  const admin = supabaseAdmin();

  const { error } = await admin
    .from("meals")
    .update({ image_file_id: fileId })
    .eq("id", mealId);

  if (error) {
    throw new Error(error.message || "Failed to update meal image_file_id");
  }
}
