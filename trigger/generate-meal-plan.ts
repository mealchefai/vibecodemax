import { task } from "@trigger.dev/sdk";
import {
  failJob,
  triggerJob,
  updateJobProgress,
} from "@/lib/jobs/trigger";
import { updateMealPlanStatus } from "@/lib/db/meal-plans";
import { insertMeals } from "@/lib/db/meals";
import { generateMealPlanText } from "@/lib/ai/openai";

type GenerateMealPlanPayload = {
  jobId: string;
  meal_plan_id: string;
  user_id: string;
  daily_calories: number;
  goal: string;
  dietary_preferences: string[];
  food_categories: string[];
};

export default task({
  id: "generate-meal-plan",
  maxDuration: 300,
  run: async (payload: GenerateMealPlanPayload) => {
    const {
      jobId,
      meal_plan_id,
      user_id,
      daily_calories,
      goal,
      dietary_preferences,
      food_categories,
    } = payload;

    try {
      // Step 1 — Signal start
      await updateJobProgress(jobId, 5);

      // Step 2 — Generate meal plan text via GPT
      let meals;
      try {
        meals = await generateMealPlanText({
          daily_calories,
          goal,
          dietary_preferences,
          food_categories,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "OpenAI generation failed";
        await failJob(jobId, message);
        await updateMealPlanStatus(meal_plan_id, "failed");
        throw error;
      }

      // Step 3 — Parsed successfully
      await updateJobProgress(jobId, 30);

      // Step 4 — Insert meals into DB
      let insertedMeals: { id: string }[];
      try {
        insertedMeals = await insertMeals(
          meals.map((m) => ({ ...m, meal_plan_id }))
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to insert meals";
        await failJob(jobId, message);
        await updateMealPlanStatus(meal_plan_id, "failed");
        throw error;
      }

      // Step 5 — Meals persisted
      await updateJobProgress(jobId, 40);

      // Step 6 — Dispatch image generation job, passing the original jobId
      // so the image job can continue updating progress (50→100) and fire
      // completeJob on the same job the progress screen is watching.
      // This job must NOT call completeJob itself — doing so would mark the
      // job completed before images are ready and cause a redirect loop between
      // the progress screen and the plan page.
      const mealIds = insertedMeals.map((m) => m.id);
      try {
        await triggerJob({
          type: "generate-meal-images",
          userId: user_id,
          input: {
            originalJobId: jobId,
            meal_plan_id,
            user_id,
            meal_ids: mealIds,
          },
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to dispatch image generation job";
        await failJob(jobId, message);
        await updateMealPlanStatus(meal_plan_id, "failed");
        throw error;
      }

      // Step 7 — Image job dispatched; update progress to 50% but do NOT
      // complete this job — the image job owns the 50→100 range and calls
      // completeJob when all images are done.
      await updateJobProgress(jobId, 50);
    } catch (error) {
      // Outer catch for any unhandled errors not caught by inner blocks
      // Inner blocks re-throw so we only reach here from unexpected paths
      const message =
        error instanceof Error ? error.message : "Unexpected job failure";
      try {
        await failJob(jobId, message);
        await updateMealPlanStatus(meal_plan_id, "failed");
      } catch {
        // Best-effort cleanup — do not mask the original error
      }
      throw error;
    }
  },
});
