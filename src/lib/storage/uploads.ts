import path from "node:path";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

type FileVisibility = "public" | "private";
type SupabaseAdminClient = ReturnType<typeof supabaseAdmin>;
type QueryError = { message: string };

export type StorageUploadRequest = {
  userId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  purpose?: string;
};

export type StorageUploadResult = {
  fileId: string;
  uploadUrl: string;
  bucket: string;
  key: string;
  visibility: FileVisibility;
};

type FileInsert = {
  id: string;
  owner_user_id: string;
  bucket: string;
  key: string;
  mime_type: string;
  size_bytes: number;
  visibility: FileVisibility;
  status: "uploading";
  metadata: {
    original_name: string;
    purpose: string | null;
  };
};
type FilesTable = {
  insert(values: FileInsert): Promise<{ error: QueryError | null }>;
};

function filesTable(admin: SupabaseAdminClient): FilesTable {
  return admin.from("files") as unknown as FilesTable;
}

function requireEnv(
  name: "SUPABASE_PUBLIC_BUCKET" | "SUPABASE_PRIVATE_BUCKET"
): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function resolvePublicBucket(): string {
  return requireEnv("SUPABASE_PUBLIC_BUCKET");
}

function resolvePrivateBucket(): string {
  return requireEnv("SUPABASE_PRIVATE_BUCKET");
}

function resolvePrefix(purpose?: string): string {
  if (purpose === "avatar") {
    return "avatars";
  }
  if (purpose === "blog") {
    return "blog";
  }
  return "uploads";
}

function buildObjectKey(params: {
  userId: string;
  fileId: string;
  filename: string;
  purpose?: string;
}): string {
  const extension = path.extname(params.filename);
  const prefix = resolvePrefix(params.purpose);
  return `${prefix}/${params.userId}/${params.fileId}${extension}`;
}

async function createUpload(
  request: StorageUploadRequest,
  visibility: FileVisibility
): Promise<StorageUploadResult> {
  const fileId = randomUUID();
  const key = buildObjectKey({
    userId: request.userId,
    filename: request.filename,
    fileId,
    purpose: request.purpose,
  });
  const bucket =
    visibility === "public" ? resolvePublicBucket() : resolvePrivateBucket();

  const admin = supabaseAdmin();
  const { data: signed, error: signedError } = await admin.storage
    .from(bucket)
    .createSignedUploadUrl(key);

  if (signedError || !signed?.signedUrl) {
    throw new Error(signedError?.message || "Failed to create upload URL");
  }

  const { error: insertError } = await filesTable(admin).insert({
    id: fileId,
    owner_user_id: request.userId,
    bucket,
    key,
    mime_type: request.contentType,
    size_bytes: request.sizeBytes,
    visibility,
    status: "uploading",
    metadata: {
      original_name: request.filename,
      purpose: request.purpose || null,
    },
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  return {
    fileId,
    uploadUrl: signed.signedUrl,
    bucket,
    key,
    visibility,
  };
}

export async function uploadPublic(
  request: StorageUploadRequest
): Promise<StorageUploadResult> {
  return createUpload(request, "public");
}

export async function uploadPrivate(
  request: StorageUploadRequest
): Promise<StorageUploadResult> {
  return createUpload(request, "private");
}
