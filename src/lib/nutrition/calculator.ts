import type { HealthProfile } from "@/lib/db/health-profiles";

export interface NutritionResult {
  bmr: number;
  tdee: number;
  daily_calories: number;
}

const ACTIVITY_MULTIPLIERS: Record<HealthProfile["activity_level"], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/**
 * Calculates BMR using the Mifflin-St Jeor equation, TDEE via activity
 * multiplier, and daily calorie target via goal adjustment.
 *
 * All returned values are rounded: bmr and tdee to 2 decimal places,
 * daily_calories to the nearest whole number (minimum 1200 for lose goal).
 */
export function calculateNutrition(profile: HealthProfile): NutritionResult {
  const { age, gender, weight_kg, height_cm, activity_level, goal } = profile;

  // Mifflin-St Jeor BMR
  const bmrBase = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  const bmrRaw = gender === "male" ? bmrBase + 5 : bmrBase - 161;
  const bmr = Math.round(bmrRaw * 100) / 100;

  // TDEE
  const multiplier = ACTIVITY_MULTIPLIERS[activity_level];
  const tdee = Math.round(bmr * multiplier * 100) / 100;

  // Daily calorie target
  let targetCalories: number;
  if (goal === "lose") {
    targetCalories = Math.max(tdee - 500, 1200);
  } else if (goal === "gain") {
    targetCalories = tdee + 300;
  } else {
    targetCalories = tdee;
  }

  const daily_calories = Math.round(targetCalories);

  return { bmr, tdee, daily_calories };
}
