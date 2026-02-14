"use client";

import {
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronsUp,
  ChevronsDown,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

/**
 * Priority levels matching the Ordolix issue priority model.
 */
export type PriorityLevel =
  | "highest"
  | "high"
  | "medium"
  | "low"
  | "lowest";

interface PriorityIconProps {
  /** The priority level to display */
  priority: PriorityLevel;
  /** Optional additional CSS classes */
  className?: string;
  /** Whether to show the priority label alongside the icon */
  showLabel?: boolean;
}

const priorityConfig: Record<
  PriorityLevel,
  { icon: React.ElementType; color: string; label: string }
> = {
  highest: {
    icon: ChevronsUp,
    color: "text-red-600 dark:text-red-400",
    label: "Highest",
  },
  high: {
    icon: ArrowUp,
    color: "text-orange-600 dark:text-orange-400",
    label: "High",
  },
  medium: {
    icon: Minus,
    color: "text-yellow-600 dark:text-yellow-400",
    label: "Medium",
  },
  low: {
    icon: ArrowDown,
    color: "text-blue-600 dark:text-blue-400",
    label: "Low",
  },
  lowest: {
    icon: ChevronsDown,
    color: "text-slate-500 dark:text-slate-400",
    label: "Lowest",
  },
};

/**
 * PriorityIcon renders an icon with color coding based on issue priority.
 *
 * @description Uses Lucide icons with colors: highest=red, high=orange, medium=yellow, low=blue, lowest=gray
 * @param props - PriorityIconProps
 * @returns An icon element with optional label
 *
 * @example
 * <PriorityIcon priority="high" />
 * <PriorityIcon priority="medium" showLabel />
 */
export function PriorityIcon({
  priority,
  className,
  showLabel = false,
}: PriorityIconProps) {
  const config = priorityConfig[priority];
  const Icon = config.icon;

  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      aria-label={`Priority: ${config.label}`}
    >
      <Icon className={cn("size-4 shrink-0", config.color)} aria-hidden="true" />
      {showLabel && (
        <span className={cn("text-sm", config.color)}>{config.label}</span>
      )}
    </span>
  );
}
