"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  ArrowLeft,
  MessageSquare,
  Clock,
  Paperclip,
  Pencil,
  Check,
  X,
  GitBranch,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Separator } from "@/shared/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { StatusBadge, type StatusCategory } from "@/shared/components/status-badge";
import { PriorityIcon, type PriorityLevel } from "@/shared/components/priority-icon";
import { EmptyState } from "@/shared/components/empty-state";
import { IssueComments } from "./IssueComments";
import { IssueTransitions } from "./IssueTransitions";
import { DevelopmentPanel } from "./DevelopmentPanel";
import { trpc } from "@/shared/lib/trpc";
import { cn } from "@/shared/lib/utils";

interface IssueDetailProps {
  /** The issue key to fetch (e.g., "PROJ-123") */
  issueKey: string;
  /** Optional additional CSS classes */
  className?: string;
}

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
 * IssueDetail renders the full issue detail view with editable fields.
 *
 * @description Displays the complete issue with:
 * - Left panel: key, inline-editable summary, editable description, child issues list
 * - Right sidebar: status (with transition buttons), assignee, reporter, priority,
 *   type, labels, dates, watchers
 * - Activity tabs: comments and history
 * Uses tRPC issue.getByKey query and issue.update mutation.
 * @param props - IssueDetailProps
 * @returns The full issue detail page content
 *
 * @example
 * <IssueDetail issueKey="PROJ-123" />
 */
