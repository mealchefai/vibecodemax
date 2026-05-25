function normalizeKey(key: string): string {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function buildPublicFileUrl(bucket: string, key: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!baseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.");
  }

  const normalizedKey = normalizeKey(key);
  return `${baseUrl}/storage/v1/object/public/${bucket}/${normalizedKey}`;
}

export async function getFileUrl(file: {
  bucket: string;
  key: string;
  visibility: "public" | "private";
}): Promise<string | null> {
  if (file.visibility === "public") {
    return buildPublicFileUrl(file.bucket, file.key);
  }

  const { supabaseAdmin } = await import("@/lib/supabase/admin");
  const admin = supabaseAdmin();
  const { data, error } = await admin.storage
    .from(file.bucket)
    .createSignedUrl(file.key, 3600);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}
