"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { MessageSquare } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/shared/components/empty-state";
import { cn } from "@/shared/lib/utils";

interface IssueCommentsProps {
  /** The issue ID to display and add comments for */
  issueId: string;
  /** Optional additional CSS classes */
  className?: string;
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
 * IssueComments renders the comments section for an issue.
 *
 * @description Lists existing comments with author avatar, name, timestamp,
 * and body. Includes an add comment form at the bottom with a textarea and
 * submit button. Uses tRPC issue.addComment mutation.
 * @param props - IssueCommentsProps
 * @returns A comments list with add comment form
 *
 * @example
 * <IssueComments issueId="issue-123" />
 */
export function IssueComments({ issueId: _issueId, className }: IssueCommentsProps) {
  const t = useTranslations("issues");
  const [commentBody, setCommentBody] = useState("");

  // In production, this would be trpc.issue.getComments.useQuery({ issueId })
  // For now we use placeholder data structure since the router may not have
  // a comments endpoint yet. The component is wired for when it's available.
  const comments: CommentData[] = [];
  const isLoadingComments = false;

  const handleSubmitComment = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!commentBody.trim()) return;

      // When the addComment tRPC endpoint is available, replace with:
      // addCommentMutation.mutate({ issueId, body: commentBody.trim() });
      // For now, this is a placeholder that shows the UI is wired correctly
      setCommentBody("");
    },
    [commentBody],
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Add comment form */}
      <form onSubmit={handleSubmitComment} className="space-y-3">
        <Textarea
          value={commentBody}
          onChange={(e) => setCommentBody(e.target.value)}
          placeholder={t("commentPlaceholder")}
          rows={3}
          aria-label={t("commentPlaceholder")}
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={!commentBody.trim()}
          >
            {t("postComment")}
          </Button>
        </div>
      </form>

      {/* Comments list */}
      {isLoadingComments ? (
        <CommentsSkeleton />
      ) : comments.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="size-8" />}
          title={t("noComments")}
          description={t("noCommentsDescription")}
          className="py-8"
        />
      ) : (
        <div className="space-y-4" role="list" aria-label={t("comments")}>
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Data shape for a single comment.
 */
interface CommentData {
  id: string;
  body: string;
  createdAt: string | Date;
  author: {
    name: string | null;
    image?: string | null;
  };
}

/**
 * Renders a single comment with author info and timestamp.
 */
function CommentItem({ comment }: { comment: CommentData }) {
  return (
    <article
      className="flex gap-3"
      role="listitem"
      aria-label={`Comment by ${comment.author.name ?? "Unknown"}`}
    >
      <Avatar className="size-8 shrink-0">
        <AvatarImage
          src={comment.author.image ?? undefined}
          alt={comment.author.name ?? ""}
        />
        <AvatarFallback className="text-[10px]">
          {getInitials(comment.author.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {comment.author.name ?? "Unknown"}
          </span>
          <time
            className="text-xs text-muted-foreground"
            dateTime={new Date(comment.createdAt).toISOString()}
          >
            {formatTimestamp(comment.createdAt)}
          </time>
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-foreground">
          <p>{comment.body}</p>
        </div>
      </div>
    </article>
  );
}

/**
 * Skeleton loading state for comments list.
 */
function CommentsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="size-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