export function IssueDetail({ issueKey, className }: IssueDetailProps) {
  const t = useTranslations("issues");

  const {
    data: issue,
    isLoading,
    error,
    refetch,
  } = trpc.issue.getByKey.useQuery(
    { key: issueKey },
    { enabled: !!issueKey },
  );

  if (isLoading) {
    return <IssueDetailSkeleton />;
  }

  if (error || !issue) {
    return (
      <div className="flex-1 p-6">
        <EmptyState
          title={t("notFound")}
          description={t("notFoundDescription")}
          action={
            <Button asChild variant="outline">
              <Link href="/issues">
                <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
                {t("backToList")}
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className={cn("flex-1 overflow-auto", className)}>
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:flex-row">
        {/* Main content panel */}
        <div className="flex-1 space-y-6">
          {/* Issue header */}
          <IssueHeader issue={issue} />

          {/* Workflow transitions */}
          <IssueTransitions
            issueId={issue.id}
            currentStatusId={issue.statusId}
            onTransitioned={() => refetch()}
          />

          {/* Sidebar on mobile (above description) */}
          <div className="lg:hidden">
            <IssueSidebar issue={issue} />
          </div>

          <Separator />

          {/* Description */}
          <IssueDescription
            issueId={issue.id}
            description={issue.description}
          />

          {/* Child issues */}
          {issue.parent && (
            <>
              <Separator />
              <section aria-labelledby="parent-heading">
                <h2
                  id="parent-heading"
                  className="mb-2 text-sm font-semibold text-foreground"
                >
                  {t("parent")}
                </h2>
                <Link
                  href={`/issues/${issue.parent.key}`}
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <span className="font-medium">{issue.parent.key}</span>
                  <span>{issue.parent.summary}</span>
                </Link>
              </section>
            </>
          )}

          <Separator />

          {/* Activity tabs */}
          <Tabs defaultValue="comments" className="w-full">
            <TabsList className="w-full overflow-x-auto sm:w-auto">
              <TabsTrigger value="comments" className="gap-1.5">
                <MessageSquare className="size-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{t("tabs.comments")}</span>
                <span className="sm:hidden">{t("tabs.comments")}</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5">
                <Clock className="size-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{t("tabs.history")}</span>
                <span className="sm:hidden">{t("tabs.history")}</span>
              </TabsTrigger>
              <TabsTrigger value="attachments" className="gap-1.5">
                <Paperclip className="size-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{t("tabs.attachments")}</span>
                <span className="sm:hidden">{t("tabs.attachments")}</span>
              </TabsTrigger>
              <TabsTrigger value="development" className="gap-1.5">
                <GitBranch className="size-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{t("tabs.development")}</span>
                <span className="sm:hidden">{t("tabs.development")}</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="comments" className="mt-4">
              <IssueComments issueId={issue.id} />
            </TabsContent>
            <TabsContent value="history" className="mt-4">
              <EmptyState
                title={t("noHistory")}
                description={t("noHistoryDescription")}
                className="py-8"
              />
            </TabsContent>
            <TabsContent value="attachments" className="mt-4">
              <EmptyState
                title={t("noAttachments")}
                description={t("noAttachmentsDescription")}
                className="py-8"
              />
            </TabsContent>
            <TabsContent value="development" className="mt-4">
              <IssueDevelopmentTab issueId={issue.id} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right sidebar (desktop only — mobile version is rendered inline above) */}
        <div className="hidden lg:block">
          <IssueSidebar issue={issue} />
        </div>
      </div>
    </div>
  );
}

/**
 * Issue header with inline-editable summary.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function IssueHeader({ issue }: { issue: any }) {
  const t = useTranslations("issues");
  const tc = useTranslations("common");
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summaryValue, setSummaryValue] = useState(issue.summary ?? "");

  const utils = trpc.useUtils();

  const updateMutation = trpc.issue.update.useMutation({
    onSuccess: () => {
      utils.issue.getByKey.invalidate({ key: issue.key });
      setIsEditingSummary(false);
    },
  });

  const handleSaveSummary = useCallback(() => {
    if (!summaryValue.trim() || summaryValue === issue.summary) {
      setIsEditingSummary(false);
      setSummaryValue(issue.summary);
      return;
    }
    updateMutation.mutate({ id: issue.id, summary: summaryValue.trim() });
  }, [summaryValue, issue.id, issue.summary, updateMutation]);

  const handleCancelSummary = useCallback(() => {
    setSummaryValue(issue.summary);
    setIsEditingSummary(false);
  }, [issue.summary]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="size-8">
          <Link href="/issues" aria-label={t("backToList")}>
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Link>
        </Button>
        <span className="text-sm font-medium text-muted-foreground">
          {issue.key}
        </span>
      </div>

      {/* Inline editable summary */}
      {isEditingSummary ? (
        <div className="flex items-center gap-2">
          <Input
            value={summaryValue}
            onChange={(e) => setSummaryValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveSummary();
              if (e.key === "Escape") handleCancelSummary();
            }}
            className="text-2xl font-bold"
            autoFocus
            aria-label={t("fields.summary")}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSaveSummary}
            disabled={updateMutation.isPending}
            aria-label={tc("save")}
          >
            <Check className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancelSummary}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <div className="group flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {issue.summary}
          </h1>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => setIsEditingSummary(true)}
            aria-label={t("editIssue")}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2">
        {issue.status && (
          <StatusBadge
            name={issue.status.name}
            category={issue.status.category as StatusCategory}
          />
        )}
        {issue.priority && (
          <PriorityIcon
            priority={toPriorityLevel(issue.priority.name)}
            showLabel
          />
        )}
        {issue.issueType && (
          <span className="text-xs text-muted-foreground">
            {issue.issueType.name}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Editable description section.
 */
function IssueDescription({
  issueId,
  description,
}: {
  issueId: string;
  description: string | null;
}) {
  const t = useTranslations("issues");
  const tc = useTranslations("common");
  const [isEditing, setIsEditing] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState(description ?? "");

  const utils = trpc.useUtils();

  const updateMutation = trpc.issue.update.useMutation({
    onSuccess: () => {
      utils.issue.getByKey.invalidate();
      setIsEditing(false);
    },
  });

  const handleSave = useCallback(() => {
    const newDesc = descriptionValue.trim() || null;
    if (newDesc === description) {
      setIsEditing(false);
      return;
    }
    updateMutation.mutate({ id: issueId, description: newDesc });
  }, [descriptionValue, description, issueId, updateMutation]);

  const handleCancel = useCallback(() => {
    setDescriptionValue(description ?? "");
    setIsEditing(false);
  }, [description]);

  return (
    <section aria-labelledby="description-heading">
      <div className="mb-2 flex items-center justify-between">
        <h2
          id="description-heading"
          className="text-sm font-semibold text-foreground"
        >
          {t("fields.description")}
        </h2>
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-7 text-xs"
          >
            <Pencil className="mr-1.5 size-3" aria-hidden="true" />
            {tc("edit")}
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={descriptionValue}
            onChange={(e) => setDescriptionValue(e.target.value)}
            placeholder={t("fields.descriptionPlaceholder")}
            rows={6}
            autoFocus
            aria-label={t("fields.description")}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {tc("save")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={updateMutation.isPending}
            >
              {tc("cancel")}
            </Button>
          </div>
        </div>
      ) : description ? (
        <div
          className="prose prose-sm dark:prose-invert max-w-none cursor-pointer rounded-md border bg-muted/30 p-4 hover:bg-muted/50 transition-colors"
          onClick={() => setIsEditing(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setIsEditing(true);
          }}
          role="button"
          tabIndex={0}
          aria-label={t("fields.description")}
        >
          <p>{description}</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="w-full rounded-md border border-dashed p-4 text-sm italic text-muted-foreground hover:bg-muted/30 transition-colors text-start"
          aria-label={t("fields.descriptionPlaceholder")}
        >
          {t("noDescription")}
        </button>
      )}
    </section>
  );
}

/**
 * Right sidebar with issue metadata fields.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function IssueSidebar({ issue }: { issue: any }) {
  const t = useTranslations("issues");

  return (
    <aside
      className="w-full shrink-0 space-y-4 lg:w-72"
      aria-label={t("detailsSidebar")}
    >
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          {t("details")}
        </h3>
        <dl className="space-y-3 text-sm">
          {/* Status */}
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{t("fields.status")}</dt>
            <dd>
              {issue.status ? (
                <StatusBadge
                  name={issue.status.name}
                  category={issue.status.category as StatusCategory}
                />
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </dd>
          </div>

          {/* Assignee */}
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{t("fields.assignee")}</dt>
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
            <dt className="text-muted-foreground">{t("fields.reporter")}</dt>
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

          <Separator />

          {/* Priority */}
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{t("fields.priority")}</dt>
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

          <Separator />

          {/* Dates */}
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{t("fields.created")}</dt>
            <dd className="text-foreground">
              {issue.createdAt
                ? new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                  }).format(new Date(issue.createdAt))
                : "-"}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{t("fields.updated")}</dt>
            <dd className="text-foreground">
              {issue.updatedAt
                ? new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                  }).format(new Date(issue.updatedAt))
                : "-"}
            </dd>
          </div>
          {issue.dueDate && (
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">{t("fields.dueDate")}</dt>
              <dd className="text-foreground">
                {new Intl.DateTimeFormat("en", {
                  dateStyle: "medium",
                }).format(new Date(issue.dueDate))}
              </dd>
            </div>
          )}

          {/* Story Points */}
          {issue.storyPoints != null && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">
                  {t("fields.storyPoints")}
                </dt>
                <dd className="text-foreground">{issue.storyPoints}</dd>
              </div>
            </>
          )}

          {/* Labels */}
          {issue.labels && issue.labels.length > 0 && (
            <>
              <Separator />
              <div>
                <dt className="mb-1 text-muted-foreground">
                  {t("fields.labels")}
                </dt>
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
            </>
          )}

          {/* Watchers */}
          <Separator />
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{t("watchers")}</dt>
            <dd className="text-foreground text-xs">
              {issue.watchers?.length ?? 0}
            </dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}

