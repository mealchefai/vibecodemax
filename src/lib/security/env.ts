let validated = false;

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(
      `Missing required environment variable: ${name}. See docs/security-setup.md.`
    );
  }
  return value.trim();
}

export function validateSelectedSecurityEnv() {
  if (validated) return;
  requireEnv("UPSTASH_REDIS_REST_URL");
  requireEnv("UPSTASH_REDIS_REST_TOKEN");
  requireEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY");
  requireEnv("TURNSTILE_SECRET_KEY");
  validated = true;
}
