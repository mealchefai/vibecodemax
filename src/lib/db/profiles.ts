import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAvatarUrlForFileId } from "@/lib/storage/avatars";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;
type QueryError = { message: string };
type QueryResponse<T> = Promise<{ data: T; error: QueryError | null }>;
type MutationResponse = Promise<{ error: QueryError | null }>;
type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_file_id: string | null;
  created_at: string;
};
type ProfilesTable = {
  select(columns: string): {
    eq(
      column: string,
      value: string
    ): {
      single(): QueryResponse<ProfileRow | null>;
    };
  };
  update(values: {
    display_name?: string | null;
    avatar_file_id?: string | null;
  }): {
    eq(column: string, value: string): MutationResponse;
  };
};

function profilesTable(supabase: SupabaseServerClient): ProfilesTable {
  return supabase.from("profiles") as unknown as ProfilesTable;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await profilesTable(supabase)
    .select("id, display_name, avatar_file_id, created_at")
    .eq("id", userId)
    .single();

  if (error || !data) {
    console.error("Failed to get profile:", error);
    return null;
  }

  const profile = data as ProfileRow;

  const avatarUrl = profile.avatar_file_id
    ? await getAvatarUrlForFileId(profile.avatar_file_id)
    : null;

  return {
    id: profile.id,
    display_name: profile.display_name,
    avatar_url: avatarUrl,
    created_at: profile.created_at,
  };
}

export async function updateProfile(
  userId: string,
  data: { display_name: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();

  const { error } = await profilesTable(supabase)
    .update({
      display_name: data.display_name,
    })
    .eq("id", userId);

  if (error) {
    console.error("Failed to update profile:", error);
    return { success: false, error: error.message };
  }

  const { error: authError } = await supabase.auth.updateUser({
    data: {
      name: data.display_name,
    },
  });

  if (authError) {
    console.warn("Failed to sync auth metadata:", authError);
  }

  return { success: true };
}
