export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { getMealPlanWithMeals } from "@/lib/db/meal-plans";
import { getFileUrl } from "@/lib/storage/file-urls";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { MealPlanTabs } from "@/components/app/meal-plan-tabs";
import type { MealWithImageUrl, DayTab } from "@/components/app/meal-plan-tabs";

type PlanParams = Promise<{ id: string }>;

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MEAL_TYPE_ORDER: Record<string, number> = {
  breakfast: 0,
  lunch: 1,
  dinner: 2,
};

export default async function MealPlanPage({
  params,
}: {
  params: PlanParams;
}) {
  const user = await requireUser();
  const { id } = await params;

  const plan = await getMealPlanWithMeals(id);

  // Guard: plan not found or belongs to a different user
  if (!plan || plan.user_id !== user.id) {
    redirect("/app");
  }

  // Guard: still generating — bounce back to the progress screen
  if (plan.status === "generating") {
    if (plan.job_id) {
      redirect(`/app/generate/progress?jobId=${plan.job_id}`);
    }
    redirect("/app");
  }

  // Error state: generation failed
  if (plan.status === "failed") {
    return (
      <div className="container mx-auto px-container-mobile md:px-container max-w-page">
        <div className="mx-auto max-w-md py-24">
          <h1 className="text-2xl font-heading font-extrabold text-text-primary">
            Something went wrong
          </h1>
          <p className="text-sm text-text-secondary mt-2">
            Your meal plan could not be generated. Please try again.
          </p>
          <Button asChild className="mt-6 w-full sm:w-auto">
            <Link href="/app/generate">Try again</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Resolve signed URLs for all meals that have an image_file_id.
  // Fetch all file rows in a single IN query to avoid N+1.
  const fileIds = plan.meals
    .map((m) => m.image_file_id)
    .filter((id): id is string => id !== null);

  const fileUrlMap = new Map<string, string | null>();

  if (fileIds.length > 0) {
    const supabase = await createSupabaseServerClient();
    const { data: fileRows } = await supabase
      .from("files")
      .select("id, bucket, key, visibility")
      .in("id", fileIds);

    if (fileRows) {
      await Promise.all(
        fileRows.map(async (file) => {
          const url = await getFileUrl({
            bucket: file.bucket,
            key: file.key,
            visibility: file.visibility as "public" | "private",
          });
          fileUrlMap.set(file.id, url);
        })
      );
    }
  }

  // Build meals with resolved image URLs
  const mealsWithUrls: MealWithImageUrl[] = plan.meals.map((meal) => ({
    ...meal,
    imageUrl: meal.image_file_id
      ? (fileUrlMap.get(meal.image_file_id) ?? null)
      : null,
  }));

  // Group by day (1–7) and sort within each day by meal type order
  const dayMap = new Map<number, MealWithImageUrl[]>();
  for (let d = 1; d <= 7; d++) {
    dayMap.set(d, []);
  }
  for (const meal of mealsWithUrls) {
    dayMap.get(meal.day)?.push(meal);
  }
  for (const meals of dayMap.values()) {
    meals.sort(
      (a, b) =>
        (MEAL_TYPE_ORDER[a.meal_type] ?? 0) -
        (MEAL_TYPE_ORDER[b.meal_type] ?? 0)
    );
  }

  const days: DayTab[] = Array.from(dayMap.entries()).map(
    ([dayNumber, meals]) => ({
      dayNumber,
      label: DAY_LABELS[dayNumber - 1] ?? `Day ${dayNumber}`,
      meals,
    })
  );

  return (
    <div className="container mx-auto px-container-mobile md:px-container max-w-page">
      <div className="py-12">
        <h1 className="text-2xl font-heading font-extrabold text-text-primary">
          Your Meal Plan
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Targeting {plan.daily_calories} kcal per day
        </p>

        <MealPlanTabs days={days} className="mt-6" />

        <p className="text-xs text-text-secondary mt-8">
          * Calorie and macro values are AI estimates. They are intended as a
          guide only and may vary based on portion sizes and preparation methods.
        </p>
      </div>
    </div>
  );
}
