import { tasks } from "@trigger.dev/sdk";

function toTriggerTaskId(type: string): string {
  const normalized = type
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) {
    throw new Error("Background job type is required");
  }

  return normalized;
}

export async function dispatchJob(params: {
  type: string;
  jobId: string;
  payload?: Record<string, unknown>;
}): Promise<{ providerRequestId?: string | null }> {
  const taskId = toTriggerTaskId(params.type);

  await tasks.trigger(
    taskId,
    {
      jobId: params.jobId,
      ...(params.payload || {}),
    },
    {
      idempotencyKey: params.jobId,
      maxAttempts: 3,
    }
  );

  return { providerRequestId: params.jobId };
}
