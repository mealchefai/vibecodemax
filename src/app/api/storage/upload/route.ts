import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uploadPrivate, uploadPublic } from "@/lib/storage/uploads";
import { validateUploadPayload } from "@/lib/storage/upload-validation";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: {
    filename?: string;
    contentType?: string;
    sizeBytes?: number;
    purpose?: string;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const validation = validateUploadPayload(payload);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { filename, contentType, sizeBytes, purpose } = validation.value;

  try {
    const requestPayload = {
      userId: user.id,
      filename,
      contentType,
      sizeBytes,
      purpose,
    };
    const result =
      purpose === "avatar" || purpose === "blog"
        ? await uploadPublic(requestPayload)
        : await uploadPrivate(requestPayload);

    return NextResponse.json({
      fileId: result.fileId,
      uploadUrl: result.uploadUrl,
      bucket: result.bucket,
      key: result.key,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create upload URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
