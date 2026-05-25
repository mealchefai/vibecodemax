const DEFAULT_PUBLIC_APP_URL = "http://localhost:3000";

function normalizePath(path: string): string {
  if (!path) {
    return "/";
  }
  return path.startsWith("/") ? path : `/${path}`;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

function isLocalhostUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1"
    );
  } catch {
    return false;
  }
}

function assertValidPublicSiteUrl(value: string): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      "Invalid NEXT_PUBLIC_SITE_URL. Set a full URL such as https://your-domain.com."
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      "Invalid NEXT_PUBLIC_SITE_URL protocol. Use an http:// or https:// URL."
    );
  }
}

export function getPublicAppBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (!fromEnv || !fromEnv.trim()) {
    if (isProductionRuntime()) {
      throw new Error(
        "Missing NEXT_PUBLIC_SITE_URL in production. Set it to your public app URL."
      );
    }
    return DEFAULT_PUBLIC_APP_URL;
  }

  const normalized = trimTrailingSlash(fromEnv.trim());

  if (isProductionRuntime() && isLocalhostUrl(normalized)) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL points to localhost in production. Set a public domain URL."
    );
  }

  assertValidPublicSiteUrl(normalized);

  return normalized;
}

export function buildPublicAppUrl(path: string): string {
  return `${getPublicAppBaseUrl()}${normalizePath(path)}`;
}
