"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MealCard } from "@/components/app/meal-card";

export interface MealWithImageUrl {
  id: string;
  day: number;
  meal_type: "breakfast" | "lunch" | "dinner";
  name: string;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  image_file_id: string | null;
  imageUrl: string | null;
}

export interface DayTab {
  dayNumber: number;
  label: string;
  meals: MealWithImageUrl[];
}

interface MealPlanTabsProps {
  days: DayTab[];
  className?: string;
}

export function MealPlanTabs({ days, className }: MealPlanTabsProps) {
  return (
    <Tabs defaultValue="1" className={className}>
      <TabsList className="flex w-full overflow-x-auto">
        {days.map((d) => (
          <TabsTrigger
            key={d.dayNumber}
            value={String(d.dayNumber)}
            className="flex-1"
          >
            {d.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {days.map((d) => (
        <TabsContent key={d.dayNumber} value={String(d.dayNumber)}>
          <div className="space-y-4 mt-4">
            {d.meals.map((meal) => (
              <MealCard
                key={meal.id}
                mealType={meal.meal_type}
                name={meal.name}
                description={meal.description}
                calories={meal.calories}
                proteinG={meal.protein_g}
                carbsG={meal.carbs_g}
                fatG={meal.fat_g}
                imageUrl={meal.imageUrl}
              />
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
