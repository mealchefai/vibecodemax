import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { getHealthProfile } from "@/lib/db/health-profiles";
import { HealthProfileForm } from "@/components/forms/health-profile-form";
import { Button } from "@/components/ui/button";
import { updateHealthProfile } from "@/app/(protected)/app/settings/actions";

export default async function HealthProfileEditPage() {
  const user = await requireUser();
  const profile = await getHealthProfile(user.id);

  // Guard: no profile exists yet — send to initial setup
  if (!profile) {
    redirect("/app/onboarding/profile");
  }

  const successContent = (
    <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 space-y-3">
      <p className="text-sm text-success font-medium">
        Your health profile has been updated.
      </p>
      <Button asChild size="sm">
        <Link href="/app/generate">Generate a new meal plan</Link>
      </Button>
    </div>
  );

  return (
    <div className="container mx-auto px-container-mobile md:px-container max-w-page">
      <div className="mx-auto max-w-xl py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-extrabold tracking-tight text-text-primary">
            Health Profile
          </h1>
          <p className="mt-3 text-base text-text-secondary">
            Update your details to keep your calorie targets accurate.
          </p>
        </div>

        <HealthProfileForm
          saveAction={updateHealthProfile}
          defaultValues={profile}
          submitLabel="Save changes"
          successContent={successContent}
        />
      </div>
    </div>
  );
}
