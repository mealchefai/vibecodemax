export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getJob } from "@/lib/db/jobs";
import { getMealPlanByJobId } from "@/lib/db/meal-plans";
import { GenerationProgress } from "@/components/app/generation-progress";

type ProgressSearchParams = Promise<{ jobId?: string }>;

export default async function GenerationProgressPage({
  searchParams,
}: {
  searchParams: ProgressSearchParams;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const { jobId } = params;

  // Guard: missing jobId
  if (!jobId) {
    redirect("/app");
  }

  // Guard: job must exist and belong to this user
  const job = await getJob(jobId);
  if (!job || job.user_id !== user.id) {
    redirect("/app");
  }

  // If already completed: resolve the plan ID and redirect immediately
  if (job.status === "completed") {
    const plan = await getMealPlanByJobId(jobId);
    if (plan) {
      redirect("/app/plan/" + plan.id);
    }
    redirect("/app");
  }

  return (
    <div className="container mx-auto px-container-mobile md:px-container max-w-page">
      <div className="mx-auto max-w-md py-24">
        <GenerationProgress
          jobId={jobId}
          initialProgress={job.progress ?? 0}
          initialStatus={job.status}
        />
      </div>
    </div>
  );
}
