import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

interface GeneratingCardProps {
  progress: number;
  jobId: string | null;
}

export function GeneratingCard({ progress, jobId }: GeneratingCardProps) {
  const progressLabel = progress >= 90 ? "Almost ready!" : "Generating…";
  const progressHref = jobId
    ? `/app/generate/progress?jobId=${jobId}`
    : "/app/generate";
  const progressLinkLabel = jobId ? "View progress" : "Check status";

  return (
    <Card className="bg-surface border-border">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <svg
              className="h-5 w-5 text-primary animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-text-primary">
            Your meal plan is being prepared
          </h3>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            This usually takes 1–3 minutes. You can leave and come back —
            we&apos;ll have it ready for you.
          </p>

          <div className="space-y-2">
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-text-secondary">{progressLabel}</p>
          </div>

          <Link
            href={progressHref}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {progressLinkLabel}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
