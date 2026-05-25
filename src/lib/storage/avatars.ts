import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getFileUrl } from "./file-urls";

interface FileRecord {
  bucket: string;
  key: string;
  status: "uploading" | "ready" | "failed" | "deleted";
  visibility: "public" | "private";
}

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;
type QueryError = { message: string };
type QueryResponse<T> = Promise<{ data: T; error: QueryError | null }>;
type ProfileAvatarRow = {
  avatar_file_id: string | null;
};
type ProfilesTable = {
  select(columns: string): {
    eq(
      column: string,
      value: string
    ): {
      single(): QueryResponse<ProfileAvatarRow | null>;
    };
  };
};
type FilesTable = {
  select(columns: string): {
    eq(
      column: string,
      value: string
    ): {
      single(): QueryResponse<FileRecord | null>;
    };
  };
};

function profilesTable(supabase: SupabaseServerClient): ProfilesTable {
  return supabase.from("profiles") as unknown as ProfilesTable;
}

function filesTable(supabase: SupabaseServerClient): FilesTable {
  return supabase.from("files") as unknown as FilesTable;
}

export async function getAvatarUrlForUser(
  userId: string
): Promise<string | null> {
  const supabase = await createSupabaseServerClient();

  const { data: profile, error: profileError } = await profilesTable(supabase)
    .select("avatar_file_id")
    .eq("id", userId)
    .single();

  const profileRow = profile as ProfileAvatarRow | null;

  if (profileError || !profileRow?.avatar_file_id) {
    return null;
  }

  return getAvatarUrlForFileId(profileRow.avatar_file_id);
}

export async function getAvatarUrlForFileId(
  fileId: string
): Promise<string | null> {
  const supabase = await createSupabaseServerClient();

  const { data: file, error: fileError } = await filesTable(supabase)
    .select("bucket,key,status,visibility")
    .eq("id", fileId)
    .single();

  if (fileError || !file) {
    return null;
  }

  if (file.status !== "ready") {
    return null;
  }

  return getFileUrl({
    bucket: file.bucket,
    key: file.key,
    visibility: file.visibility,
  });
}
