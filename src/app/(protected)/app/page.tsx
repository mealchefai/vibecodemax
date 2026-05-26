import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getHealthProfile } from "@/lib/db/health-profiles";
import { getUserEntitlement } from "@/lib/db/entitlements";
import { getMostRecentMealPlan } from "@/lib/db/meal-plans";
import { getJob } from "@/lib/db/jobs";
import { UpgradeGate } from "@/components/app/upgrade-gate";
import { NoMealPlanCard } from "@/components/app/no-meal-plan-card";
import { GeneratingCard } from "@/components/app/generating-card";
import { MealPlanSummaryCard } from "@/components/app/meal-plan-summary-card";

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

  if (entitlement) {
    const mealPlan = await getMostRecentMealPlan(user.id);

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
      dashboardCard = (
        <MealPlanSummaryCard
          mealPlanId={mealPlan.id}
          dailyCalories={mealPlan.daily_calories}
          goal={healthProfile.goal}
          createdAt={mealPlan.created_at}
        />
      );
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight text-text-primary">
              Welcome back
            </h1>
            {entitlement && (
              <span className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                Pro
              </span>
            )}
          </div>
          <p className="text-text-secondary mt-3 text-lg">
            Signed in as{" "}
            <span className="font-semibold text-foreground">{displayName}</span>
            .
          </p>
        </div>

        <div className="mt-8">{dashboardCard}</div>
      </div>
    </div>
  );
}
