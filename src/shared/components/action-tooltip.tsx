"use client";

import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";

/**
 * Reusable tooltip wrapper for action buttons.
 *
 * @description Combines TooltipProvider + Tooltip + TooltipTrigger + TooltipContent
 * into a single component for easy use on icon buttons and action elements.
 *
 * @param props.children - The trigger element (button, icon, etc.)
 * @param props.content - Tooltip text to display on hover
 * @param props.side - Tooltip placement side (default: "bottom")
 *
 * @example
 * <ActionTooltip content="Create issue">
 *   <Button size="icon"><Plus /></Button>
 * </ActionTooltip>
 */
export function ActionTooltip({
  children,
  content,
  side = "bottom",
}: {
  children: ReactNode;
  content: string;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side}>{content}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
