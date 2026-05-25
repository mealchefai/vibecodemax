export interface SendEmailParams {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

export interface SendEmailResult {
  id: string;
  from: string;
  to: string[];
  subject: string;
}

function getFromAddress(fallback?: string) {
  return fallback || process.env.MAIL_FROM || undefined;
}

function getReplyToAddress(fallback?: string) {
  return fallback || process.env.EMAIL_REPLY_TO || undefined;
}

export async function sendEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getFromAddress(params.from);
  const replyTo = getReplyToAddress(params.replyTo);
  const to = Array.isArray(params.to) ? params.to : [params.to];

  if (!apiKey) {
    if (process.env.EMAIL_DELIVERY_MODE === "mock") {
      console.warn(
        "RESEND_API_KEY is missing. EMAIL_DELIVERY_MODE=mock enabled mock email delivery."
      );
      return {
        id: `resend-mock-${Date.now()}`,
        from: from || "support@yourdomain.com",
        to,
        subject: params.subject,
      };
    }

    throw new Error(
      "Missing RESEND_API_KEY. Set it or explicitly enable EMAIL_DELIVERY_MODE=mock."
    );
  }

  if (!from) {
    throw new Error("Missing MAIL_FROM. Set it before sending email.");
  }

  const payload: Record<string, unknown> = {
    from,
    to,
    subject: params.subject,
  };

  if (params.text) payload.text = params.text;
  if (params.html) payload.html = params.html;
  if (replyTo) payload.reply_to = replyTo;
  if (params.cc?.length) payload.cc = params.cc;
  if (params.bcc?.length) payload.bcc = params.bcc;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend error: ${errorText}`);
  }

  const result = (await response.json()) as { id?: string };

  return {
    id: result.id || `resend-${Date.now()}`,
    from,
    to,
    subject: params.subject,
  };
}

export function getDefaultEmailMeta() {
  return {
    from: process.env.MAIL_FROM || undefined,
    replyTo: process.env.EMAIL_REPLY_TO || undefined,
  };
}
