import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  badge?: {
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  children,
  className,
  badge,
  actions,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 pb-8 border-b", className)}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">
              {title}
            </h1>
            {badge && (
              <Badge variant={badge.variant || "default"}>{badge.label}</Badge>
            )}
          </div>
          {description && (
            <p className="text-text-secondary text-sm sm:text-base max-w-2xl">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex flex-col sm:flex-row gap-2">{actions}</div>
        )}
      </div>

      {children}
    </div>
  );
}
