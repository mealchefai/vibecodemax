import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildPublicFileUrl, getFileUrl } from "@/lib/storage/file-urls";
import {
  normalizeDetectedContentType,
  validateSignature,
  validateStoredObject,
} from "@/lib/storage/upload-validation";

type ProbedObject = {
  contentType: string | null;
  sizeBytes: number | null;
  headerBytes: Uint8Array | null;
};

type SupabaseAdminClient = ReturnType<typeof supabaseAdmin>;
type QueryError = { message: string };
type QueryResponse<T> = Promise<{ data: T; error: QueryError | null }>;
type MutationResponse = Promise<{ error: QueryError | null }>;
type FileRecord = {
  owner_user_id: string;
  bucket: string;
  key: string;
  visibility: "public" | "private";
  mime_type: string | null;
  size_bytes: number | null;
  metadata?: { purpose?: string } | null;
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
  update(values: {
    status?: "ready" | "failed";
    mime_type?: string;
    size_bytes?: number;
    updated_at: string;
  }): {
    eq(column: string, value: string): MutationResponse;
  };
};
type ProfilesTable = {
  update(values: { avatar_file_id: string }): {
    eq(column: string, value: string): MutationResponse;
  };
};

function filesTable(admin: SupabaseAdminClient): FilesTable {
  return admin.from("files") as unknown as FilesTable;
}

function profilesTable(admin: SupabaseAdminClient): ProfilesTable {
  return admin.from("profiles") as unknown as ProfilesTable;
}

function parseSizeFromContentRange(contentRange: string | null): number | null {
  if (!contentRange) {
    return null;
  }
  const match = /\/(\d+)$/.exec(contentRange);
  if (!match) {
    return null;
  }
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function probeSupabaseObject(
  admin: SupabaseAdminClient,
  bucket: string,
  key: string
): Promise<ProbedObject> {
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(key, 60);
  if (error || !data?.signedUrl) {
    return { contentType: null, sizeBytes: null, headerBytes: null };
  }

  const response = await fetch(data.signedUrl, {
    method: "GET",
    headers: {
      Range: "bytes=0-63",
    },
  });

  if (!response.ok) {
    return { contentType: null, sizeBytes: null, headerBytes: null };
  }

  const contentType = normalizeDetectedContentType(
    response.headers.get("content-type")
  );
  const contentRange = response.headers.get("content-range");
  const contentLength = response.headers.get("content-length");
  const sizeFromRange = parseSizeFromContentRange(contentRange);
  const sizeFromLength =
    contentLength && Number.isFinite(Number(contentLength))
      ? Number(contentLength)
      : null;
  const sizeBytes = sizeFromRange ?? sizeFromLength;
  const headerBytes = new Uint8Array(await response.arrayBuffer());

  return {
    contentType,
    sizeBytes,
    headerBytes,
  };
}

async function failAndDeleteUpload(
  admin: SupabaseAdminClient,
  fileId: string,
  fileRecord: { bucket: string; key: string },
  message: string,
  status = 400
) {
  await filesTable(admin)
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("id", fileId);

  await admin.storage.from(fileRecord.bucket).remove([fileRecord.key]);

  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { fileId?: string; purpose?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const { fileId, purpose } = payload;

  if (!fileId) {
    return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: fileRecord, error: fileError } = await filesTable(admin)
    .select(
      "id, owner_user_id, bucket, key, visibility, mime_type, size_bytes, metadata"
    )
    .eq("id", fileId)
    .single();

  if (fileError || !fileRecord || fileRecord.owner_user_id !== user.id) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const storedPurpose =
    typeof fileRecord.metadata?.purpose === "string"
      ? fileRecord.metadata.purpose
      : undefined;
  const effectivePurpose = storedPurpose ?? purpose;

  if (storedPurpose && purpose && storedPurpose !== purpose) {
    return failAndDeleteUpload(
      admin,
      fileId,
      fileRecord,
      "Upload purpose does not match the original upload request."
    );
  }

  const probe = await probeSupabaseObject(
    admin,
    fileRecord.bucket,
    fileRecord.key
  );
  if (!probe.contentType || !probe.sizeBytes) {
    return failAndDeleteUpload(
      admin,
      fileId,
      fileRecord,
      "Unable to verify uploaded file metadata."
    );
  }

  const metadataValidation = validateStoredObject({
    contentType: probe.contentType,
    sizeBytes: probe.sizeBytes,
    purpose: effectivePurpose,
  });
  if (!metadataValidation.ok) {
    return failAndDeleteUpload(
      admin,
      fileId,
      fileRecord,
      metadataValidation.error,
      metadataValidation.status
    );
  }

  const signatureValidation = validateSignature({
    contentType: probe.contentType,
    headerBytes: probe.headerBytes,
  });
  if (!signatureValidation.ok) {
    return failAndDeleteUpload(
      admin,
      fileId,
      fileRecord,
      signatureValidation.error,
      signatureValidation.status
    );
  }

  const claimedContentType = normalizeDetectedContentType(fileRecord.mime_type);
  if (claimedContentType && claimedContentType !== probe.contentType) {
    return failAndDeleteUpload(
      admin,
      fileId,
      fileRecord,
      "Uploaded file content type does not match the original upload request."
    );
  }

  if (
    typeof fileRecord.size_bytes === "number" &&
    Number.isFinite(fileRecord.size_bytes) &&
    fileRecord.size_bytes > 0 &&
    fileRecord.size_bytes !== probe.sizeBytes
  ) {
    return failAndDeleteUpload(
      admin,
      fileId,
      fileRecord,
      "Uploaded file size does not match the original upload request."
    );
  }

  const { error: updateError } = await filesTable(admin)
    .update({
      status: "ready",
      mime_type: probe.contentType,
      size_bytes: probe.sizeBytes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", fileId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (effectivePurpose === "avatar") {
    const { error: avatarError } = await profilesTable(admin)
      .update({ avatar_file_id: fileId })
      .eq("id", user.id);

    if (avatarError) {
      return NextResponse.json({ error: avatarError.message }, { status: 500 });
    }
  }

  const fileUrl =
    fileRecord.visibility === "public"
      ? buildPublicFileUrl(fileRecord.bucket, fileRecord.key)
      : await getFileUrl({
          bucket: fileRecord.bucket,
          key: fileRecord.key,
          visibility: fileRecord.visibility,
        });

  const avatarUrl = effectivePurpose === "avatar" ? fileUrl : null;

  return NextResponse.json({
    fileId,
    fileUrl,
    avatarUrl,
  });
}
