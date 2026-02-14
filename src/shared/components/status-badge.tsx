"use client";

import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

/**
 * Status category determines the visual style of a status badge.
 * Maps to workflow status categories in the Ordolix data model.
 */
export type StatusCategory = "TO_DO" | "IN_PROGRESS" | "DONE";

interface StatusBadgeProps {
  /** Display name of the status */
  name: string;
  /** Status category for color coding */
  category: StatusCategory;
  /** Optional additional CSS classes */
  className?: string;
}

const categoryStyles: Record<StatusCategory, string> = {
  TO_DO:
    "bg-muted text-muted-foreground hover:bg-muted/80 border-transparent",
  IN_PROGRESS:
    "bg-blue-100 text-blue-800 hover:bg-blue-100/80 border-transparent dark:bg-blue-900/30 dark:text-blue-400",
  DONE:
    "bg-green-100 text-green-800 hover:bg-green-100/80 border-transparent dark:bg-green-900/30 dark:text-green-400",
};

/**
 * StatusBadge renders a color-coded badge based on the workflow status category.
 *
 * @description TO_DO = gray, IN_PROGRESS = blue, DONE = green
 * @param props - StatusBadgeProps
 * @returns A styled badge component
 *
 * @example
 * <StatusBadge name="In Progress" category="IN_PROGRESS" />
 */
export function StatusBadge({ name, category, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium uppercase tracking-wide",
        categoryStyles[category],
        className,
      )}
    >
      {name}
    </Badge>
  );
}
