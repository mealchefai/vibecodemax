let validated = false;

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(
      `Missing required environment variable: ${name}. Configure the selected background jobs provider before using background job dispatch.`
    );
  }
  return value.trim();
}

export function validateSelectedJobsEnv() {
  if (validated) return;

  if (process.env.NEXT_PHASE === "phase-production-build") {
    validated = true;
    return;
  }

  requireEnv("TRIGGER_SECRET_KEY");
  requireEnv("TRIGGER_PROJECT_REF");

  validated = true;
}
