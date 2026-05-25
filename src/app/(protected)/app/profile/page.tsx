import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { getProfile, updateProfile } from "@/lib/db/profiles";
import { ProfileForm } from "@/components/forms/profile-form";

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  const handleProfileUpdate = async (data: { display_name: string }) => {
    "use server";

    const result = await updateProfile(user.id, data);
    if (!result.success) {
      throw new Error(result.error || "Failed to update profile");
    }
    revalidatePath("/app/profile");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Profile Settings
          </h1>
          <p className="text-text-secondary mt-2">
            Manage your personal information and profile preferences.
          </p>
        </div>

        <ProfileForm
          user={user}
          profile={profile}
          onSave={handleProfileUpdate}
        />
      </div>
    </div>
  );
}
