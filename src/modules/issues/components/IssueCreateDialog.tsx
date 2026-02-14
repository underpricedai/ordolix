"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command";
import { Badge } from "@/shared/components/ui/badge";
import { trpc } from "@/shared/lib/trpc";
import { cn } from "@/shared/lib/utils";

/**
 * Client-side validation schema for the create issue form.
 */
const createIssueFormSchema = z.object({
  summary: z.string().min(1, "Summary is required").max(255),
  description: z.string().optional(),
  issueTypeId: z.string().min(1, "Issue type is required"),
  priorityId: z.string().optional(),
  assigneeId: z.string().optional(),
  labels: z.array(z.string()).default([]),
});

type CreateIssueFormData = z.infer<typeof createIssueFormSchema>;

/**
 * Form field validation errors keyed by field name.
 */
type FormErrors = Partial<Record<keyof CreateIssueFormData, string>>;

interface IssueCreateDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Project ID to create the issue in */
  projectId: string;
  /** Optional callback after successful creation */
  onSuccess?: () => void;
}

/**
 * IssueCreateDialog renders a modal form for creating a new issue.
 *
 * @description Uses shadcn Dialog with form fields for summary, description,
 * issue type, priority, assignee (combobox), and labels. Validates with Zod,
 * creates via tRPC issue.create mutation, and triggers optimistic UI update.
 * @param props - IssueCreateDialogProps
 * @returns A dialog component with a create issue form
 *
 * @example
 * <IssueCreateDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   projectId="proj-1"
 *   onSuccess={() => refetchIssues()}
 * />
 */
export function IssueCreateDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: IssueCreateDialogProps) {
  const t = useTranslations("issues");
  const tc = useTranslations("common");
  const tp = useTranslations("priorities");

  const [formData, setFormData] = useState<CreateIssueFormData>({
    summary: "",
    description: "",
    issueTypeId: "",
    priorityId: "",
    assigneeId: "",
    labels: [],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [labelInput, setLabelInput] = useState("");

  const utils = trpc.useUtils();

  const createMutation = trpc.issue.create.useMutation({
    onSuccess: () => {
      utils.issue.list.invalidate();
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const resetForm = useCallback(() => {
    setFormData({
      summary: "",
      description: "",
      issueTypeId: "",
      priorityId: "",
      assigneeId: "",
      labels: [],
    });
    setErrors({});
    setLabelInput("");
  }, []);

  const handleFieldChange = useCallback(
    (field: keyof CreateIssueFormData, value: string | string[]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear field error on change
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [errors],
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

      const result = createIssueFormSchema.safeParse(formData);

      if (!result.success) {
        const fieldErrors: FormErrors = {};
        for (const issue of result.error.issues) {
          const fieldName = issue.path[0] as keyof CreateIssueFormData;
          if (!fieldErrors[fieldName]) {
            fieldErrors[fieldName] = issue.message;
          }
        }
        setErrors(fieldErrors);
        return;
      }

      createMutation.mutate({
        projectId,
        summary: result.data.summary,
        description: result.data.description || undefined,
        issueTypeId: result.data.issueTypeId,
        priorityId: result.data.priorityId || undefined,
        assigneeId: result.data.assigneeId || undefined,
        labels: result.data.labels,
      });
    },
    [formData, projectId, createMutation],
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        resetForm();
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, resetForm],
  );

  // Default issue types and priorities for the form selects
  // In a real application these would come from tRPC queries
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

  // Placeholder team members for the assignee combobox
  // In production, these come from organization members query
  const teamMembers = [
    { id: "unassigned", name: t("unassigned") },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("createIssue")}</DialogTitle>
          <DialogDescription>{t("createIssueDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate>
          <div className="grid gap-4 py-4">
            {/* Summary */}
            <div className="grid gap-2">
              <Label htmlFor="create-summary">
                {t("fields.summary")}
                <span className="text-destructive ms-0.5" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="create-summary"
                value={formData.summary}
                onChange={(e) => handleFieldChange("summary", e.target.value)}
                placeholder={t("fields.summaryPlaceholder")}
                aria-required="true"
                aria-invalid={!!errors.summary}
                aria-describedby={errors.summary ? "create-summary-error" : undefined}
                autoFocus
              />
              {errors.summary && (
                <p
                  id="create-summary-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {errors.summary}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="create-description">
                {t("fields.description")}
              </Label>
              <Textarea
                id="create-description"
                value={formData.description}
                onChange={(e) => handleFieldChange("description", e.target.value)}
                placeholder={t("fields.descriptionPlaceholder")}
                rows={4}
              />
            </div>

            {/* Issue Type */}
            <div className="grid gap-2">
              <Label htmlFor="create-issue-type">
                {t("type")}
                <span className="text-destructive ms-0.5" aria-hidden="true">
                  *
                </span>
              </Label>
              <Select
                value={formData.issueTypeId}
                onValueChange={(value) => handleFieldChange("issueTypeId", value)}
              >
                <SelectTrigger
                  id="create-issue-type"
                  className="w-full"
                  aria-required="true"
                  aria-invalid={!!errors.issueTypeId}
                >
                  <SelectValue placeholder={t("filterByType")} />
                </SelectTrigger>
                <SelectContent>
                  {issueTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.issueTypeId && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.issueTypeId}
                </p>
              )}
            </div>

            {/* Priority */}
            <div className="grid gap-2">
              <Label htmlFor="create-priority">{t("fields.priority")}</Label>
              <Select
                value={formData.priorityId}
                onValueChange={(value) => handleFieldChange("priorityId", value)}
              >
                <SelectTrigger id="create-priority" className="w-full">
                  <SelectValue placeholder={t("filterByPriority")} />
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

            {/* Assignee - Combobox */}
            <div className="grid gap-2">
              <Label>{t("fields.assignee")}</Label>
              <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={assigneeOpen}
                    aria-label={t("filterByAssignee")}
                    className="w-full justify-between font-normal"
                  >
                    {formData.assigneeId
                      ? teamMembers.find((m) => m.id === formData.assigneeId)?.name ??
                        t("unassigned")
                      : t("unassigned")}
                    <ChevronsUpDown
                      className="ms-2 size-4 shrink-0 opacity-50"
                      aria-hidden="true"
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t("filterByAssignee")} />
                    <CommandList>
                      <CommandEmpty>{tc("noResults")}</CommandEmpty>
                      <CommandGroup>
                        {teamMembers.map((member) => (
                          <CommandItem
                            key={member.id}
                            value={member.name}
                            onSelect={() => {
                              handleFieldChange(
                                "assigneeId",
                                member.id === "unassigned" ? "" : member.id,
                              );
                              setAssigneeOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 size-4",
                                formData.assigneeId === member.id
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                              aria-hidden="true"
                            />
                            {member.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Labels */}
            <div className="grid gap-2">
              <Label htmlFor="create-labels">{t("fields.labels")}</Label>
              <div className="flex gap-2">
                <Input
                  id="create-labels"
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
                      <span className="ms-1" aria-hidden="true">
                        &times;
                      </span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createMutation.isPending}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2
                  className="mr-2 size-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              {tc("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
