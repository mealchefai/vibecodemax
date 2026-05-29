import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { getHealthProfile } from "@/lib/db/health-profiles";
import { getUserEntitlement } from "@/lib/db/entitlements";
import { getMostRecentMealPlan, getMealPlanWithMeals } from "@/lib/db/meal-plans";
import { getJob } from "@/lib/db/jobs";
import { getFileUrl } from "@/lib/storage/file-urls";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UpgradeGate } from "@/components/app/upgrade-gate";
import { NoMealPlanCard } from "@/components/app/no-meal-plan-card";
import { GeneratingCard } from "@/components/app/generating-card";
import { TodaysMealsGrid } from "@/components/app/todays-meals-grid";
import { Button } from "@/components/ui/button";
import type { MealWithImageUrl } from "@/components/app/meal-plan-tabs";

export default async function AppPage() {
  const user = await requireUser();

  // Redirect users who have not yet completed their health profile
  const healthProfile = await getHealthProfile(user.id);
  if (!healthProfile) {
    redirect("/app/onboarding/profile");
  }

  const entitlement = await getUserEntitlement(user.id);
  const displayName = user.name || user.email || "there";

  // Only query meal plan state for subscribed users
  let dashboardCard = <UpgradeGate />;
  let mealPlan: Awaited<ReturnType<typeof getMostRecentMealPlan>> = null;

  if (entitlement) {
    mealPlan = await getMostRecentMealPlan(user.id);

    if (!mealPlan || mealPlan.status === "failed") {
      dashboardCard = <NoMealPlanCard />;
    } else if (mealPlan.status === "generating") {
      const job = mealPlan.job_id ? await getJob(mealPlan.job_id) : null;
      dashboardCard = (
        <GeneratingCard
          progress={job?.progress ?? 0}
          jobId={mealPlan.job_id}
        />
      );
    } else if (mealPlan.status === "ready") {
      // Determine today's day number: Mon=1 … Sun=7
      const jsDay = new Date().getDay(); // 0=Sun, 1=Mon, …, 6=Sat
      const todayDayNumber = jsDay === 0 ? 7 : jsDay;

      const fullPlan = await getMealPlanWithMeals(mealPlan.id);
      const todaysMeals = (fullPlan?.meals ?? [])
        .filter((m) => m.day === todayDayNumber)
        .sort((a, b) => {
          const order = { breakfast: 0, lunch: 1, dinner: 2 };
          return (order[a.meal_type] ?? 0) - (order[b.meal_type] ?? 0);
        });

      // Resolve signed URLs in a single IN query
      const fileIds = todaysMeals
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

      const todaysMealsWithUrls: MealWithImageUrl[] = todaysMeals.map(
        (meal) => ({
          ...meal,
          imageUrl: meal.image_file_id
            ? (fileUrlMap.get(meal.image_file_id) ?? null)
            : null,
        })
      );

      dashboardCard = <TodaysMealsGrid meals={todaysMealsWithUrls} />;
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          {/* Title + subtitle */}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold tracking-tight text-text-primary">
                Welcome back, {displayName}
              </h1>
              {entitlement && (
                <span className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                  Pro
                </span>
              )}
            </div>
            {entitlement && mealPlan?.status === "ready" && (
              <p className="text-text-secondary mt-2 text-lg">
                Today&apos;s Meals
              </p>
            )}
          </div>

          {/* Action buttons — only when a ready plan exists */}
          {mealPlan?.status === "ready" && mealPlan && (
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/app/plan/${mealPlan.id}`}>View full plan</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/app/generate">Generate new plan</Link>
              </Button>
            </div>
          )}
        </div>

        <div className="mt-8">{dashboardCard}</div>
      </div>
    </div>
  );
}
