import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getHealthProfile } from "@/lib/db/health-profiles";
import { HealthProfileForm } from "@/components/forms/health-profile-form";
import { saveHealthProfile } from "@/app/(protected)/app/onboarding/actions";

export default async function OnboardingProfilePage() {
  const user = await requireUser();
  const existingProfile = await getHealthProfile(user.id);

  // If the user already has a health profile, redirect them to the app
  if (existingProfile) {
    redirect("/app");
  }

  return (
    <div className="container mx-auto px-container-mobile md:px-container max-w-page">
      <div className="mx-auto max-w-xl py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-extrabold tracking-tight text-text-primary">
            Tell us about yourself
          </h1>
          <p className="mt-3 text-base text-text-secondary">
            We use this to calculate your personal calorie target and build a
            meal plan that fits your body and goal.
          </p>
        </div>

        <HealthProfileForm saveAction={saveHealthProfile} />
      </div>
    </div>
  );
}
