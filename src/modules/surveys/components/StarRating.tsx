/**
 * Reusable star rating component.
 *
 * @description Supports both display-only and interactive modes.
 * In interactive mode, stars are clickable to set a rating value.
 * Uses accessible ARIA attributes and keyboard navigation.
 *
 * @module StarRating
 */

"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface StarRatingProps {
  /** Current rating value (1-5) */
  value: number;
  /** Called when rating changes (interactive mode only) */
  onChange?: (value: number) => void;
  /** Whether the component is read-only */
  readonly?: boolean;
  /** Size class for the stars */
  size?: "sm" | "md" | "lg";
  /** Optional CSS class */
  className?: string;
  /** Accessible label */
  label?: string;
}

const sizeMap = {
  sm: "size-4",
  md: "size-5",
  lg: "size-7",
};

/**
 * StarRating displays 1-5 stars for rating display or input.
 *
 * @param props - StarRatingProps
 * @returns A star rating component
 *
 * @example
 * <StarRating value={4} onChange={setRating} />
 * <StarRating value={3.5} readonly />
 */
export function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
  className,
  label,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);
  const interactive = !readonly && !!onChange;

  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      role={interactive ? "radiogroup" : "img"}
      aria-label={label ?? `${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = interactive
          ? star <= (hoverValue || value)
          : star <= Math.round(value);

        return interactive ? (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === value}
            aria-label={`${star} star${star !== 1 ? "s" : ""}`}
            className={cn(
              "rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "hover:scale-110 active:scale-95",
            )}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHoverValue(star)}
            onMouseLeave={() => setHoverValue(0)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" && star < 5) onChange(star + 1);
              if (e.key === "ArrowLeft" && star > 1) onChange(star - 1);
            }}
          >
            <Star
              className={cn(
                sizeMap[size],
                filled
                  ? "fill-amber-400 text-amber-400"
                  : "fill-none text-muted-foreground/40",
              )}
              aria-hidden="true"
            />
          </button>
        ) : (
          <Star
            key={star}
            className={cn(
              sizeMap[size],
              filled
                ? "fill-amber-400 text-amber-400"
                : "fill-none text-muted-foreground/40",
            )}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}
