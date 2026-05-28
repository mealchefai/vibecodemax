import Image from "next/image";
import { UtensilsCrossed } from "lucide-react";

interface MealCardProps {
  mealType: string;
  name: string;
  description: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  imageUrl: string | null;
}

export function MealCard({
  mealType,
  name,
  description,
  calories,
  proteinG,
  carbsG,
  fatG,
  imageUrl,
}: MealCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow">
      {/* Image slot */}
      <div className="relative w-full aspect-video">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            unoptimized
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 672px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-1">
        <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">
          {mealType}
        </span>
        <p className="text-base font-semibold text-text-primary">{name}</p>
        <p className="text-sm text-text-secondary">{description}</p>

        {/* Macro row */}
        <div className="flex gap-4 pt-2 mt-2 border-t border-border">
          <div className="flex flex-col">
            <span className="text-xs text-text-secondary">Calories</span>
            <span className="text-sm font-semibold text-text-primary">
              {calories} kcal
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-text-secondary">Protein</span>
            <span className="text-sm font-semibold text-text-primary">
              {proteinG}g
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-text-secondary">Carbs</span>
            <span className="text-sm font-semibold text-text-primary">
              {carbsG}g
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-text-secondary">Fat</span>
            <span className="text-sm font-semibold text-text-primary">
              {fatG}g
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
