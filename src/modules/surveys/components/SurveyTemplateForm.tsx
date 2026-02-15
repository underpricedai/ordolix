/**
 * Admin survey template create/edit form.
 *
 * @description Dialog form for creating or editing a survey template.
 * Supports name, description, trigger selection, delay, active toggle,
 * and a dynamic question builder.
 *
 * @module SurveyTemplateForm
 */

"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { trpc } from "@/shared/lib/trpc";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Switch } from "@/shared/components/ui/switch";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

interface SurveyQuestion {
  id: string;
  type: "text" | "rating" | "select" | "multiselect";
  label: string;
  required: boolean;
  options?: string[];
}

interface SurveyTemplateFormProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Template to edit (null for create) */
  editingTemplate?: {
    id: string;
    name: string;
    description?: string | null;
    trigger: string;
    isActive: boolean;
    delayMinutes: number;
    questions: unknown;
  } | null;
}

const TRIGGER_OPTIONS = [
  "issue_resolved",
  "issue_closed",
  "sla_met",
  "manual",
] as const;

/**
 * SurveyTemplateForm renders a dialog for creating/editing survey templates.
 *
 * @param props - SurveyTemplateFormProps
 * @returns A dialog form component
 */
export function SurveyTemplateForm({
  open,
  onOpenChange,
  editingTemplate,
}: SurveyTemplateFormProps) {
  const t = useTranslations("surveys");
  const tc = useTranslations("common");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState<string>("issue_resolved");
  const [isActive, setIsActive] = useState(true);
  const [delayMinutes, setDelayMinutes] = useState(30);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);

  const utils = trpc.useUtils();

  const createMutation = trpc.survey.createTemplate.useMutation({
    onSuccess: () => {
      void utils.survey.listTemplates.invalidate();
      onOpenChange(false);
    },
  });

  const updateMutation = trpc.survey.updateTemplate.useMutation({
    onSuccess: () => {
      void utils.survey.listTemplates.invalidate();
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (editingTemplate) {
      setName(editingTemplate.name);
      setDescription(editingTemplate.description ?? "");
      setTrigger(editingTemplate.trigger);
      setIsActive(editingTemplate.isActive);
      setDelayMinutes(editingTemplate.delayMinutes);
      setQuestions(
        Array.isArray(editingTemplate.questions)
          ? (editingTemplate.questions as SurveyQuestion[])
          : [],
      );
    } else {
      resetForm();
    }
  }, [editingTemplate, open]);

  function resetForm() {
    setName("");
    setDescription("");
    setTrigger("issue_resolved");
    setIsActive(true);
    setDelayMinutes(30);
    setQuestions([]);
  }

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "text",
        label: "",
        required: false,
      },
    ]);
  }

  function updateQuestion(index: number, updates: Partial<SurveyQuestion>) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...updates } : q)),
    );
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    const validQuestions = questions.filter((q) => q.label.trim());
    if (editingTemplate) {
      updateMutation.mutate({
        id: editingTemplate.id,
        name,
        description: description || null,
        trigger,
        isActive,
        delayMinutes,
        questions: validQuestions,
      });
    } else {
      createMutation.mutate({
        name,
        description: description || undefined,
        trigger,
        isActive,
        delayMinutes,
        questions: validQuestions,
      });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {editingTemplate ? t("editTemplate") : t("createTemplate")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("templateFormDescription")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="grid gap-4 py-4">
          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="tpl-name">{tc("name")}</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("templateNamePlaceholder")}
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="tpl-desc">{t("description")}</Label>
            <Textarea
              id="tpl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("templateDescriptionPlaceholder")}
              rows={2}
            />
          </div>

          {/* Trigger */}
          <div className="grid gap-2">
            <Label>{t("trigger")}</Label>
            <Select value={trigger} onValueChange={setTrigger}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {t(`triggers.${opt}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Delay */}
          <div className="grid gap-2">
            <Label htmlFor="tpl-delay">{t("delayMinutes")}</Label>
            <Input
              id="tpl-delay"
              type="number"
              min={0}
              max={10080}
              value={delayMinutes}
              onChange={(e) => setDelayMinutes(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">{t("delayDescription")}</p>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="tpl-active">{tc("active")}</Label>
            <Switch
              id="tpl-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          {/* Questions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t("questions")}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                <Plus className="mr-1 size-3" aria-hidden="true" />
                {t("addQuestion")}
              </Button>
            </div>

            {questions.map((q, index) => (
              <div key={q.id} className="flex items-start gap-2 rounded-md border p-3">
                <GripVertical className="mt-2 size-4 text-muted-foreground shrink-0" aria-hidden="true" />
                <div className="flex-1 space-y-2">
                  <Input
                    value={q.label}
                    onChange={(e) => updateQuestion(index, { label: e.target.value })}
                    placeholder={t("questionLabel")}
                  />
                  <div className="flex items-center gap-2">
                    <Select
                      value={q.type}
                      onValueChange={(val) =>
                        updateQuestion(index, { type: val as SurveyQuestion["type"] })
                      }
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">{t("questionTypes.text")}</SelectItem>
                        <SelectItem value="rating">{t("questionTypes.rating")}</SelectItem>
                        <SelectItem value="select">{t("questionTypes.select")}</SelectItem>
                        <SelectItem value="multiselect">{t("questionTypes.multiselect")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={q.required}
                        onCheckedChange={(val) =>
                          updateQuestion(index, { required: val })
                        }
                        id={`q-req-${q.id}`}
                      />
                      <Label htmlFor={`q-req-${q.id}`} className="text-xs">
                        {tc("required")}
                      </Label>
                    </div>
                  </div>
                  {(q.type === "select" || q.type === "multiselect") && (
                    <Input
                      value={(q.options ?? []).join(", ")}
                      onChange={(e) =>
                        updateQuestion(index, {
                          options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder={t("optionsPlaceholder")}
                    />
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => removeQuestion(index)}
                  aria-label={tc("delete")}
                >
                  <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isPending || !name}>
            {isPending ? tc("loading") : editingTemplate ? tc("save") : tc("create")}
          </Button>
        </ResponsiveDialogFooter>

        {(createMutation.error || updateMutation.error) && (
          <p className="text-sm text-destructive px-6 pb-4" role="alert">
            {createMutation.error?.message || updateMutation.error?.message}
          </p>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
