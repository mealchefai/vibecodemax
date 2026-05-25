type UploadPurpose = "avatar" | "blog" | "upload";

type UploadPayload = {
  filename?: unknown;
  contentType?: unknown;
  sizeBytes?: unknown;
  purpose?: unknown;
};

type ValidationSuccess = {
  ok: true;
  value: {
    filename: string;
    contentType: string;
    sizeBytes: number;
    purpose: UploadPurpose;
  };
};

type ValidationFailure = {
  ok: false;
  error: string;
  status: number;
};

type ValidationResult = ValidationSuccess | ValidationFailure;

const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const SIGNATURE_VERIFIED_MIME_TYPES = new Set<string>(ALLOWED_IMAGE_MIME_TYPES);

const ALLOWED_MIME_TYPES = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const PURPOSE_ALLOWED_MIME_TYPES: Record<UploadPurpose, Set<string>> = {
  avatar: SIGNATURE_VERIFIED_MIME_TYPES,
  blog: SIGNATURE_VERIFIED_MIME_TYPES,
  upload: ALLOWED_MIME_TYPES,
};

const PURPOSE_MAX_BYTES: Record<UploadPurpose, number> = {
  avatar: 5 * 1024 * 1024,
  blog: 10 * 1024 * 1024,
  upload: 10 * 1024 * 1024,
};

function normalizePurpose(raw: unknown): UploadPurpose {
  if (raw === "avatar") return "avatar";
  if (raw === "blog") return "blog";
  return "upload";
}

function normalizeContentType(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.split(";")[0]?.trim().toLowerCase();
  return value || null;
}

function maxAllowedBytes(contentType: string, purpose: UploadPurpose): number {
  return PURPOSE_ALLOWED_MIME_TYPES[purpose].has(contentType)
    ? PURPOSE_MAX_BYTES[purpose]
    : 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function hasSupportedSignature(contentType: string): boolean {
  return SIGNATURE_VERIFIED_MIME_TYPES.has(contentType);
}

function matchesSignature(contentType: string, bytes: Uint8Array): boolean {
  if (contentType === "image/jpeg") {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }

  if (contentType === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  if (contentType === "image/gif") {
    if (bytes.length < 6) return false;
    const header = String.fromCharCode(...bytes.slice(0, 6));
    return header === "GIF87a" || header === "GIF89a";
  }

  if (contentType === "image/webp") {
    if (bytes.length < 12) return false;
    const riff = String.fromCharCode(...bytes.slice(0, 4));
    const webp = String.fromCharCode(...bytes.slice(8, 12));
    return riff === "RIFF" && webp === "WEBP";
  }

  return true;
}

export function validateUploadPayload(
  payload: UploadPayload
): ValidationResult {
  const filename =
    typeof payload.filename === "string" ? payload.filename.trim() : "";
  const contentType = normalizeContentType(payload.contentType);
  const sizeBytes = payload.sizeBytes;
  const purpose = normalizePurpose(payload.purpose);

  if (!filename) {
    return { ok: false, error: "Missing filename", status: 400 };
  }

  if (!contentType) {
    return { ok: false, error: "Missing contentType", status: 400 };
  }

  if (!isPositiveInteger(sizeBytes)) {
    return { ok: false, error: "Invalid sizeBytes", status: 400 };
  }

  if (!PURPOSE_ALLOWED_MIME_TYPES[purpose].has(contentType)) {
    return {
      ok: false,
      error: `Unsupported MIME type: ${contentType}`,
      status: 400,
    };
  }

  const maxBytes = maxAllowedBytes(contentType, purpose);
  if (sizeBytes > maxBytes) {
    return {
      ok: false,
      error: `File size exceeds maximum allowed (${maxBytes} bytes)`,
      status: 413,
    };
  }

  return {
    ok: true,
    value: {
      filename,
      contentType,
      sizeBytes,
      purpose,
    },
  };
}

export function validateStoredObject(args: {
  contentType: string;
  sizeBytes: number;
  purpose: unknown;
}): ValidationResult {
  return validateUploadPayload({
    filename: "stored-object",
    contentType: args.contentType,
    sizeBytes: args.sizeBytes,
    purpose: args.purpose,
  });
}

export function validateSignature(args: {
  contentType: string;
  headerBytes: Uint8Array | null;
}): ValidationFailure | { ok: true } {
  const normalizedContentType = normalizeContentType(args.contentType);
  if (!normalizedContentType) {
    return { ok: false, error: "Missing detected content type", status: 400 };
  }

  if (!hasSupportedSignature(normalizedContentType)) {
    return { ok: true };
  }

  if (!args.headerBytes || args.headerBytes.length === 0) {
    return {
      ok: false,
      error: "Unable to verify uploaded file signature",
      status: 400,
    };
  }

  if (!matchesSignature(normalizedContentType, args.headerBytes)) {
    return {
      ok: false,
      error: "Uploaded file signature does not match MIME type",
      status: 400,
    };
  }

  return { ok: true };
}

export function normalizeDetectedContentType(
  value: string | null | undefined
): string | null {
  return normalizeContentType(value ?? null);
}
