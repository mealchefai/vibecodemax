import { task } from "@trigger.dev/sdk";
import {
  completeJob,
  failJob,
  updateJobProgress,
} from "@/lib/jobs/trigger";
import { updateMealPlanStatus } from "@/lib/db/meal-plans";
import { updateMealImageFileId } from "@/lib/db/meals";
import { generateMealImage } from "@/lib/ai/replicate";
import { supabaseAdmin } from "@/lib/supabase/admin";

type GenerateMealImagesPayload = {
  jobId: string;
  meal_plan_id: string;
  user_id: string;
  meal_ids: string[];
};

export default task({
  id: "generate-meal-images",
  maxDuration: 300,
  run: async (payload: GenerateMealImagesPayload) => {
    const { jobId, meal_plan_id, user_id, meal_ids } = payload;

    try {
      // Step 1 — Fetch all meal rows in one query
      const admin = supabaseAdmin();
      const { data: mealRows, error: fetchError } = await admin
        .from("meals")
        .select("id, name, description")
        .in("id", meal_ids);

      if (fetchError || !mealRows) {
        const message = fetchError?.message || "Failed to fetch meal rows";
        await failJob(jobId, message);
        await updateMealPlanStatus(meal_plan_id, "failed");
        throw new Error(message);
      }

      // Step 2 — Generate and upload an image for each meal
      for (let i = 0; i < mealRows.length; i++) {
        const meal = mealRows[i];

        try {
          // 2a — Generate image buffer
          const buffer = await generateMealImage(meal.name, meal.description);

          // 2b — Define storage path
          const storagePath = `meal-plans/${user_id}/${meal_plan_id}/${meal.id}.webp`;

          // 2c — Upload to Supabase Storage
          const { error: uploadError } = await admin.storage
            .from("private-uploads")
            .upload(storagePath, buffer, {
              contentType: "image/webp",
              upsert: true,
            });

          if (uploadError) {
            throw new Error(uploadError.message || "Storage upload failed");
          }

          // 2d — Insert files row
          const { data: fileRow, error: fileInsertError } = await admin
            .from("files")
            .insert({
              owner_user_id: user_id,
              bucket: "private-uploads",
              key: storagePath,
              mime_type: "image/webp",
              size_bytes: buffer.length,
              visibility: "private" as const,
              status: "ready" as const,
              metadata: { meal_id: meal.id },
            })
            .select("id")
            .single();

          if (fileInsertError || !fileRow) {
            throw new Error(
              fileInsertError?.message || "Failed to insert files row"
            );
          }

          // 2e — Link file back to meal
          await updateMealImageFileId(meal.id, fileRow.id);
        } catch (error) {
          // 2f — Single-meal failure is non-fatal; log and continue
          console.error(
            `Failed to generate/upload image for meal ${meal.id} (${meal.name}):`,
            error instanceof Error ? error.message : error
          );
        }

        // 2g — Update progress: 50–95% spread across all meals
        await updateJobProgress(
          jobId,
          Math.round(50 + ((i + 1) / mealRows.length) * 45)
        );
      }

      // Step 3 — Mark the meal plan as ready
      await updateMealPlanStatus(meal_plan_id, "ready");

      // Step 4-5 — Complete the job
      await updateJobProgress(jobId, 100);
      await completeJob(jobId, { meal_plan_id, images_processed: mealRows.length });
    } catch (error) {
      // Unhandled error — mark plan failed and propagate
      const message =
        error instanceof Error ? error.message : "Unexpected job failure";
      try {
        await failJob(jobId, message);
        await updateMealPlanStatus(meal_plan_id, "failed");
      } catch {
        // Best-effort cleanup
      }
      throw error;
    }
  },
});
