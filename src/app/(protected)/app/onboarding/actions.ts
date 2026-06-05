"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { upsertHealthProfile } from "@/lib/db/health-profiles";
import type { ActivityLevel, Goal, Gender } from "@/lib/db/health-profiles";
import type { HealthProfileFormState } from "@/components/forms/health-profile-form";

const ALLOWED_DIETARY_PREFERENCES = [
  "Vegetarian",
  "Vegan",
  "Gluten-free",
  "Dairy-free",
  "Halal",
  "Kosher",
  "No pork",
  "No shellfish",
] as const;

const ALLOWED_ACTIVITY_LEVELS: ActivityLevel[] = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
];

const ALLOWED_GOALS: Goal[] = ["lose", "maintain", "gain"];
const ALLOWED_GENDERS: Gender[] = ["male", "female"];

function hasMaxOneDecimalPlace(value: number): boolean {
  return Number.isInteger(value * 10);
}

export async function saveHealthProfile(
  _prevState: HealthProfileFormState,
  formData: FormData
): Promise<HealthProfileFormState> {
  // 1. Verify authentication
  const user = await requireUser();

  const errors: HealthProfileFormState["errors"] = {};

  // 2. Parse and validate each field
  const ageRaw = formData.get("age");
  const age = ageRaw !== null && ageRaw !== "" ? Number(ageRaw) : NaN;
  if (isNaN(age) || !Number.isInteger(age) || age < 16 || age > 100) {
    errors.age = "Age must be a whole number between 16 and 100.";
  }

  const genderRaw = formData.get("gender") as string | null;
  if (!genderRaw || !ALLOWED_GENDERS.includes(genderRaw as Gender)) {
    errors.gender = "Please select a biological sex.";
  }

  const weightRaw = formData.get("weight_kg");
  const weight = weightRaw !== null && weightRaw !== "" ? Number(weightRaw) : NaN;
  if (
    isNaN(weight) ||
    weight < 30 ||
    weight > 300 ||
    !hasMaxOneDecimalPlace(weight)
  ) {
    errors.weight_kg =
      "Weight must be between 30 and 300 kg with at most one decimal place.";
  }

  const heightRaw = formData.get("height_cm");
  const height = heightRaw !== null && heightRaw !== "" ? Number(heightRaw) : NaN;
  if (
    isNaN(height) ||
    height < 100 ||
    height > 250 ||
    !hasMaxOneDecimalPlace(height)
  ) {
    errors.height_cm =
      "Height must be between 100 and 250 cm with at most one decimal place.";
  }

  const activityRaw = formData.get("activity_level") as string | null;
  if (
    !activityRaw ||
    !ALLOWED_ACTIVITY_LEVELS.includes(activityRaw as ActivityLevel)
  ) {
    errors.activity_level = "Please select your activity level.";
  }

  const goalRaw = formData.get("goal") as string | null;
  if (!goalRaw || !ALLOWED_GOALS.includes(goalRaw as Goal)) {
    errors.goal = "Please select your goal.";
  }

  const dietaryRaw = formData.getAll("dietary_preferences") as string[];
  const dietary =
    dietaryRaw.length > 0
      ? dietaryRaw.filter((p) =>
          ALLOWED_DIETARY_PREFERENCES.includes(
            p as (typeof ALLOWED_DIETARY_PREFERENCES)[number]
          )
        )
      : [];
  if (dietary.length > 8) {
    errors.dietary_preferences = "Please select at most 8 dietary preferences.";
  }

  // 3. Return field errors if any validation failed
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  // 4. Persist
  const result = await upsertHealthProfile(user.id, {
    age: age,
    gender: genderRaw as Gender,
    weight_kg: weight,
    height_cm: height,
    activity_level: activityRaw as ActivityLevel,
    goal: goalRaw as Goal,
    dietary_preferences: dietary.length > 0 ? dietary : null,
  });

  if (!result.success) {
    return {
      errors: { _root: "Something went wrong. Please try again." },
    };
  }

  // 5. Redirect on success
  redirect("/app");
}
