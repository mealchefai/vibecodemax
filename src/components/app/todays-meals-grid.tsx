import { MealCard } from "@/components/app/meal-card";
import type { MealWithImageUrl } from "@/components/app/meal-plan-tabs";

interface TodaysMealsGridProps {
  meals: MealWithImageUrl[];
}

export function TodaysMealsGrid({ meals }: TodaysMealsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {meals.map((meal) => (
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
  );
}
