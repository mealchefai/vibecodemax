export function buildPaymentFailedEmail(payload: {
  name?: string | null;
  productName?: string | null;
}) {
  const firstName = payload.name?.trim() || "there";
  const productName = payload.productName?.trim() || "your subscription";
  return {
    subject: "Payment failed",
    html: `<p>Hi ${firstName},</p><p>We could not process the latest payment for ${productName}.</p>`,
    text: `Hi ${firstName},

We could not process the latest payment for ${productName}.`,
  };
}
