"use client";

import React, { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { GenerateMealPlanFormState } from "@/app/(protected)/app/generate/actions";

interface GenerateMealPlanFormProps {
  generateAction: (
    prevState: GenerateMealPlanFormState,
    formData: FormData
  ) => Promise<GenerateMealPlanFormState>;
  dailyCalories: number;
}

const FOOD_CATEGORIES = [
  "Chicken",
  "Beef",
  "Fish & Seafood",
  "Eggs",
  "Vegetarian",
  "Dairy",
  "Pasta & Grains",
  "Salads",
] as const;

const initialState: GenerateMealPlanFormState = { errors: {} };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Generating…" : "Generate my plan"}
    </Button>
  );
}

export function GenerateMealPlanForm({
  generateAction,
  dailyCalories,
}: GenerateMealPlanFormProps) {
  const [state, formAction] = useActionState(
    generateAction,
    initialState
  );

  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="space-y-8">
      {/* Root error banner */}
      {errors._root && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3">
          <p className="text-sm text-danger">{errors._root}</p>
        </div>
      )}

      {/* Calorie target reminder */}
      <div className="rounded-lg border border-border bg-primary/5 px-4 py-3">
        <p className="text-sm text-text-secondary">
          Your daily calorie target:{" "}
          <span className="font-semibold text-foreground">
            {dailyCalories.toLocaleString()} kcal
          </span>
        </p>
      </div>

      {/* Food Preferences */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            Food preferences
          </p>
          <p className="text-xs text-text-secondary mt-1">
            Optional — select the foods you enjoy. We&apos;ll build your plan
            around these.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FOOD_CATEGORIES.map((category) => (
            <label
              key={category}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary"
            >
              <input
                type="checkbox"
                name="food_categories"
                value={category}
                className="sr-only"
              />
              {category}
            </label>
          ))}
        </div>
        {errors.food_categories && (
          <p className="text-xs text-danger">{errors.food_categories}</p>
        )}
      </div>

      {/* Submit */}
      <SubmitButton />
    </form>
  );
}
