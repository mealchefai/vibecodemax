import { supabaseAdmin } from "@/lib/supabase/admin";
import { dispatchJob } from "@/lib/jobs/client";

function getJobsTable() {
  return supabaseAdmin().from("jobs");
}

function toJobResult(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export async function triggerJob<T extends Record<string, unknown>>(params: {
  type: string;
  userId?: string | null;
  input?: T;
}): Promise<{ jobId: string }> {
  const { data: job, error } = await getJobsTable()
    .insert({
      user_id: params.userId ?? null,
      type: params.type,
      status: "queued",
      input: params.input ?? null,
    })
    .select("id")
    .single();

  if (error || !job?.id) {
    throw new Error(error?.message || "Failed to create job record");
  }

  try {
    await dispatchJob({
      type: params.type,
      jobId: job.id,
      payload: params.input ?? undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to dispatch job";
    await failJob(job.id, message);
    throw error;
  }

  return { jobId: job.id };
}

export async function updateJobProgress(
  jobId: string,
  progress: number
): Promise<void> {
  const { error } = await getJobsTable()
    .update({
      status: "processing",
      progress,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(error.message || "Failed to update job progress");
  }
}

export async function completeJob(
  jobId: string,
  result?: unknown
): Promise<void> {
  const { error } = await getJobsTable()
    .update({
      status: "completed",
      progress: 100,
      result: toJobResult(result),
      error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(error.message || "Failed to complete job");
  }
}

export async function failJob(
  jobId: string,
  errorMessage: string
): Promise<void> {
  const { error } = await getJobsTable()
    .update({
      status: "failed",
      error: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(error.message || "Failed to fail job");
  }
}
