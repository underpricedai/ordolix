/**
 * AttachmentList component for displaying issue attachments.
 *
 * @description Shows a list of existing file attachments for an issue with
 * filename, size, uploader, date, and a delete button.
 *
 * @module attachment-list
 */

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Paperclip, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/shared/components/empty-state";
import { trpc } from "@/shared/lib/trpc";
import { formatFileSize } from "./file-uploader";

interface AttachmentListProps {
  /** The issue ID to list attachments for */
  issueId: string;
}

/**
 * AttachmentList renders a list of existing attachments for an issue.
 *
 * @description Fetches attachments via tRPC, displays filename, size,
 * uploader name, and creation date. Provides delete with confirmation.
 *
 * @param props - AttachmentListProps
 * @returns A list of attachments or an empty state
 *
 * @example
 * ```tsx
 * <AttachmentList issueId="clxx..." />
 * ```
 */
export function AttachmentList({ issueId }: AttachmentListProps) {
  const t = useTranslations("attachments");
  const tc = useTranslations("common");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const attachmentsQuery = trpc.issue.listAttachments.useQuery({ issueId });
  const deleteAttachment = trpc.issue.deleteAttachment.useMutation({
    onSuccess: () => {
      setConfirmDeleteId(null);
      attachmentsQuery.refetch();
    },
  });

  if (attachmentsQuery.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const attachments = attachmentsQuery.data;

  if (!attachments || attachments.length === 0) {
    return (
      <EmptyState
        icon={<Paperclip className="size-10" />}
        title={t("noAttachments")}
        className="py-8"
      />
    );
  }

  return (
    <ul className="space-y-2" aria-label={t("title")}>
      {attachments.map((attachment) => (
        <li
          key={attachment.id}
          className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
        >
          <Paperclip
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{attachment.filename}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(attachment.size)}
              {attachment.uploader && (
                <span>
                  {" \u00b7 "}
                  {attachment.uploader.name}
                </span>
              )}
              {" \u00b7 "}
              {new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
              }).format(new Date(attachment.createdAt))}
            </p>
          </div>

          {confirmDeleteId === attachment.id ? (
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteAttachment.mutate({ id: attachment.id })}
                disabled={deleteAttachment.isPending}
              >
                {t("delete")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDeleteId(null)}
              >
                {tc("cancel")}
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDeleteId(attachment.id)}
              className="shrink-0 rounded-sm p-1 text-muted-foreground hover:text-destructive"
              aria-label={`${t("delete")} ${attachment.filename}`}
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
