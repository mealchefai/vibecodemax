import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export function NoMealPlanCard() {
  return (
    <Card className="bg-surface border-border">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <svg
              className="h-5 w-5 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-text-primary">
            Generate your first meal plan
          </h3>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Your calorie target is ready. Generate a personalised 7-day meal
            plan in about 2 minutes.
          </p>
          <Button size="sm" asChild>
            <Link href="/app/generate">Generate my plan</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
