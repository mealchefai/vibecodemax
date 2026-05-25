import { NextResponse } from "next/server";
import { sendContactFormSubmission } from "@/lib/integrations/email";
import { getClientIp } from "@/lib/security/client-ip";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { enforceRateLimit } from "@/lib/security/rate-limit";

function getRequiredString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return "";
  return trimmed;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = getRequiredString(body?.name, 120);
    const email = getRequiredString(body?.email, 254);
    const subject = getRequiredString(body?.subject, 200);
    const message = getRequiredString(body?.message, 5000);
    const captchaToken =
      typeof body?.captchaToken === "string" ? body.captchaToken : "";
    const clientIp = getClientIp(req.headers);

    const rateLimit = await enforceRateLimit({
      key: "contact:submit:" + clientIp,
      limit: 5,
      windowSeconds: 600,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error:
            rateLimit.error || "Too many requests. Please try again shortly.",
        },
        { status: rateLimit.error ? 503 : 429 }
      );
    }

    if (!captchaToken) {
      return NextResponse.json(
        { error: "Please complete the verification challenge" },
        { status: 400 }
      );
    }

    const captchaOk = await verifyTurnstile(captchaToken, clientIp);
    if (!captchaOk) {
      return NextResponse.json(
        { error: "Verification failed. Please try again." },
        { status: 400 }
      );
    }

    if (!name || !email || !subject || !message || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid contact form submission" },
        { status: 400 }
      );
    }

    const result = await sendContactFormSubmission(
      name,
      email,
      subject,
      message
    );

    if (!result.success) {
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form submission failed:", error);

    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
