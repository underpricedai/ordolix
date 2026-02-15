"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { GripVertical } from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { PriorityIcon, type PriorityLevel } from "@/shared/components/priority-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/lib/utils";

/**
 * Data shape for an issue displayed on a board card.
 */
export interface BoardCardIssue {
  id: string;
  key: string;
  summary: string;
  statusId: string;
  priority?: {
    name: string;
  } | null;
  assignee?: {
    name: string | null;
    image?: string | null;
  } | null;
  issueType?: {
    name: string;
    icon?: string | null;
  } | null;
  labels?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

interface BoardCardProps {
  /** Issue data to render */
  issue: BoardCardIssue;
  /** Callback when drag starts */
  onDragStart?: (e: React.DragEvent, issue: BoardCardIssue) => void;
  /** Callback when drag ends */
  onDragEnd?: (e: React.DragEvent) => void;
  /** Callback when card is clicked (opens edit dialog) */
  onClick?: (issue: BoardCardIssue) => void;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Extracts initials from a display name for avatar fallback.
 */
function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Maps a priority name to the PriorityLevel type.
 */
function toPriorityLevel(name: string): PriorityLevel {
  const normalized = name.toLowerCase() as PriorityLevel;
  const validLevels: PriorityLevel[] = ["highest", "high", "medium", "low", "lowest"];
  return validLevels.includes(normalized) ? normalized : "medium";
}

/**
 * BoardCard renders a compact draggable issue card for the Kanban board.
 *
 * @description Shows issue key, summary, priority icon, assignee avatar,
 * issue type icon, and label color dots. Supports HTML drag and drop.
 * Clicking navigates to the issue detail page.
 *
 * @param props - BoardCardProps
 * @returns A draggable card component
 *
 * @example
 * <BoardCard issue={issueData} onDragStart={handleDragStart} />
 */
export function BoardCard({
  issue,
  onDragStart,
  onDragEnd,
  onClick,
  className,
}: BoardCardProps) {
  const t = useTranslations("boards");

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData("application/ordolix-issue", JSON.stringify({
        id: issue.id,
        key: issue.key,
        statusId: issue.statusId,
      }));
      e.dataTransfer.effectAllowed = "move";
      onDragStart?.(e, issue);
    },
    [issue, onDragStart],
  );

  const handleDragEnd = useCallback(
    (e: React.DragEvent) => {
      onDragEnd?.(e);
    },
    [onDragEnd],
  );

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      aria-label={t("dragIssue", { key: issue.key })}
      className="group/card cursor-grab active:cursor-grabbing"
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="block w-full text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
              aria-label={`${issue.key}: ${issue.summary}`}
              onClick={(e) => {
                if (e.defaultPrevented) return;
                onClick?.(issue);
              }}
            >
              <Card
                className={cn(
                  "p-3 transition-all hover:shadow-md dark:hover:shadow-lg",
                  "border border-border/50 hover:border-border",
                  "bg-card",
                  className,
                )}
              >
                <div className="flex flex-col gap-2">
                  {/* Header: drag handle + key + priority + assignee */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <GripVertical
                        className="size-3.5 shrink-0 text-muted-foreground/40 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover/card:opacity-100"
                        aria-hidden="true"
                      />
                      {issue.priority && (
                        <PriorityIcon priority={toPriorityLevel(issue.priority.name)} />
                      )}
                      <span className="text-xs font-medium text-muted-foreground">
                        {issue.key}
                      </span>
                    </div>
                    {issue.assignee && (
                      <Avatar className="size-6">
                        <AvatarImage
                          src={issue.assignee.image ?? undefined}
                          alt={issue.assignee.name ?? ""}
                        />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(issue.assignee.name)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>

                  {/* Summary */}
                  <p className="text-sm font-medium leading-snug text-foreground line-clamp-2">
                    {issue.summary}
                  </p>

                  {/* Footer: type + labels */}
                  <div className="flex items-center justify-between gap-2">
                    {issue.issueType && (
                      <span className="text-xs text-muted-foreground">
                        {issue.issueType.name}
                      </span>
                    )}
                    {issue.labels && issue.labels.length > 0 && (
                      <div className="flex items-center gap-1" aria-label="Labels">
                        {issue.labels.slice(0, 4).map((label) => (
                          <span
                            key={label.id}
                            className="size-2 rounded-full"
                            style={{ backgroundColor: label.color }}
                            title={label.name}
                            aria-label={label.name}
                          />
                        ))}
                        {issue.labels.length > 4 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{issue.labels.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <p>{issue.summary}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
