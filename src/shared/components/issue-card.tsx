"use client";

import Link from "next/link";
import { Card } from "@/shared/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { StatusBadge, type StatusCategory } from "@/shared/components/status-badge";
import { PriorityIcon, type PriorityLevel } from "@/shared/components/priority-icon";
import { cn } from "@/shared/lib/utils";

/**
 * Issue data required by the IssueCard component.
 */
export interface IssueCardData {
  id: string;
  key: string;
  summary: string;
  status: {
    name: string;
    category: StatusCategory;
  };
  priority?: {
    name: string;
  };
  assignee?: {
    name: string | null;
    image?: string | null;
  } | null;
  issueType?: {
    name: string;
  };
}

interface IssueCardProps {
  /** Issue data to display */
  issue: IssueCardData;
  /** Whether this card is being used in a board column (compact) or list view */
  variant?: "board" | "list";
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Extracts initials from a user's display name.
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
 * Maps a priority name from the database to the PriorityLevel type.
 */
function toPriorityLevel(name: string): PriorityLevel {
  const normalized = name.toLowerCase() as PriorityLevel;
  const validLevels: PriorityLevel[] = ["highest", "high", "medium", "low", "lowest"];
  return validLevels.includes(normalized) ? normalized : "medium";
}

/**
 * IssueCard renders a card representation of an issue.
 *
 * @description Used in both board columns (compact) and list views.
 * Shows key, summary, status, priority, and assignee avatar.
 * @param props - IssueCardProps
 * @returns A clickable card linking to the issue detail page
 *
 * @example
 * <IssueCard issue={issueData} variant="board" />
 */
export function IssueCard({
  issue,
  variant = "board",
  className,
}: IssueCardProps) {
  return (
    <Link
      href={`/issues/${issue.key}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
      aria-label={`${issue.key}: ${issue.summary}`}
    >
      <Card
        className={cn(
          "cursor-pointer transition-shadow hover:shadow-md",
          variant === "board" ? "p-3" : "px-4 py-3",
          className,
        )}
      >
        <div className="flex flex-col gap-2">
          {/* Header: Key + Priority */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
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
          <p
            className={cn(
              "text-sm font-medium leading-snug text-foreground",
              variant === "board" && "line-clamp-2",
            )}
          >
            {issue.summary}
          </p>

          {/* Footer: Status badge */}
          <div className="flex items-center gap-2">
            <StatusBadge
              name={issue.status.name}
              category={issue.status.category}
            />
            {issue.issueType && (
              <span className="text-xs text-muted-foreground">
                {issue.issueType.name}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
