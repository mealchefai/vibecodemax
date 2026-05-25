import {
  completeJob,
  failJob,
  supabaseAdmin,
  updateJobProgress
} from "../chunk-SWWEV3XL.mjs";
import {
  task
} from "../chunk-62GFTMDR.mjs";
import "../chunk-DPUW62IF.mjs";
import "../chunk-6QBBEOUN.mjs";
import "../chunk-MH2JEEC2.mjs";
import "../chunk-Q7CCAEH6.mjs";
import {
  __name,
  init_esm
} from "../chunk-SOPMFPK3.mjs";

// trigger/transactional-email.ts
init_esm();

// src/lib/integrations/email/index.ts
init_esm();

// src/lib/integrations/email/resend.ts
init_esm();
function getFromAddress(fallback) {
  return fallback || process.env.MAIL_FROM || void 0;
}
__name(getFromAddress, "getFromAddress");
function getReplyToAddress(fallback) {
  return fallback || process.env.EMAIL_REPLY_TO || void 0;
}
__name(getReplyToAddress, "getReplyToAddress");
async function sendEmail(params) {
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
        subject: params.subject
      };
    }
    throw new Error(
      "Missing RESEND_API_KEY. Set it or explicitly enable EMAIL_DELIVERY_MODE=mock."
    );
  }
  if (!from) {
    throw new Error("Missing MAIL_FROM. Set it before sending email.");
  }
  const payload = {
    from,
    to,
    subject: params.subject
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
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend error: ${errorText}`);
  }
  const result = await response.json();
  return {
    id: result.id || `resend-${Date.now()}`,
    from,
    to,
    subject: params.subject
  };
}
__name(sendEmail, "sendEmail");

// src/lib/integrations/email/index.ts
async function sendEmail2(params) {
  try {
    const result = await sendEmail(params);
    return { id: result.id, success: true };
  } catch (error) {
    console.error("Email delivery failed:", error);
    if (process.env.EMAIL_DELIVERY_MODE === "mock") {
      return { id: `mock-email-${Date.now()}`, success: true };
    }
    return {
      id: "",
      success: false,
      message: "Failed to send email"
    };
  }
}
__name(sendEmail2, "sendEmail");

// src/lib/emails/payment-failed.ts
init_esm();
function buildPaymentFailedEmail(payload) {
  const firstName = payload.name?.trim() || "there";
  const productName = payload.productName?.trim() || "your subscription";
  return {
    subject: "Payment failed",
    html: `<p>Hi ${firstName},</p><p>We could not process the latest payment for ${productName}.</p>`,
    text: `Hi ${firstName},

We could not process the latest payment for ${productName}.`
  };
}
__name(buildPaymentFailedEmail, "buildPaymentFailedEmail");

// src/lib/emails/subscription-canceled.ts
init_esm();
function buildSubscriptionCanceledEmail(payload) {
  const firstName = payload.name?.trim() || "there";
  const productName = payload.productName?.trim() || "your subscription";
  return {
    subject: "Subscription canceled",
    html: `<p>Hi ${firstName},</p><p>${productName} has been canceled.</p>`,
    text: `Hi ${firstName},

${productName} has been canceled.`
  };
}
__name(buildSubscriptionCanceledEmail, "buildSubscriptionCanceledEmail");

// src/lib/emails/welcome.ts
init_esm();
function buildWelcomeEmail(payload) {
  const firstName = payload.name?.trim() || "there";
  return {
    subject: "Welcome",
    html: `<p>Hi ${firstName},</p><p>Your account is ready.</p>`,
    text: `Hi ${firstName},

Your account is ready.`
  };
}
__name(buildWelcomeEmail, "buildWelcomeEmail");

// trigger/transactional-email.ts
async function loadJobResult(jobId) {
  const { data, error } = await supabaseAdmin().from("jobs").select("result").eq("id", jobId).maybeSingle();
  if (error) {
    throw new Error(error.message || "Failed to read job state");
  }
  return data?.result || null;
}
__name(loadJobResult, "loadJobResult");
async function loadEmailDelivery(dedupeKey) {
  const { data, error } = await supabaseAdmin().from("email_deliveries").select("id, status, job_id, sent_email_id").eq("dedupe_key", dedupeKey).maybeSingle();
  if (error) {
    throw new Error(error.message || "Failed to read email delivery");
  }
  return data || null;
}
__name(loadEmailDelivery, "loadEmailDelivery");
async function claimEmailDelivery(params) {
  const deliveries = supabaseAdmin().from("email_deliveries");
  const { error } = await deliveries.insert({
    dedupe_key: params.dedupeKey,
    email_type: params.emailType,
    provider: params.provider ?? null,
    provider_event_id: params.providerEventId ?? null,
    job_id: params.jobId,
    status: "pending"
  });
  if (!error) {
    return { status: "claimed", emailId: null };
  }
  const existing = await loadEmailDelivery(params.dedupeKey);
  if (!existing) {
    throw new Error(error.message || "Failed to claim email delivery");
  }
  if (existing.status === "sent") {
    return { status: "sent", emailId: existing.sent_email_id };
  }
  if (existing.job_id === params.jobId) {
    return { status: "claimed", emailId: existing.sent_email_id };
  }
  if (existing.status === "failed") {
    const { data, error: takeError } = await deliveries.update({
      job_id: params.jobId,
      status: "pending",
      last_error: null,
      provider: params.provider ?? null,
      provider_event_id: params.providerEventId ?? null,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("dedupe_key", params.dedupeKey).eq("status", "failed").select("id, status, job_id, sent_email_id").maybeSingle();
    if (takeError) {
      throw new Error(takeError.message || "Failed to reclaim email delivery");
    }
    if (data?.job_id === params.jobId) {
      return {
        status: "claimed",
        emailId: data.sent_email_id ?? null
      };
    }
  }
  return { status: "in_progress", emailId: existing.sent_email_id };
}
__name(claimEmailDelivery, "claimEmailDelivery");
async function markEmailSent(jobId, dedupeKey, emailId) {
  const existing = await loadJobResult(jobId) || {};
  const deliveries = supabaseAdmin().from("email_deliveries");
  const { error: deliveryError } = await deliveries.update({
    status: "sent",
    sent_email_id: emailId,
    last_error: null,
    sent_at: (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("dedupe_key", dedupeKey).eq("job_id", jobId);
  if (deliveryError) {
    throw new Error(
      deliveryError.message || "Failed to persist email delivery state"
    );
  }
  const { error } = await supabaseAdmin().from("jobs").update({
    result: {
      ...existing,
      emailSentAt: (/* @__PURE__ */ new Date()).toISOString(),
      emailId
    },
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", jobId);
  if (error) {
    throw new Error(error.message || "Failed to persist email delivery state");
  }
}
__name(markEmailSent, "markEmailSent");
async function markEmailFailed(jobId, dedupeKey, errorMessage) {
  const { error } = await supabaseAdmin().from("email_deliveries").update({
    status: "failed",
    last_error: errorMessage,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("dedupe_key", dedupeKey).eq("job_id", jobId);
  if (error) {
    throw new Error(
      error.message || "Failed to persist email delivery failure"
    );
  }
}
__name(markEmailFailed, "markEmailFailed");
async function sendLifecycleEmail(jobId, payload, builder) {
  const dedupeKey = typeof payload.dedupeKey === "string" ? payload.dedupeKey : "";
  if (!dedupeKey) {
    throw new Error("Missing email dedupe key");
  }
  const emailType = typeof payload.emailType === "string" ? payload.emailType : null;
  if (!emailType) {
    throw new Error("Missing email type");
  }
  const to = typeof payload.email === "string" ? payload.email : "";
  if (!to) {
    throw new Error("Missing email recipient");
  }
  const claim = await claimEmailDelivery({
    dedupeKey,
    emailType,
    jobId,
    provider: payload.provider || null,
    providerEventId: payload.providerEventId || null
  });
  if (claim.status === "sent" || claim.status === "in_progress") {
    return {
      dedupeKey,
      emailId: claim.emailId,
      deduped: true
    };
  }
  const content = builder(payload);
  let result;
  try {
    result = await sendEmail2({
      to,
      subject: content.subject,
      html: content.html,
      text: content.text
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email send failed";
    await markEmailFailed(jobId, dedupeKey, message);
    throw error;
  }
  if (!result.success) {
    const message = result.message || "Email send failed";
    await markEmailFailed(jobId, dedupeKey, message);
    throw new Error(message);
  }
  await markEmailSent(jobId, dedupeKey, result.id);
  return { dedupeKey, emailId: result.id, deduped: false };
}
__name(sendLifecycleEmail, "sendLifecycleEmail");
function createEmailJob(id, eventName, builder) {
  return task({
    id,
    retry: { maxAttempts: 3 },
    run: /* @__PURE__ */ __name(async (payload) => {
      const jobId = typeof payload.jobId === "string" ? payload.jobId : "";
      if (!jobId) {
        throw new Error("Missing email job id");
      }
      try {
        await updateJobProgress(jobId, 20);
        const delivery = await sendLifecycleEmail(
          jobId,
          {
            ...payload,
            emailType: eventName
          },
          builder
        );
        await completeJob(jobId, delivery || null);
        return { ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Job failed";
        await failJob(jobId, message);
        throw error;
      }
    }, "run")
  });
}
__name(createEmailJob, "createEmailJob");
var welcomeEmailJob = createEmailJob(
  "email-welcome",
  "email/welcome",
  buildWelcomeEmail
);
var subscriptionCanceledEmailJob = createEmailJob(
  "email-subscription-canceled",
  "email/subscription.canceled",
  buildSubscriptionCanceledEmail
);
var paymentFailedEmailJob = createEmailJob(
  "email-payment-failed",
  "email/payment.failed",
  buildPaymentFailedEmail
);
export {
  paymentFailedEmailJob,
  subscriptionCanceledEmailJob,
  welcomeEmailJob
};
//# sourceMappingURL=transactional-email.mjs.map
