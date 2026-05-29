"use client";

import React, { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HealthProfile } from "@/lib/db/health-profiles";

export interface HealthProfileFormState {
  errors?: {
    age?: string;
    gender?: string;
    weight_kg?: string;
    height_cm?: string;
    activity_level?: string;
    goal?: string;
    dietary_preferences?: string;
    _root?: string;
  };
  success?: boolean;
}

interface HealthProfileFormProps {
  saveAction: (
    prevState: HealthProfileFormState,
    formData: FormData
  ) => Promise<HealthProfileFormState>;
  defaultValues?: HealthProfile | null;
  submitLabel?: string;
  successContent?: React.ReactNode;
}

const ACTIVITY_LEVELS = [
  {
    value: "sedentary",
    label: "Sedentary",
    description: "Little or no exercise, desk job",
  },
  {
    value: "light",
    label: "Lightly active",
    description: "Light exercise 1–3 days per week",
  },
  {
    value: "moderate",
    label: "Moderately active",
    description: "Moderate exercise 3–5 days per week",
  },
  {
    value: "active",
    label: "Active",
    description: "Hard exercise 6–7 days per week",
  },
  {
    value: "very_active",
    label: "Very active",
    description: "Hard daily exercise or physical job",
  },
] as const;

const GOALS = [
  {
    value: "lose",
    label: "Lose weight",
    description: "Reduce body fat with a calorie deficit",
  },
  {
    value: "maintain",
    label: "Maintain weight",
    description: "Eat to sustain your current weight",
  },
  {
    value: "gain",
    label: "Gain muscle",
    description: "Build muscle with a calorie surplus",
  },
] as const;

const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Gluten-free",
  "Dairy-free",
  "Halal",
  "Kosher",
  "No pork",
  "No shellfish",
] as const;

const initialState: HealthProfileFormState = { errors: {} };

export function HealthProfileForm({
  saveAction,
  defaultValues,
  submitLabel,
  successContent,
}: HealthProfileFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveAction,
    initialState
  );

  const errors = state?.errors ?? {};
  const dv = defaultValues;

  return (
    <form action={formAction} className="space-y-8" noValidate>
      {/* Success banner — injected by parent, rendered when save succeeds */}
      {state?.success && successContent}

      {/* Root error banner */}
      {errors._root && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3">
          <p className="text-sm text-danger">{errors._root}</p>
        </div>
      )}

      {/* Age */}
      <div className="space-y-2">
        <Label htmlFor="age">Age</Label>
        <Input
          id="age"
          name="age"
          type="number"
          min={16}
          max={100}
          placeholder="e.g. 32"
          defaultValue={dv?.age ?? ""}
          className={errors.age ? "border-danger" : ""}
        />
        {errors.age && (
          <p className="text-xs text-danger">{errors.age}</p>
        )}
      </div>

      {/* Biological Sex */}
      <div className="space-y-3">
        <div>
          <Label>Biological sex</Label>
          <p className="text-xs text-text-secondary mt-1">
            Used for BMR calculation. Select the option that matches your
            biological sex.
          </p>
        </div>
        <div className="flex gap-3">
          {(["male", "female"] as const).map((value) => (
            <label
              key={value}
              className="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10"
            >
              <input
                type="radio"
                name="gender"
                value={value}
                defaultChecked={dv?.gender === value}
                className="accent-primary"
              />
              <span className="text-sm font-medium capitalize text-foreground">
                {value === "male" ? "Male" : "Female"}
              </span>
            </label>
          ))}
        </div>
        {errors.gender && (
          <p className="text-xs text-danger">{errors.gender}</p>
        )}
      </div>

      {/* Weight */}
      <div className="space-y-2">
        <Label htmlFor="weight_kg">Weight</Label>
        <div className="relative">
          <Input
            id="weight_kg"
            name="weight_kg"
            type="number"
            min={30}
            max={300}
            step={0.1}
            placeholder="e.g. 75"
            defaultValue={dv?.weight_kg ?? ""}
            className={`pr-12 ${errors.weight_kg ? "border-danger" : ""}`}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-text-secondary">
            kg
          </span>
        </div>
        {errors.weight_kg && (
          <p className="text-xs text-danger">{errors.weight_kg}</p>
        )}
      </div>

      {/* Height */}
      <div className="space-y-2">
        <Label htmlFor="height_cm">Height</Label>
        <div className="relative">
          <Input
            id="height_cm"
            name="height_cm"
            type="number"
            min={100}
            max={250}
            step={0.1}
            placeholder="e.g. 170"
            defaultValue={dv?.height_cm ?? ""}
            className={`pr-12 ${errors.height_cm ? "border-danger" : ""}`}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-text-secondary">
            cm
          </span>
        </div>
        {errors.height_cm && (
          <p className="text-xs text-danger">{errors.height_cm}</p>
        )}
      </div>

      {/* Activity Level */}
      <div className="space-y-3">
        <Label>How active are you day to day?</Label>
        <div className="space-y-2">
          {ACTIVITY_LEVELS.map(({ value, label, description }) => (
            <label
              key={value}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10"
            >
              <input
                type="radio"
                name="activity_level"
                value={value}
                defaultChecked={dv?.activity_level === value}
                className="mt-0.5 accent-primary"
              />
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-text-secondary">{description}</p>
              </div>
            </label>
          ))}
        </div>
        {errors.activity_level && (
          <p className="text-xs text-danger">{errors.activity_level}</p>
        )}
      </div>

      {/* Goal */}
      <div className="space-y-3">
        <Label>What is your goal?</Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {GOALS.map(({ value, label, description }) => (
            <label
              key={value}
              className="flex cursor-pointer flex-col gap-1 rounded-lg border border-border bg-surface px-4 py-4 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10"
            >
              <input
                type="radio"
                name="goal"
                value={value}
                defaultChecked={dv?.goal === value}
                className="sr-only"
              />
              <span className="text-sm font-semibold text-foreground">
                {label}
              </span>
              <span className="text-xs text-text-secondary">{description}</span>
            </label>
          ))}
        </div>
        {errors.goal && (
          <p className="text-xs text-danger">{errors.goal}</p>
        )}
      </div>

      {/* Dietary Preferences */}
      <div className="space-y-3">
        <div>
          <Label>Any dietary preferences?</Label>
          <p className="text-xs text-text-secondary mt-1">
            Optional — select all that apply
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {DIETARY_OPTIONS.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary"
            >
              <input
                type="checkbox"
                name="dietary_preferences"
                value={option}
                defaultChecked={dv?.dietary_preferences?.includes(option) ?? false}
                className="sr-only"
              />
              {option}
            </label>
          ))}
        </div>
        {errors.dietary_preferences && (
          <p className="text-xs text-danger">{errors.dietary_preferences}</p>
        )}
      </div>

      {/* Submit */}
      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? "Saving…" : (submitLabel ?? "Save and continue")}
      </Button>
    </form>
  );
}
