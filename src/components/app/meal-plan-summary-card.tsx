import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import type { Goal } from "@/lib/db/health-profiles";

interface MealPlanSummaryCardProps {
  mealPlanId: string;
  dailyCalories: number;
  goal: Goal;
  createdAt: string;
}

const GOAL_LABELS: Record<Goal, string> = {
  lose: "Lose weight",
  maintain: "Maintain weight",
  gain: "Gain muscle",
};

export function MealPlanSummaryCard({
  mealPlanId,
  dailyCalories,
  goal,
  createdAt,
}: MealPlanSummaryCardProps) {
  const goalLabel = GOAL_LABELS[goal];
  const formattedDate = new Date(createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Card className="bg-surface border-border">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <svg
              className="h-5 w-5 text-primary-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-text-primary">
            Your meal plan is ready
          </h3>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {dailyCalories.toLocaleString()} kcal/day · {goalLabel}
            </p>
            <p className="text-xs text-text-secondary">
              Generated {formattedDate}
            </p>
          </div>
          <Button size="sm" asChild>
            <Link href={`/app/plan/${mealPlanId}`}>View my plan</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
