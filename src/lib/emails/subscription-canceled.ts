export function buildSubscriptionCanceledEmail(payload: {
  name?: string | null;
  productName?: string | null;
}) {
  const firstName = payload.name?.trim() || "there";
  const productName = payload.productName?.trim() || "your subscription";
  return {
    subject: "Subscription canceled",
    html: `<p>Hi ${firstName},</p><p>${productName} has been canceled.</p>`,
    text: `Hi ${firstName},

${productName} has been canceled.`,
  };
}
