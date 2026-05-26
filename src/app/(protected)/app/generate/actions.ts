"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getUserEntitlement } from "@/lib/db/entitlements";
import { getHealthProfile } from "@/lib/db/health-profiles";
import {
  createMealPlan,
  getGeneratingMealPlan,
  setMealPlanJobId,
} from "@/lib/db/meal-plans";
import { calculateNutrition } from "@/lib/nutrition/calculator";
import { triggerJob } from "@/lib/jobs/trigger";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export interface GenerateMealPlanFormState {
  errors?: {
    _root?: string;
    food_categories?: string;
  };
}

const ALLOWED_FOOD_CATEGORIES = [
  "Chicken",
  "Beef",
  "Fish & Seafood",
  "Eggs",
  "Vegetarian",
  "Dairy",
  "Pasta & Grains",
  "Salads",
] as const;

type AllowedFoodCategory = (typeof ALLOWED_FOOD_CATEGORIES)[number];

export async function generateMealPlan(
  _prevState: GenerateMealPlanFormState,
  formData: FormData
): Promise<GenerateMealPlanFormState> {
  // 1. Verify authentication
  const user = await requireUser();

  // 2. Rate limit: max 3 generation requests per user per 24 hours
  const rateLimit = await enforceRateLimit({
    key: "generate-meal-plan:" + user.id,
    limit: 3,
    windowSeconds: 86400,
  });

  if (!rateLimit.allowed) {
    return {
      errors: {
        _root:
          rateLimit.error ||
          "You have reached the generation limit for today. Please try again tomorrow.",
      },
    };
  }

  // 3. Verify active entitlement
  const entitlement = await getUserEntitlement(user.id);
  if (!entitlement) {
    return {
      errors: {
        _root: "An active subscription is required to generate a meal plan.",
      },
    };
  }

  // 4. Check for an in-flight generation job
  const generatingPlan = await getGeneratingMealPlan(user.id);
  if (generatingPlan) {
    return {
      errors: {
        _root:
          "A meal plan is already being generated. Please wait for it to finish.",
      },
    };
  }

  // 5. Load health profile
  const healthProfile = await getHealthProfile(user.id);
  if (!healthProfile) {
    return {
      errors: {
        _root:
          "Profile not found. Please complete your health profile.",
      },
    };
  }

  // 6. Parse and validate food categories (optional — empty array is valid)
  const foodCategoriesRaw = formData.getAll("food_categories") as string[];
  const foodCategories = foodCategoriesRaw.filter((c) =>
    (ALLOWED_FOOD_CATEGORIES as readonly string[]).includes(c)
  ) as AllowedFoodCategory[];

  // 7. Calculate BMR, TDEE, and daily calorie target
  const { bmr, tdee, daily_calories } = calculateNutrition(healthProfile);

  // 8. Create meal_plans row (status = 'generating', job_id = null initially)
  let mealPlanId: string;
  try {
    const plan = await createMealPlan(user.id, { bmr, tdee, daily_calories });
    mealPlanId = plan.id;
  } catch {
    return {
      errors: { _root: "Something went wrong. Please try again." },
    };
  }

  // 9. Dispatch Trigger.dev job
  let jobId: string;
  try {
    const result = await triggerJob({
      type: "generate-meal-plan",
      userId: user.id,
      input: {
        meal_plan_id: mealPlanId,
        user_id: user.id,
        daily_calories,
        goal: healthProfile.goal,
        dietary_preferences: healthProfile.dietary_preferences ?? [],
        food_categories: foodCategories,
      },
    });
    jobId = result.jobId;
  } catch {
    // meal_plans row is left with status='generating', job_id=null.
    // The duplicate guard will block retries. No cleanup needed for MVP.
    return {
      errors: { _root: "Something went wrong. Please try again." },
    };
  }

  // 10. Write job_id back onto the meal_plans row
  try {
    await setMealPlanJobId(mealPlanId, jobId);
  } catch {
    // Non-fatal: job is dispatched. Progress screen can still poll by jobId from URL.
    console.error("Failed to update meal_plans.job_id after dispatch");
  }

  // 11. Redirect to the progress screen
  redirect("/app/generate/progress?jobId=" + jobId);
}
