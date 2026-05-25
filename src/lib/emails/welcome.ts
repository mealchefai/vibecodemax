export function buildWelcomeEmail(payload: { name?: string | null }) {
  const firstName = payload.name?.trim() || "there";
  return {
    subject: "Welcome",
    html: `<p>Hi ${firstName},</p><p>Your account is ready.</p>`,
    text: `Hi ${firstName},

Your account is ready.`,
  };
}
