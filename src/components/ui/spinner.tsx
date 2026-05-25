import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
} as const;

export interface SpinnerProps {
  size?: keyof typeof sizeClasses;
  className?: string;
}

export function Spinner({ size = "sm", className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block animate-spin rounded-full border-primary border-t-transparent",
        sizeClasses[size],
        className
      )}
    />
  );
}
