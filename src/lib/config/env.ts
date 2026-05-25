type EnvKey = "NODE_ENV" | "npm_package_version";

function readEnv(key: EnvKey): string | undefined {
  const value = process.env[key];
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getRuntimeEnvironment(): string {
  return readEnv("NODE_ENV") ?? "unknown";
}

export function getAppVersion(): string {
  return readEnv("npm_package_version") ?? "unknown";
}
