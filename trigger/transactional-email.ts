import { task } from "@trigger.dev/sdk";
import { completeJob, failJob, updateJobProgress } from "@/lib/jobs/trigger";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/integrations/email";
import { buildPaymentFailedEmail } from "@/lib/emails/payment-failed";
import { buildSubscriptionCanceledEmail } from "@/lib/emails/subscription-canceled";
import { buildWelcomeEmail } from "@/lib/emails/welcome";

type EmailDeliveryRecord = {
  id: string;
  status: "pending" | "sent" | "failed";
  job_id: string;
  sent_email_id: string | null;
};

type EmailPayload = {
  jobId?: string;
  email?: string;
  name?: string | null;
  productName?: string | null;
  provider?: string | null;
  providerEventId?: string | null;
  dedupeKey?: string;
  emailType?: string;
};

type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

async function loadJobResult(jobId: string) {
  const { data, error } = await supabaseAdmin()
    .from("jobs")
    .select("result")
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to read job state");
  }

  return (data?.result || null) as Record<string, unknown> | null;
}

async function loadEmailDelivery(dedupeKey: string) {
  const { data, error } = await supabaseAdmin()
    .from("email_deliveries")
    .select("id, status, job_id, sent_email_id")
    .eq("dedupe_key", dedupeKey)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to read email delivery");
  }

  return (data || null) as EmailDeliveryRecord | null;
}

async function claimEmailDelivery(params: {
  dedupeKey: string;
  emailType: string;
  jobId: string;
  provider?: string | null;
  providerEventId?: string | null;
}) {
  const deliveries = supabaseAdmin().from("email_deliveries");
  const { error } = await deliveries.insert({
    dedupe_key: params.dedupeKey,
    email_type: params.emailType,
    provider: params.provider ?? null,
    provider_event_id: params.providerEventId ?? null,
    job_id: params.jobId,
    status: "pending",
  });

  if (!error) {
    return { status: "claimed" as const, emailId: null };
  }

  const existing = await loadEmailDelivery(params.dedupeKey);
  if (!existing) {
    throw new Error(error.message || "Failed to claim email delivery");
  }

  if (existing.status === "sent") {
    return { status: "sent" as const, emailId: existing.sent_email_id };
  }

  if (existing.job_id === params.jobId) {
    return { status: "claimed" as const, emailId: existing.sent_email_id };
  }

  if (existing.status === "failed") {
    const { data, error: takeError } = await deliveries
      .update({
        job_id: params.jobId,
        status: "pending",
        last_error: null,
        provider: params.provider ?? null,
        provider_event_id: params.providerEventId ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("dedupe_key", params.dedupeKey)
      .eq("status", "failed")
      .select("id, status, job_id, sent_email_id")
      .maybeSingle();

    if (takeError) {
      throw new Error(takeError.message || "Failed to reclaim email delivery");
    }

    if (data?.job_id === params.jobId) {
      return {
        status: "claimed" as const,
        emailId: data.sent_email_id ?? null,
      };
    }
  }

  return { status: "in_progress" as const, emailId: existing.sent_email_id };
}

async function markEmailSent(
  jobId: string,
  dedupeKey: string,
  emailId: string
) {
  const existing = (await loadJobResult(jobId)) || {};
  const deliveries = supabaseAdmin().from("email_deliveries");
  const { error: deliveryError } = await deliveries
    .update({
      status: "sent",
      sent_email_id: emailId,
      last_error: null,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("dedupe_key", dedupeKey)
    .eq("job_id", jobId);

  if (deliveryError) {
    throw new Error(
      deliveryError.message || "Failed to persist email delivery state"
    );
  }

  const { error } = await supabaseAdmin()
    .from("jobs")
    .update({
      result: {
        ...existing,
        emailSentAt: new Date().toISOString(),
        emailId,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(error.message || "Failed to persist email delivery state");
  }
}

async function markEmailFailed(
  jobId: string,
  dedupeKey: string,
  errorMessage: string
) {
  const { error } = await supabaseAdmin()
    .from("email_deliveries")
    .update({
      status: "failed",
      last_error: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("dedupe_key", dedupeKey)
    .eq("job_id", jobId);

  if (error) {
    throw new Error(
      error.message || "Failed to persist email delivery failure"
    );
  }
}

async function sendLifecycleEmail(
  jobId: string,
  payload: EmailPayload,
  builder: (payload: EmailPayload) => EmailContent
) {
  const dedupeKey =
    typeof payload.dedupeKey === "string" ? payload.dedupeKey : "";
  if (!dedupeKey) {
    throw new Error("Missing email dedupe key");
  }

  const emailType =
    typeof payload.emailType === "string" ? payload.emailType : null;
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
    providerEventId: payload.providerEventId || null,
  });

  if (claim.status === "sent" || claim.status === "in_progress") {
    return {
      dedupeKey,
      emailId: claim.emailId,
      deduped: true,
    };
  }

  const content = builder(payload);
  let result;
  try {
    result = await sendEmail({
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Email send failed";
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

function createEmailJob(
  id: string,
  eventName: string,
  builder: (payload: EmailPayload) => EmailContent
) {
  return task({
    id,
    retry: { maxAttempts: 3 },
    run: async (payload: EmailPayload) => {
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
            emailType: eventName,
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
    },
  });
}

export const welcomeEmailJob = createEmailJob(
  "email-welcome",
  "email/welcome",
  buildWelcomeEmail
);
export const subscriptionCanceledEmailJob = createEmailJob(
  "email-subscription-canceled",
  "email/subscription.canceled",
  buildSubscriptionCanceledEmail
);
export const paymentFailedEmailJob = createEmailJob(
  "email-payment-failed",
  "email/payment.failed",
  buildPaymentFailedEmail
);
