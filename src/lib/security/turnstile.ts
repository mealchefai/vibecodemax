export async function verifyTurnstile(token: string, ip?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    throw new Error("TURNSTILE_SECRET_KEY is required");
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  });

  if (ip && ip !== "unknown") {
    body.set("remoteip", ip);
  }

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Turnstile error: ${response.status} ${text}`);
  }

  const payload = (await response.json()) as { success?: boolean };
  return Boolean(payload.success);
}
