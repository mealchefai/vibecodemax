import { sendEmail as sendWithResend, SendEmailParams } from "./resend";

export type EmailResult = {
  id: string;
  success: boolean;
  message?: string;
};

export type { SendEmailParams };

export async function sendEmail(params: SendEmailParams): Promise<EmailResult> {
  try {
    const result = await sendWithResend(params);
    return { id: result.id, success: true };
  } catch (error) {
    console.error("Email delivery failed:", error);

    if (process.env.EMAIL_DELIVERY_MODE === "mock") {
      return { id: `mock-email-${Date.now()}`, success: true };
    }

    return {
      id: "",
      success: false,
      message: "Failed to send email",
    };
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}

export async function sendContactFormSubmission(
  name: string,
  email: string,
  subject: string,
  message: string
): Promise<EmailResult> {
  const text = `New contact form submission from ${name} (${email}): ${message}`;
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");
  const html = `<p><strong>${escapeHtml(name)}</strong> (${escapeHtml(email)})</p><p>${safeMessage}</p>`;

  return sendEmail({
    to:
      process.env.EMAIL_SUPPORT ||
      process.env.MAIL_FROM ||
      "support@yourdomain.com",
    subject,
    text,
    html,
    replyTo: email,
  });
}
