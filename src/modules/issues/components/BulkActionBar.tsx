"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Trash2, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { trpc } from "@/shared/lib/trpc";
import { cn } from "@/shared/lib/utils";

interface BulkActionBarProps {
  /** IDs of the selected issues */
  selectedIds: Set<string>;
  /** Project ID for fetching statuses, priorities, etc. */
  projectId: string;
  /** Callback to clear all selections */
  onClearSelection: () => void;
  /** Optional callback after a successful bulk action */
  onActionComplete?: () => void;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * BulkActionBar provides batch actions for selected issues.
 *
 * @description Renders a fixed bottom bar with dropdowns for status,
 * priority, assignee, and sprint changes, plus a delete button.
 * Appears with a slide-up animation when issues are selected.
 *
 * @example
 * <BulkActionBar
 *   selectedIds={selectedIds}
 *   projectId="proj-1"
 *   onClearSelection={() => clearSelection()}
 *   onActionComplete={() => refetch()}
 * />
 */
export function BulkActionBar({
  selectedIds,
  projectId,
  onClearSelection,
  onActionComplete,
  className,
}: BulkActionBarProps) {
  const t = useTranslations("issues.bulk");
  const selectedCount = selectedIds.size;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const utils = trpc.useUtils();

  // Fetch filter options
  const { data: statuses } = trpc.issue.listStatuses.useQuery(
    { projectId },
    { enabled: selectedCount > 0 },
  );
  const { data: priorities } = trpc.issue.listPriorities.useQuery(
    undefined,
    { enabled: selectedCount > 0 },
  );
  const { data: usersData } = trpc.user.listUsers.useQuery(
    { limit: 100 },
    { enabled: selectedCount > 0 },
  );
  const { data: sprints } = trpc.sprint.list.useQuery(
    { projectId },
    { enabled: selectedCount > 0 },
  );

  // Mutations
  const bulkUpdate = trpc.issue.bulkUpdate.useMutation({
    onSuccess: () => {
      utils.issue.list.invalidate();
      onActionComplete?.();
      onClearSelection();
    },
  });

  const bulkDelete = trpc.issue.bulkDelete.useMutation({
    onSuccess: () => {
      utils.issue.list.invalidate();
      onActionComplete?.();
      onClearSelection();
    },
  });

  const bulkMoveToSprint = trpc.issue.bulkMoveToSprint.useMutation({
    onSuccess: () => {
      utils.issue.list.invalidate();
      onActionComplete?.();
      onClearSelection();
    },
  });

  const issueIds = Array.from(selectedIds);

  const handleStatusChange = (statusId: string) => {
    bulkUpdate.mutate({ issueIds, updates: { statusId } });
  };

  const handlePriorityChange = (priorityId: string) => {
    bulkUpdate.mutate({ issueIds, updates: { priorityId } });
  };

  const handleAssigneeChange = (assigneeId: string | null) => {
    bulkUpdate.mutate({ issueIds, updates: { assigneeId } });
  };

  const handleMoveToSprint = (sprintId: string | null) => {
    bulkMoveToSprint.mutate({ issueIds, sprintId });
  };

  const handleDelete = () => {
    bulkDelete.mutate({ issueIds });
    setShowDeleteConfirm(false);
  };

  if (selectedCount === 0) return null;

  const isLoading = bulkUpdate.isPending || bulkDelete.isPending || bulkMoveToSprint.isPending;

  return (
    <>
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
          "animate-in slide-in-from-bottom-full duration-200",
          className,
        )}
        role="toolbar"
        aria-label={t("selected", { count: selectedCount })}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3">
          {/* Selection count */}
          <span className="text-sm font-medium text-foreground">
            {t("selected", { count: selectedCount })}
          </span>

          <div className="mx-2 h-4 w-px bg-border" aria-hidden="true" />

          {/* Change Status */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isLoading}>
                {t("changeStatus")}
                <ChevronDown className="ms-1 size-3.5" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {statuses?.map((status) => (
                <DropdownMenuItem
                  key={status.id}
                  onSelect={() => handleStatusChange(status.id)}
                >
                  {status.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Change Priority */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isLoading}>
                {t("changePriority")}
                <ChevronDown className="ms-1 size-3.5" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {priorities?.map((priority) => (
                <DropdownMenuItem
                  key={priority.id}
                  onSelect={() => handlePriorityChange(priority.id)}
                >
                  {priority.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Assign To */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isLoading}>
                {t("assignTo")}
                <ChevronDown className="ms-1 size-3.5" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
              <DropdownMenuItem onSelect={() => handleAssigneeChange(null)}>
                {t("unassigned")}
              </DropdownMenuItem>
              {usersData?.items?.map((member) => (
                <DropdownMenuItem
                  key={member.user.id}
                  onSelect={() => handleAssigneeChange(member.user.id)}
                >
                  {member.user.name ?? member.user.email}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Move to Sprint */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isLoading}>
                {t("moveToSprint")}
                <ChevronDown className="ms-1 size-3.5" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => handleMoveToSprint(null)}>
                {t("noSprint")}
              </DropdownMenuItem>
              {sprints
                ?.filter((s: { status: string }) => s.status !== "completed")
                .map((sprint: { id: string; name: string; status: string }) => (
                  <DropdownMenuItem
                    key={sprint.id}
                    onSelect={() => handleMoveToSprint(sprint.id)}
                  >
                    {sprint.name}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="mx-2 h-4 w-px bg-border" aria-hidden="true" />

          {/* Delete */}
          <Button
            variant="destructive"
            size="sm"
            disabled={isLoading}
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="me-1 size-3.5" aria-hidden="true" />
            {t("delete")}
          </Button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Clear selection */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            disabled={isLoading}
            aria-label={t("clearSelection")}
          >
            <X className="me-1 size-3.5" aria-hidden="true" />
            {t("clearSelection")}
          </Button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDelete", { count: selectedCount })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("clearSelection")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
