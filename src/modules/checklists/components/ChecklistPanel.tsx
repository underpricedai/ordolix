"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  CheckSquare,
  Plus,
  GripVertical,
  Trash2,
  User,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Progress } from "@/shared/components/ui/progress";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/utils";
import { trpc } from "@/shared/lib/trpc";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Checklist = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChecklistItem = any;

interface ChecklistPanelProps {
  /** The issue ID to display checklists for */
  issueId: string;
}

/**
 * ChecklistPanel renders checklists within an issue detail view.
 *
 * @description Displays one or more checklists with editable titles,
 * checkbox items with text and assignee, an add item input, a progress bar,
 * and drag-to-reorder support structure.
 *
 * @param props - ChecklistPanelProps
 * @returns Checklist panel component
 */
export function ChecklistPanel({ issueId }: ChecklistPanelProps) {
  const t = useTranslations("checklists");

  const {
    data: checklists,
    isLoading,
  } = trpc.checklist.list.useQuery(
    { issueId },
    { enabled: !!issueId },
  );

  const utils = trpc.useUtils();

  const createChecklistMutation = trpc.checklist.create.useMutation({
    onSuccess: () => {
      void utils.checklist.list.invalidate();
    },
  });

  const deleteChecklistMutation = trpc.checklist.delete.useMutation({
    onSuccess: () => {
      void utils.checklist.list.invalidate();
    },
  });

  const handleAddChecklist = useCallback(() => {
    createChecklistMutation.mutate({
      issueId,
      title: "New Checklist",
    });
  }, [issueId, createChecklistMutation]);

  const checklistItems: Checklist[] = checklists ?? [];

  if (isLoading) return <ChecklistPanelSkeleton />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{t("title")}</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddChecklist}
          disabled={createChecklistMutation.isPending}
        >
          <Plus className="mr-1 size-3.5" aria-hidden="true" />
          {t("addChecklist")}
        </Button>
      </div>

      {/* Checklists */}
      {checklistItems.length === 0 ? (
        <div className="flex min-h-[80px] items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/20">
          <p className="text-sm text-muted-foreground">
            No checklists yet. Add one to get started.
          </p>
        </div>
      ) : (
        checklistItems.map((checklist: Checklist) => (
          <SingleChecklist
            key={checklist.id}
            checklist={checklist}
            onDelete={() => deleteChecklistMutation.mutate({ id: checklist.id })}
          />
        ))
      )}
    </div>
  );
}

interface SingleChecklistProps {
  checklist: Checklist;
  onDelete: () => void;
}

/**
 * SingleChecklist renders a single checklist with its items and controls.
 */
