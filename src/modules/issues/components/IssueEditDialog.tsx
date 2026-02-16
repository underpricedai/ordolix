"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { RichTextEditor } from "@/shared/components/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { trpc } from "@/shared/lib/trpc";

interface IssueEditDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Issue ID to edit */
  issueId: string;
  /** Optional callback after successful save */
  onSuccess?: () => void;
}

interface EditFormData {
  summary: string;
  description: string;
  issueTypeId: string;
  priorityId: string;
  assigneeId: string;
  labels: string[];
  storyPoints: string;
  startDate: string;
  dueDate: string;
}

/**
 * IssueEditDialog renders a modal form for editing an existing issue.
 *
 * @description Fetches issue data by ID, populates a form, and saves changes
 * via tRPC issue.update mutation. Uses ResponsiveDialog for mobile/desktop support.
 *
 * @param props - IssueEditDialogProps
 * @returns A dialog component with an edit issue form
 *
 * @example
 * <IssueEditDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   issueId="issue-123"
 *   onSuccess={() => refetchData()}
 * />
 */
export function IssueEditDialog({
  open,
  onOpenChange,
  issueId,
  onSuccess,
}: IssueEditDialogProps) {
  const t = useTranslations("issues");
  const tc = useTranslations("common");
  const tp = useTranslations("priorities");

  const [formData, setFormData] = useState<EditFormData>({
    summary: "",
    description: "",
    issueTypeId: "",
    priorityId: "",
    assigneeId: "",
    labels: [],
    storyPoints: "",
    startDate: "",
    dueDate: "",
  });
  const [labelInput, setLabelInput] = useState("");
  const [initialized, setInitialized] = useState(false);

  const utils = trpc.useUtils();

  const {
    data: issue,
    isLoading,
  } = trpc.issue.getById.useQuery(
    { id: issueId },
    { enabled: open && !!issueId },
  );

  // Populate form when issue data loads
  useEffect(() => {
    if (issue && !initialized) {
      const issueData = issue as Record<string, unknown>;
      setFormData({
        summary: (issueData.summary as string) ?? "",
        description: (issueData.description as string) ?? "",
        issueTypeId: (issueData.issueTypeId as string) ?? "",
        priorityId: (issueData.priorityId as string) ?? "",
        assigneeId: (issueData.assigneeId as string) ?? "",
        labels: (issueData.labels as string[]) ?? [],
        storyPoints: issueData.storyPoints != null ? String(issueData.storyPoints) : "",
        startDate: issueData.startDate ? new Date(issueData.startDate as string).toISOString().split("T")[0]! : "",
        dueDate: issueData.dueDate ? new Date(issueData.dueDate as string).toISOString().split("T")[0]! : "",
      });
      setInitialized(true);
    }
  }, [issue, initialized]);

  const updateMutation = trpc.issue.update.useMutation({
    onSuccess: () => {
      void utils.issue.getById.invalidate({ id: issueId });
      void utils.issue.list.invalidate();
      void utils.board.getData.invalidate();
      void utils.gantt.getData.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const handleFieldChange = useCallback(
    (field: keyof EditFormData, value: string | string[]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleAddLabel = useCallback(() => {
    const label = labelInput.trim();
    if (label && !formData.labels.includes(label)) {
      setFormData((prev) => ({
        ...prev,
        labels: [...prev.labels, label],
      }));
    }
    setLabelInput("");
  }, [labelInput, formData.labels]);

  const handleRemoveLabel = useCallback((label: string) => {
    setFormData((prev) => ({
      ...prev,
      labels: prev.labels.filter((l) => l !== label),
    }));
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.summary.trim()) return;

      updateMutation.mutate({
        id: issueId,
        summary: formData.summary,
        description: formData.description || null,
        issueTypeId: formData.issueTypeId || undefined,
        priorityId: formData.priorityId || undefined,
        assigneeId: formData.assigneeId || null,
        labels: formData.labels,
        storyPoints: formData.storyPoints ? Number(formData.storyPoints) : null,
        startDate: formData.startDate ? new Date(formData.startDate) : null,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
      });
    },
    [formData, issueId, updateMutation],
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setInitialized(false);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  const issueTypes = [
    { id: "task", name: "Task" },
    { id: "bug", name: "Bug" },
    { id: "story", name: "Story" },
    { id: "epic", name: "Epic" },
    { id: "subtask", name: "Sub-task" },
  ];

  const priorities = [
    { id: "highest", name: tp("highest") },
    { id: "high", name: tp("high") },
    { id: "medium", name: tp("medium") },
    { id: "low", name: tp("low") },
    { id: "lowest", name: tp("lowest") },
  ];

  const issueKey = issue ? (issue as Record<string, unknown>).key as string : "";

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-lg">
        <ResponsiveDialogHeader>
          <div className="flex items-center justify-between">
            <ResponsiveDialogTitle>
              {issueKey ? `${t("editIssue")} — ${issueKey}` : t("editIssue")}
            </ResponsiveDialogTitle>
            {issueKey && (
              <Link
                href={`/issues/${issueKey}`}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="size-3" aria-hidden="true" />
                {t("viewFullDetail")}
              </Link>
            )}
          </div>
          <ResponsiveDialogDescription>{t("editIssueDescription")}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              {/* Summary */}
              <div className="grid gap-2">
                <Label htmlFor="edit-summary">
                  {t("fields.summary")}
                  <span className="text-destructive ms-0.5" aria-hidden="true">*</span>
                </Label>
                <Input
                  id="edit-summary"
                  value={formData.summary}
                  onChange={(e) => handleFieldChange("summary", e.target.value)}
                  placeholder={t("fields.summaryPlaceholder")}
                  aria-required="true"
                />
              </div>

              {/* Description */}
              <div className="grid gap-2">
                <Label htmlFor="edit-description">{t("fields.description")}</Label>
                <RichTextEditor
                  content={formData.description}
                  onChange={(html) => handleFieldChange("description", html)}
                  placeholder={t("fields.descriptionPlaceholder")}
                />
              </div>

              {/* Issue Type + Priority row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-issue-type">{t("type")}</Label>
                  <Select
                    value={formData.issueTypeId}
                    onValueChange={(value) => handleFieldChange("issueTypeId", value)}
                  >
                    <SelectTrigger id="edit-issue-type" className="w-full">
                      <SelectValue placeholder={t("type")} />
                    </SelectTrigger>
                    <SelectContent>
                      {issueTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-priority">{t("fields.priority")}</Label>
                  <Select
                    value={formData.priorityId}
                    onValueChange={(value) => handleFieldChange("priorityId", value)}
                  >
                    <SelectTrigger id="edit-priority" className="w-full">
                      <SelectValue placeholder={t("fields.priority")} />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((priority) => (
                        <SelectItem key={priority.id} value={priority.id}>
                          {priority.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dates row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-start-date">{t("startDate")}</Label>
                  <Input
                    id="edit-start-date"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleFieldChange("startDate", e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-due-date">{t("dueDate")}</Label>
                  <Input
                    id="edit-due-date"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleFieldChange("dueDate", e.target.value)}
                  />
                </div>
              </div>

              {/* Story Points */}
              <div className="grid gap-2">
                <Label htmlFor="edit-story-points">{t("storyPoints")}</Label>
                <Input
                  id="edit-story-points"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.storyPoints}
                  onChange={(e) => handleFieldChange("storyPoints", e.target.value)}
                  placeholder="0"
                  className="w-32"
                />
              </div>

              {/* Labels */}
              <div className="grid gap-2">
                <Label htmlFor="edit-labels">{t("fields.labels")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-labels"
                    value={labelInput}
                    onChange={(e) => setLabelInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddLabel();
                      }
                    }}
                    placeholder={t("labels")}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddLabel}
                    disabled={!labelInput.trim()}
                  >
                    {tc("create")}
                  </Button>
                </div>
                {formData.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {formData.labels.map((label) => (
                      <Badge
                        key={label}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => handleRemoveLabel(label)}
                        role="button"
                        aria-label={`${tc("delete")} ${label}`}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleRemoveLabel(label);
                          }
                        }}
                      >
                        {label}
                        <span className="ms-1" aria-hidden="true">&times;</span>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {updateMutation.isError && (
              <p className="text-sm text-destructive mb-2" role="alert">
                {t("issueUpdateFailed")}
              </p>
            )}

            <ResponsiveDialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={updateMutation.isPending}
              >
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={updateMutation.isPending || !formData.summary.trim()}>
                {updateMutation.isPending && (
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                )}
                {tc("save")}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
