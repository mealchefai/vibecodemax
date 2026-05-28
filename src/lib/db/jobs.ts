import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface JobSummary {
  id: string;
  user_id: string | null;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
}

export async function getJob(jobId: string): Promise<JobSummary | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("jobs")
    .select("id, user_id, status, progress")
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    console.error("Failed to get job:", error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    user_id: data.user_id ?? null,
    status: data.status,
    progress: data.progress ?? 0,
  };
}