function SingleChecklist({ checklist, onDelete }: SingleChecklistProps) {
  const t = useTranslations("checklists");

  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(checklist.title ?? "Checklist");
  const [newItemText, setNewItemText] = useState("");

  const utils = trpc.useUtils();

  const updateChecklistMutation = trpc.checklist.update.useMutation({
    onSuccess: () => {
      void utils.checklist.list.invalidate();
    },
  });

  const addItemMutation = trpc.checklist.addItem.useMutation({
    onSuccess: () => {
      setNewItemText("");
      void utils.checklist.list.invalidate();
    },
  });

  const updateItemMutation = trpc.checklist.updateItem.useMutation({
    onSuccess: () => {
      void utils.checklist.list.invalidate();
    },
  });

  const deleteItemMutation = trpc.checklist.deleteItem.useMutation({
    onSuccess: () => {
      void utils.checklist.list.invalidate();
    },
  });

  const items: ChecklistItem[] = useMemo(
    () => (checklist.items ?? []) as ChecklistItem[],
    [checklist.items],
  );

  // Progress calculation
  const { completed, total, percentage } = useMemo(() => {
    const totalCount = items.length;
    const completedCount = items.filter((item: ChecklistItem) => item.isChecked).length;
    const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    return { completed: completedCount, total: totalCount, percentage: pct };
  }, [items]);

  const handleSaveTitle = useCallback(() => {
    setEditingTitle(false);
    if (title !== checklist.title) {
      updateChecklistMutation.mutate({ id: checklist.id, title });
    }
  }, [title, checklist.id, checklist.title, updateChecklistMutation]);

  const handleAddItem = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!newItemText.trim()) return;
      addItemMutation.mutate({
        checklistId: checklist.id,
        text: newItemText.trim(),
      });
    },
    [newItemText, checklist.id, addItemMutation],
  );

  const handleToggleItem = useCallback(
    (itemId: string, isChecked: boolean) => {
      updateItemMutation.mutate({ id: itemId, isChecked: !isChecked });
    },
    [updateItemMutation],
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          {/* Editable title */}
          {editingTitle ? (
            <div className="flex items-center gap-1">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") {
                    setTitle(checklist.title ?? "Checklist");
                    setEditingTitle(false);
                  }
                }}
                className="h-7 w-48 text-sm font-semibold"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleSaveTitle}
                aria-label="Save title"
              >
                <Check className="size-3" aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CheckSquare className="size-4 text-primary" aria-hidden="true" />
              <CardTitle
                className="cursor-pointer text-sm hover:text-primary"
                onClick={() => setEditingTitle(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setEditingTitle(true);
                }}
                aria-label={`Edit title: ${title}`}
              >
                {title}
              </CardTitle>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {t("progress", { completed, total })}
            </Badge>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onDelete}
              aria-label={`Delete checklist ${title}`}
            >
              <Trash2 className="size-3" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <Progress
            value={percentage}
            className={cn(
              "h-1.5",
              percentage === 100 && "[&>[data-slot=progress-indicator]]:bg-green-600",
            )}
            aria-label={`${percentage}% complete`}
          />
        )}
      </CardHeader>

      <CardContent className="space-y-1 pb-3">
        {/* Checklist items */}
        <div className="space-y-0.5" role="list" aria-label={`${title} items`}>
          {items.map((item: ChecklistItem) => (
            <ChecklistItemRow
              key={item.id}
              item={item}
              onToggle={() => handleToggleItem(item.id, item.isChecked)}
              onDelete={() => deleteItemMutation.mutate({ id: item.id })}
            />
          ))}
        </div>

        {/* Add item input */}
        <form onSubmit={handleAddItem} className="flex items-center gap-2 pt-2">
          <Input
            placeholder={t("addItem")}
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            className="h-8 text-sm"
            aria-label={t("addItem")}
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={!newItemText.trim() || addItemMutation.isPending}
          >
            <Plus className="size-3.5" aria-hidden="true" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

interface ChecklistItemRowProps {
  item: ChecklistItem;
  onToggle: () => void;
  onDelete: () => void;
}

/**
 * ChecklistItemRow renders a single checklist item with checkbox and controls.
 */
function ChecklistItemRow({ item, onToggle, onDelete }: ChecklistItemRowProps) {
  return (
    <div
      className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/50"
      role="listitem"
    >
      <GripVertical
        className="size-3.5 shrink-0 cursor-grab text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden="true"
      />
      <Checkbox
        checked={item.isChecked}
        onCheckedChange={onToggle}
        aria-label={`${item.isChecked ? "Uncheck" : "Check"} ${item.text}`}
      />
      <span
        className={cn(
          "flex-1 text-sm",
          item.isChecked && "text-muted-foreground line-through",
        )}
      >
        {item.text}
      </span>
      {item.assignee && (
        <Badge variant="outline" className="shrink-0 text-xs">
          <User className="mr-1 size-2.5" aria-hidden="true" />
          {item.assignee.name ?? item.assigneeId}
        </Badge>
      )}
      <Button
        variant="ghost"
        size="icon-xs"
        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={onDelete}
        aria-label={`Delete item: ${item.text}`}
      >
        <X className="size-3" aria-hidden="true" />
      </Button>
    </div>
  );
}

/**
 * Skeleton loading state for the checklist panel.
 */
function ChecklistPanelSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-28" />
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center gap-2">
                <Skeleton className="size-4 rounded" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
