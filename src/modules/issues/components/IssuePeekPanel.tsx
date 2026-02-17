"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  ExternalLink,
  Copy,
  Check,
  Pencil,
  X,
  MessageSquare,
  Clock,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/shared/components/ui/sheet";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Separator } from "@/shared/components/ui/separator";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { StatusBadge, type StatusCategory } from "@/shared/components/status-badge";
import { PriorityIcon, type PriorityLevel } from "@/shared/components/priority-icon";
import { EmptyState } from "@/shared/components/empty-state";
import { IssueTransitions } from "./IssueTransitions";
import { trpc } from "@/shared/lib/trpc";

import { usePeek } from "@/shared/providers/peek-provider";

/**
 * Maps a priority name to the PriorityLevel type.
 * Falls back to "medium" for unknown values.
 */
function toPriorityLevel(name: string): PriorityLevel {
  const normalized = name.toLowerCase() as PriorityLevel;
  const validLevels: PriorityLevel[] = ["highest", "high", "medium", "low", "lowest"];
  return validLevels.includes(normalized) ? normalized : "medium";
}

/**
 * Extracts initials from a user display name.
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
 * Formats a date as a relative or absolute timestamp.
 */
function formatTimestamp(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

/**
 * IssuePeekPanel renders a slide-over Sheet from the right side showing
 * a compact preview of an issue.
 *
 * @description Opens automatically when peekIssueId is set in the PeekContext.
 * Shows issue key, editable summary, status with transition buttons, priority,
 * type, assignee, reporter, sprint, story points, due date, labels, description
 * (read-only), recent comments (last 3), and recent activity (last 5).
 * Header actions include "Open full page", "Copy issue key", and Close.
 *
 * Uses tRPC queries:
 * - issue.getById for issue data
 * - issue.listComments for recent comments (limit 3)
 * - issue.getHistory for activity (limit 5)
 *
 * @returns The slide-over peek panel, rendered at the layout level
 *
 * @example
 * // Rendered once in the app layout:
 * <IssuePeekPanel />
 */
export function IssuePeekPanel() {
  const { peekIssueId, closePeek } = usePeek();
  const isOpen = peekIssueId !== null;

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closePeek();
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] overflow-y-auto p-0"
        showCloseButton={false}
      >
        {peekIssueId ? (
          <PeekPanelContent issueId={peekIssueId} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

/**
 * Inner content of the peek panel, loaded when an issue ID is set.
 */
function PeekPanelContent({ issueId }: { issueId: string }) {
  const t = useTranslations("issues");
  const tp = useTranslations("issuePeek");
  const tc = useTranslations("common");
  const { closePeek } = usePeek();

  const [copiedKey, setCopiedKey] = useState(false);

  const {
    data: issue,
    isLoading,
    error,
    refetch,
  } = trpc.issue.getById.useQuery(
    { id: issueId },
    { enabled: !!issueId },
  );

  const {
    data: commentsData,
  } = trpc.issue.listComments.useQuery(
    { issueId, limit: 3 },
    { enabled: !!issueId },
  );

  const {
    data: historyData,
  } = trpc.issue.getHistory.useQuery(
    { issueId, limit: 5 },
    { enabled: !!issueId },
  );

  const handleCopyKey = useCallback(() => {
    if (!issue?.key) return;
    void navigator.clipboard.writeText(issue.key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }, [issue?.key]);

  if (isLoading) {
    return <PeekPanelSkeleton />;
  }

  if (error || !issue) {
    return (
      <div className="p-6">
        <EmptyState
          title={t("notFound")}
          description={t("notFoundDescription")}
        />
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comments = (commentsData as any)?.items ?? commentsData ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const history = (historyData as any)?.items ?? historyData ?? [];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <SheetHeader className="flex-shrink-0 border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <SheetTitle className="text-sm font-medium text-muted-foreground">
            {issue.key}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {t("details")}
          </SheetDescription>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={handleCopyKey}
              aria-label={tp("copyKey")}
            >
              {copiedKey ? (
                <Check className="size-4 text-green-600" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              asChild
            >
              <Link
                href={`/issues/${issue.key}`}
                aria-label={tp("openFullPage")}
                onClick={() => closePeek()}
              >
                <ExternalLink className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={closePeek}
              aria-label={tc("close")}
              data-testid="peek-close-button"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </SheetHeader>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Summary */}
        <div className="px-4 pt-4">
          <PeekSummary issue={issue} />
        </div>

        {/* Status + transitions */}
        <div className="px-4 pt-3">
          <div className="flex items-center gap-2">
            {issue.status && (
              <StatusBadge
                name={issue.status.name}
                category={issue.status.category as StatusCategory}
              />
            )}
          </div>
          <div className="mt-2">
            <IssueTransitions
              issueId={issue.id}
              currentStatusId={issue.statusId}
              onTransitioned={() => refetch()}
            />
          </div>
        </div>

        <div className="px-4 pt-3">
          <Separator />
        </div>

        {/* Details fields */}
        <div className="px-4 pt-3">
          <PeekFields issue={issue} />
        </div>

        <div className="px-4 pt-3">
          <Separator />
        </div>

        {/* Description */}
        <div className="px-4 pt-3">
          <PeekDescription description={issue.description} issueKey={issue.key} />
        </div>

        <div className="px-4 pt-3">
          <Separator />
        </div>

        {/* Recent comments */}
        <div className="px-4 pt-3">
          <PeekComments
            comments={Array.isArray(comments) ? comments : []}
            issueKey={issue.key}
          />
        </div>

        <div className="px-4 pt-3">
          <Separator />
        </div>

        {/* Recent activity */}
        <div className="px-4 pb-6 pt-3">
          <PeekActivity
            history={Array.isArray(history) ? history : []}
            issueKey={issue.key}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Editable summary in the peek panel.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PeekSummary({ issue }: { issue: any }) {
  const t = useTranslations("issues");
  const tc = useTranslations("common");
  const [isEditing, setIsEditing] = useState(false);
  const [summaryValue, setSummaryValue] = useState(issue.summary ?? "");

  const utils = trpc.useUtils();

  const updateMutation = trpc.issue.update.useMutation({
    onSuccess: () => {
      utils.issue.getById.invalidate({ id: issue.id });
      setIsEditing(false);
    },
  });

  const handleSave = useCallback(() => {
    if (!summaryValue.trim() || summaryValue === issue.summary) {
      setIsEditing(false);
      setSummaryValue(issue.summary);
      return;
    }
    updateMutation.mutate({ id: issue.id, summary: summaryValue.trim() });
  }, [summaryValue, issue.id, issue.summary, updateMutation]);

  const handleCancel = useCallback(() => {
    setSummaryValue(issue.summary);
    setIsEditing(false);
  }, [issue.summary]);

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={summaryValue}
          onChange={(e) => setSummaryValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
          className="text-lg font-semibold"
          autoFocus
          aria-label={t("fields.summary")}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSave}
          disabled={updateMutation.isPending}
          aria-label={tc("save")}
          className="size-7"
        >
          <Check className="size-3.5" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          className="size-7"
        >
          <X className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-2">
      <h2 className="text-lg font-semibold leading-snug text-foreground">
        {issue.summary}
      </h2>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={() => setIsEditing(true)}
        aria-label={t("editIssue")}
      >
        <Pencil className="size-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
}

/**
 * Compact detail fields for the peek panel.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PeekFields({ issue }: { issue: any }) {
  const t = useTranslations("issues");

  return (
    <dl className="space-y-2.5 text-sm">
      {/* Priority */}
      <div className="flex items-center justify-between">
        <dt className="text-muted-foreground">{t("priority")}</dt>
        <dd>
          {issue.priority ? (
            <PriorityIcon
              priority={toPriorityLevel(issue.priority.name)}
              showLabel
            />
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </dd>
      </div>

      {/* Type */}
      <div className="flex items-center justify-between">
        <dt className="text-muted-foreground">{t("type")}</dt>
        <dd className="text-foreground">
          {issue.issueType?.name ?? "-"}
        </dd>
      </div>

      {/* Assignee */}
      <div className="flex items-center justify-between">
        <dt className="text-muted-foreground">{t("assignee")}</dt>
        <dd>
          {issue.assignee ? (
            <div className="flex items-center gap-1.5">
              <Avatar className="size-5">
                <AvatarImage
                  src={issue.assignee.image ?? undefined}
                  alt={issue.assignee.name ?? ""}
                />
                <AvatarFallback className="text-[9px]">
                  {getInitials(issue.assignee.name)}
                </AvatarFallback>
              </Avatar>
              <span>{issue.assignee.name ?? t("unassigned")}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{t("unassigned")}</span>
          )}
        </dd>
      </div>

      {/* Reporter */}
      <div className="flex items-center justify-between">
        <dt className="text-muted-foreground">{t("reporter")}</dt>
        <dd>
          {issue.reporter ? (
            <div className="flex items-center gap-1.5">
              <Avatar className="size-5">
                <AvatarImage
                  src={issue.reporter.image ?? undefined}
                  alt={issue.reporter.name ?? ""}
                />
                <AvatarFallback className="text-[9px]">
                  {getInitials(issue.reporter.name)}
                </AvatarFallback>
              </Avatar>
              <span>{issue.reporter.name ?? "-"}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </dd>
      </div>

      {/* Sprint */}
      {issue.sprint && (
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">{t("fields.summary").replace("Summary", "Sprint")}</dt>
          <dd className="text-foreground">{issue.sprint.name}</dd>
        </div>
      )}

      {/* Story Points */}
      {issue.storyPoints != null && (
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">{t("storyPoints")}</dt>
          <dd className="text-foreground">{issue.storyPoints}</dd>
        </div>
      )}

      {/* Due Date */}
      {issue.dueDate && (
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">{t("dueDate")}</dt>
          <dd className="text-foreground">
            {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
              new Date(issue.dueDate),
            )}
          </dd>
        </div>
      )}

      {/* Labels */}
      {issue.labels && issue.labels.length > 0 && (
        <div>
          <dt className="mb-1 text-muted-foreground">{t("labels")}</dt>
          <dd className="flex flex-wrap gap-1">
            {issue.labels.map((label: string) => (
              <span
                key={label}
                className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {label}
              </span>
            ))}
          </dd>
        </div>
      )}
    </dl>
  );
}

/**
 * Read-only description section with an edit link.
 */
function PeekDescription({
  description,
  issueKey,
}: {
  description: string | null;
  issueKey: string;
}) {
  const t = useTranslations("issues");
  const tc = useTranslations("common");

  return (
    <section aria-labelledby="peek-description-heading">
      <div className="mb-2 flex items-center justify-between">
        <h3
          id="peek-description-heading"
          className="text-sm font-semibold text-foreground"
        >
          {t("description")}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          asChild
        >
          <Link href={`/issues/${issueKey}`}>
            <Pencil className="mr-1.5 size-3" aria-hidden="true" />
            {tc("edit")}
          </Link>
        </Button>
      </div>
      {description ? (
        <div className="prose prose-sm dark:prose-invert max-w-none rounded-md border bg-muted/30 p-3 text-sm">
          <p>{description}</p>
        </div>
      ) : (
        <p className="text-sm italic text-muted-foreground">
          {t("noDescription")}
        </p>
      )}
    </section>
  );
}

/**
 * Recent comments section (last 3).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PeekComments({ comments, issueKey }: { comments: any[]; issueKey: string }) {
  const tp = useTranslations("issuePeek");

  return (
    <section aria-labelledby="peek-comments-heading">
      <div className="mb-2 flex items-center justify-between">
        <h3
          id="peek-comments-heading"
          className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
        >
          <MessageSquare className="size-3.5" aria-hidden="true" />
          {tp("recentComments")}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          asChild
        >
          <Link href={`/issues/${issueKey}`}>
            {tp("viewAllComments")}
          </Link>
        </Button>
      </div>
      {comments.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          {tp("noComments")}
        </p>
      ) : (
        <div className="space-y-3" role="list" aria-label={tp("recentComments")}>
          {comments.map((comment) => (
            <article
              key={comment.id}
              className="flex gap-2"
              role="listitem"
            >
              <Avatar className="size-6 shrink-0">
                <AvatarImage
                  src={comment.author?.image ?? undefined}
                  alt={comment.author?.name ?? ""}
                />
                <AvatarFallback className="text-[9px]">
                  {getInitials(comment.author?.name ?? null)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-foreground">
                    {comment.author?.name ?? "Unknown"}
                  </span>
                  <time
                    className="text-[10px] text-muted-foreground"
                    dateTime={
                      comment.createdAt
                        ? new Date(comment.createdAt).toISOString()
                        : undefined
                    }
                  >
                    {comment.createdAt ? formatTimestamp(comment.createdAt) : ""}
                  </time>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {comment.body}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Recent activity / history section (last 5).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PeekActivity({ history, issueKey }: { history: any[]; issueKey: string }) {
  const tp = useTranslations("issuePeek");

  return (
    <section aria-labelledby="peek-activity-heading">
      <div className="mb-2 flex items-center justify-between">
        <h3
          id="peek-activity-heading"
          className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
        >
          <Clock className="size-3.5" aria-hidden="true" />
          {tp("recentActivity")}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          asChild
        >
          <Link href={`/issues/${issueKey}`}>
            {tp("viewFullHistory")}
          </Link>
        </Button>
      </div>
      {history.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          {tp("noActivity")}
        </p>
      ) : (
        <div className="space-y-2" role="list" aria-label={tp("recentActivity")}>
          {history.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-2 text-xs"
              role="listitem"
            >
              <div className="mt-0.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
              <div className="min-w-0 flex-1">
                <span className="font-medium text-foreground">
                  {entry.user?.name ?? "System"}
                </span>{" "}
                <span className="text-muted-foreground">
                  {entry.field ? `changed ${entry.field}` : "updated"}
                </span>
                {entry.fromValue && entry.toValue && (
                  <span className="text-muted-foreground">
                    {" "}
                    from{" "}
                    <span className="font-medium line-through">
                      {entry.fromValue}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium">{entry.toValue}</span>
                  </span>
                )}
                <time
                  className="ml-1 text-[10px] text-muted-foreground/60"
                  dateTime={
                    entry.createdAt
                      ? new Date(entry.createdAt).toISOString()
                      : undefined
                  }
                >
                  {entry.createdAt ? formatTimestamp(entry.createdAt) : ""}
                </time>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Skeleton loading state for the peek panel.
 */
function PeekPanelSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <Skeleton className="h-5 w-20" />
        <div className="flex gap-1">
          <Skeleton className="size-8 rounded" />
          <Skeleton className="size-8 rounded" />
          <Skeleton className="size-8 rounded" />
        </div>
      </div>
      <div className="flex-1 space-y-4 px-4 pt-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-5 w-24 rounded-full" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-7 w-24" />
        </div>
        <Separator />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
        <Separator />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-20 w-full rounded-md" />
        <Separator />
        <Skeleton className="h-4 w-32" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-2">
              <Skeleton className="size-6 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
