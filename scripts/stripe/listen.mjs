import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const ENV_FILES = [".env.local", ".env"];
const DEFAULT_LOCAL_APP_URL = "http://localhost:3000";
const STRIPE_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
];

function readNonEmptyString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseEnvFile(contents) {
  const env = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

async function loadProjectEnv() {
  const loaded = {};

  for (const fileName of ENV_FILES) {
    const filePath = path.join(process.cwd(), fileName);
    try {
      const contents = await fs.readFile(filePath, "utf8");
      Object.assign(loaded, parseEnvFile(contents));
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        continue;
      }
      throw error;
    }
  }

  return {
    ...loaded,
    ...process.env,
  };
}

function resolveLocalAppUrl(env) {
  const value =
    readNonEmptyString(env.STRIPE_LOCAL_APP_URL) ||
    readNonEmptyString(env.NEXT_PUBLIC_SITE_URL) ||
    DEFAULT_LOCAL_APP_URL;

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      "STRIPE_LOCAL_APP_URL or NEXT_PUBLIC_SITE_URL must be a valid local http:// or https:// URL."
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      "STRIPE_LOCAL_APP_URL or NEXT_PUBLIC_SITE_URL must use http:// or https://."
    );
  }

  return parsed.toString().replace(/\/+$/, "");
}

function runStripeListen(localAppUrl, env) {
  const stripeSecretKey = readNonEmptyString(env.STRIPE_SECRET_KEY);
  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY in .env.local.");
  }

  const command = process.platform === "win32" ? "stripe.cmd" : "stripe";
  const webhookUrl = `${localAppUrl}/api/webhooks/stripe`;
  const args = [
    "listen",
    "--forward-to",
    webhookUrl,
    "--events",
    STRIPE_EVENTS.join(","),
  ];

  console.log(`Forwarding Stripe events to ${webhookUrl}`);
  console.log(
    "Copy the whsec_... signing secret printed by Stripe CLI into STRIPE_WEBHOOK_SECRET in .env.local, then restart the app."
  );

  const child = spawn(command, args, {
    stdio: "inherit",
    env: {
      ...process.env,
      STRIPE_API_KEY: stripeSecretKey,
    },
  });

  child.on("error", () => {
    console.error(
      "Stripe CLI is not available on PATH. Install Stripe CLI and run stripe login before using npm run stripe:listen."
    );
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
}

async function main() {
  const env = await loadProjectEnv();
  const localAppUrl = resolveLocalAppUrl(env);
  runStripeListen(localAppUrl, env);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