/**
 * Development tab showing GitHub links for the issue.
 */
function IssueDevelopmentTab({ issueId }: { issueId: string }) {
  const { data: links = [] } = trpc.integration.getLinksForIssue.useQuery(
    { issueId },
    { enabled: !!issueId },
  );

  const utils = trpc.useUtils();
  const deleteLinkMutation = trpc.integration.deleteLink.useMutation({
    onSuccess: () => {
      utils.integration.getLinksForIssue.invalidate({ issueId });
    },
  });

  const mappedLinks = links.map((link) => ({
    ...link,
    resourceType: link.resourceType as "pull_request" | "branch" | "commit",
    createdAt: link.createdAt instanceof Date ? link.createdAt.toISOString() : String(link.createdAt),
  }));

  return (
    <DevelopmentPanel
      links={mappedLinks}
      onDeleteLink={(linkId) => deleteLinkMutation.mutate({ linkId })}
    />
  );
}

/**
 * Skeleton loading state for the issue detail page.
 */
function IssueDetailSkeleton() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="flex flex-col gap-6 p-6 lg:flex-row">
        <div className="flex-1 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-96" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-7 w-24" />
          </div>
          <Separator />
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-32 w-full rounded-md" />
          </div>
        </div>
        <aside className="w-full shrink-0 lg:w-72">
          <div className="space-y-3 rounded-lg border p-4">
            <Skeleton className="h-4 w-16" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
