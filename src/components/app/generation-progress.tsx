"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface GenerationProgressProps {
  jobId: string;
  initialProgress: number;
  initialStatus: string;
}

function getStatusMessage(progress: number): string {
  if (progress <= 10) return "Getting started…";
  if (progress <= 29) return "Crafting your personalised meal plan…";
  if (progress <= 49) return "Writing your meals for the week…";
  if (progress <= 79) return "Generating meal images…";
  if (progress <= 94) return "Almost there…";
  return "Finishing up…";
}

function log(event: string, data?: Record<string, unknown>) {
  console.log(
    `[GenerationProgress] ${new Date().toISOString()} | ${event}`,
    data ?? ""
  );
}

export function GenerationProgress({
  jobId,
  initialProgress,
  initialStatus,
}: GenerationProgressProps) {
  const router = useRouter();
  const [progress, setProgress] = useState(initialProgress);
  const [status, setStatus] = useState(initialStatus);

  async function handleCompleted() {
    log("handleCompleted called — querying meal_plans", { jobId });
    const supabase = createSupabaseBrowserClient();

    const { data, error } = await supabase
      .from("meal_plans")
      .select("id")
      .eq("job_id", jobId)
      .maybeSingle();

    log("meal_plans query result", { data, error });

    if (data?.id) {
      log("redirecting to plan", { planId: data.id });
      router.push(`/app/plan/${data.id}`);
    } else {
      log("no plan found — redirecting to /app");
      router.push("/app");
    }
  }

  useEffect(() => {
    log("useEffect mounted", { jobId, initialStatus, initialProgress });

    if (initialStatus === "completed") {
      log("initialStatus is completed — calling handleCompleted immediately");
      void handleCompleted();
      return;
    }
    if (initialStatus === "failed") {
      log("initialStatus is failed — no subscription needed");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    async function setupSubscription() {
      // Ensure Realtime uses the authenticated user's JWT before subscribing.
      // Without this, the subscription is sent with the anon key because the
      // INITIAL_SESSION auth event fires asynchronously — after useEffect runs —
      // so realtime.accessTokenValue is still null when subscribe() is called.
      // The RLS policy (auth.uid() = user_id) then silently drops every event.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // React StrictMode mounts → cleans up → remounts, triggering two concurrent
      // async invocations of this function. The cancellation flag ensures the first
      // (now-stale) invocation exits before creating a channel so the second one
      // is the sole owner — prevents "cannot add postgres_changes after subscribe".
      if (cancelled) return;

      log("session fetched before subscribing", {
        hasSession: !!session,
        role: session ? "authenticated" : "anon",
      });

      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
        log("realtime auth token set");
      }

      if (cancelled) return;

      log("creating Realtime channel", { channel: `job-progress-${jobId}` });

      channel = supabase
        .channel(`job-progress-${jobId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "jobs",
            filter: `id=eq.${jobId}`,
          },
          (payload) => {
            log("postgres_changes event received", { payload });

            const updated = payload.new as {
              progress?: number | null;
              status?: string;
            };

            const newProgress = updated.progress ?? 0;
            const newStatus = updated.status ?? "processing";

            log("updating state", { newProgress, newStatus });
            setProgress(newProgress);
            setStatus(newStatus);

            if (newStatus === "completed") {
              log("status is completed — calling handleCompleted");
              void handleCompleted();
            }
          }
        )
        .subscribe((subscriptionStatus, err) => {
          log("subscription status changed", {
            subscriptionStatus,
            err: err ?? null,
          });
        });
    }

    void setupSubscription();

    return () => {
      cancelled = true;
      log("useEffect cleanup — removing channel");
      if (channel) void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  if (status === "failed") {
    return (
      <div>
        <h1 className="text-2xl font-heading font-extrabold text-text-primary">
          Something went wrong
        </h1>
        <p className="text-sm text-text-secondary mt-2">
          We couldn&apos;t generate your meal plan. This can happen occasionally
          — please try again.
        </p>
        <Button asChild className="mt-6 w-full sm:w-auto">
          <Link href="/app/generate">Try again</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-heading font-extrabold text-text-primary">
        Generating your meal plan
      </h1>
      <p className="text-sm text-text-secondary mt-2">
        This usually takes 1–2 minutes. Don&apos;t close this tab.
      </p>

      <div className="mt-8 space-y-2">
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-text-secondary text-right">{progress}%</p>
      </div>

      <p className="text-sm text-text-secondary mt-2">
        {getStatusMessage(progress)}
      </p>
    </div>
  );
}
