import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getUserEntitlement } from "@/lib/db/entitlements";
import { getHealthProfile } from "@/lib/db/health-profiles";
import { calculateNutrition } from "@/lib/nutrition/calculator";
import { GenerateMealPlanForm } from "@/components/forms/generate-meal-plan-form";
import { generateMealPlan } from "@/app/(protected)/app/generate/actions";

const GOAL_LABELS: Record<string, string> = {
  lose: "Lose weight",
  maintain: "Maintain weight",
  gain: "Gain muscle",
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: "Sedentary",
  light: "Lightly active",
  moderate: "Moderately active",
  active: "Active",
  very_active: "Very active",
};

export default async function GeneratePage() {
  const user = await requireUser();

  const entitlement = await getUserEntitlement(user.id);
  if (!entitlement) {
    redirect("/app");
  }

  const healthProfile = await getHealthProfile(user.id);
  if (!healthProfile) {
    redirect("/app/onboarding/profile");
  }

  const { daily_calories } = calculateNutrition(healthProfile);

  const summaryFields = [
    { label: "Age", value: `${healthProfile.age} years` },
    { label: "Weight", value: `${healthProfile.weight_kg} kg` },
    { label: "Height", value: `${healthProfile.height_cm} cm` },
    {
      label: "Goal",
      value: GOAL_LABELS[healthProfile.goal] ?? healthProfile.goal,
    },
    {
      label: "Activity level",
      value:
        ACTIVITY_LABELS[healthProfile.activity_level] ??
        healthProfile.activity_level,
    },
    {
      label: "Daily calorie target",
      value: `${daily_calories.toLocaleString()} kcal`,
    },
  ];

  return (
    <div className="container mx-auto px-container-mobile md:px-container max-w-page">
      <div className="mx-auto max-w-xl py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-extrabold tracking-tight text-text-primary">
            Generate your meal plan
          </h1>
          <p className="mt-3 text-base text-text-secondary">
            Review your details and select your food preferences, then generate
            your personalised 7-day plan.
          </p>
        </div>

        {/* Biometric Summary */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Your profile
            </h2>
            <Link
              href="/app/settings/health-profile"
              className="text-xs text-primary hover:underline underline-offset-4"
            >
              Edit profile
            </Link>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4">
            <dl className="grid grid-cols-2 gap-4">
              {summaryFields.map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs text-text-secondary">{label}</dt>
                  <dd className="mt-0.5 text-sm font-medium text-foreground">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Generation Form */}
        <GenerateMealPlanForm
          generateAction={generateMealPlan}
          dailyCalories={daily_calories}
        />
      </div>
    </div>
  );
}
