import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface JobSummary {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
}

export async function getJob(jobId: string): Promise<JobSummary | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("jobs")
    .select("id, status, progress")
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    console.error("Failed to get job:", error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    status: data.status,
    progress: data.progress ?? 0,
  };
}
