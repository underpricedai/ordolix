"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Link as LinkIcon,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { trpc } from "@/shared/lib/trpc";

/**
 * A single test step with action and expected result.
 */
interface TestStep {
  id: string;
  step: string;
  expectedResult: string;
}

interface TestCaseEditorProps {
  /** Test case ID for editing, undefined for create mode */
  testCaseId?: string;
  /** Test suite ID for creating a new test case */
  testSuiteId?: string;
  /** Callback on successful save */
  onSave?: () => void;
  /** Callback on cancel */
  onCancel?: () => void;
}

/**
 * TestCaseEditor renders a form for creating or editing a test case.
 *
 * @description Includes fields for title, description, preconditions, an ordered
 * list of test steps with action/expected columns, labels, priority, estimated
 * time, and linked issues. Steps can be added, removed, and reordered.
 *
 * @param props - TestCaseEditorProps
 * @returns A form component for test case CRUD
 *
 * @example
 * <TestCaseEditor testSuiteId="suite-1" onSave={handleSave} onCancel={handleCancel} />
 */
export function TestCaseEditor({
  testCaseId,
  testSuiteId,
  onSave,
  onCancel,
}: TestCaseEditorProps) {
  const t = useTranslations("testManagement");
  const tc = useTranslations("common");

  const isEdit = Boolean(testCaseId);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [preconditions, setPreconditions] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [status, setStatus] = useState<"draft" | "ready" | "deprecated">("draft");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [labels, setLabels] = useState("");
  const [linkedIssueId, setLinkedIssueId] = useState("");
  const [steps, setSteps] = useState<TestStep[]>([
    { id: crypto.randomUUID(), step: "", expectedResult: "" },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  // tRPC mutations
  const createMutation = trpc.testManagement.createCase.useMutation();
  const updateMutation = trpc.testManagement.updateCase.useMutation();

  // Load existing test case for editing
  const { data: existingCase } = trpc.testManagement.getCase.useQuery(
    { id: testCaseId ?? "" },
    { enabled: Boolean(testCaseId) },
  );

  useEffect(() => {
    if (existingCase) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = existingCase as any;
      setTitle(data.title ?? "");
      setDescription(data.description ?? "");
      setPreconditions(data.preconditions ?? "");
      setPriority(data.priority ?? "medium");
      setStatus(data.status ?? "draft");
      if (data.steps?.length) {
        setSteps(
          data.steps.map((s: { step: string; expectedResult?: string }) => ({
            id: crypto.randomUUID(),
            step: s.step,
            expectedResult: s.expectedResult ?? "",
          })),
        );
      }
    }
  }, [existingCase]);

  const addStep = useCallback(() => {
    setSteps((prev) => [
      ...prev,
      { id: crypto.randomUUID(), step: "", expectedResult: "" },
    ]);
  }, []);

  const removeStep = useCallback((id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const updateStep = useCallback(
    (id: string, field: "step" | "expectedResult", value: string) => {
      setSteps((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
      );
    },
    [],
  );

  const moveStep = useCallback((id: string, direction: "up" | "down") => {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      if (direction === "up" && idx === 0) return prev;
      if (direction === "down" && idx === prev.length - 1) return prev;
      const next = [...prev];
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      [next[idx], next[swapIdx]] = [next[swapIdx]!, next[idx]!];
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const stepsData = steps
        .filter((s) => s.step.trim())
        .map((s) => ({ step: s.step, expectedResult: s.expectedResult || undefined }));

      if (isEdit && testCaseId) {
        await updateMutation.mutateAsync({
          id: testCaseId,
          title,
          description: description || undefined,
          preconditions: preconditions || undefined,
          priority,
          status,
          steps: stepsData,
        });
      } else {
        await createMutation.mutateAsync({
          testSuiteId: testSuiteId ?? "",
          title,
          description: description || undefined,
          preconditions: preconditions || undefined,
          priority,
          status,
          steps: stepsData,
        });
      }
      onSave?.();
    } finally {
      setIsSaving(false);
    }
  }, [
    isEdit,
    testCaseId,
    testSuiteId,
    title,
    description,
    preconditions,
    priority,
    status,
    steps,
    createMutation,
    updateMutation,
    onSave,
  ]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="grid gap-2">
        <Label htmlFor="tc-title">{t("titleField")}</Label>
        <Input
          id="tc-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("titlePlaceholder")}
          required
        />
      </div>

      {/* Description */}
      <div className="grid gap-2">
        <Label htmlFor="tc-description">{t("description")}</Label>
        <Textarea
          id="tc-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("descriptionPlaceholder")}
          rows={3}
        />
      </div>

      {/* Preconditions */}
      <div className="grid gap-2">
        <Label htmlFor="tc-preconditions">{t("preconditions")}</Label>
        <Textarea
          id="tc-preconditions"
          value={preconditions}
          onChange={(e) => setPreconditions(e.target.value)}
          placeholder={t("preconditionsPlaceholder")}
          rows={2}
        />
      </div>

      {/* Priority and Status row */}
      <div className="flex flex-wrap gap-4">
        <div className="grid gap-2">
          <Label>{t("priority")}</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
            <SelectTrigger className="w-[150px]" aria-label={t("priority")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="critical">{t("critical")}</SelectItem>
              <SelectItem value="high">{t("high")}</SelectItem>
              <SelectItem value="medium">{t("medium")}</SelectItem>
              <SelectItem value="low">{t("low")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>{t("status")}</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="w-[150px]" aria-label={t("status")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">{t("draft")}</SelectItem>
              <SelectItem value="ready">{t("ready")}</SelectItem>
              <SelectItem value="deprecated">{t("deprecated")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="tc-estimated-time">{t("estimatedTime")}</Label>
          <Input
            id="tc-estimated-time"
            value={estimatedTime}
            onChange={(e) => setEstimatedTime(e.target.value)}
            placeholder="e.g., 30m"
            className="w-[150px]"
          />
        </div>
      </div>

      {/* Labels */}
      <div className="grid gap-2">
        <Label htmlFor="tc-labels">{t("labels")}</Label>
        <Input
          id="tc-labels"
          value={labels}
          onChange={(e) => setLabels(e.target.value)}
          placeholder={t("labelsPlaceholder")}
        />
      </div>

      <Separator />

      {/* Test steps */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("testSteps")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              className="flex items-start gap-2 rounded-md border bg-muted/20 p-3"
              role="listitem"
            >
              {/* Step number and grip */}
              <div className="flex shrink-0 flex-col items-center gap-1 pt-2">
                <GripVertical
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="text-xs font-medium text-muted-foreground">
                  {idx + 1}
                </span>
              </div>

              {/* Step fields */}
              <div className="flex-1 space-y-2">
                <div className="grid gap-1">
                  <Label htmlFor={`step-action-${step.id}`} className="text-xs">
                    {t("stepAction")}
                  </Label>
                  <Textarea
                    id={`step-action-${step.id}`}
                    value={step.step}
                    onChange={(e) =>
                      updateStep(step.id, "step", e.target.value)
                    }
                    placeholder={t("stepActionPlaceholder")}
                    rows={2}
                    className="text-sm"
                  />
                </div>
                <div className="grid gap-1">
                  <Label
                    htmlFor={`step-expected-${step.id}`}
                    className="text-xs"
                  >
                    {t("expectedResult")}
                  </Label>
                  <Textarea
                    id={`step-expected-${step.id}`}
                    value={step.expectedResult}
                    onChange={(e) =>
                      updateStep(step.id, "expectedResult", e.target.value)
                    }
                    placeholder={t("expectedResultPlaceholder")}
                    rows={2}
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Step actions */}
              <div className="flex shrink-0 flex-col gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => moveStep(step.id, "up")}
                  disabled={idx === 0}
                  aria-label={t("moveStepUp")}
                >
                  <ArrowUp className="size-3.5" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => moveStep(step.id, "down")}
                  disabled={idx === steps.length - 1}
                  aria-label={t("moveStepDown")}
                >
                  <ArrowDown className="size-3.5" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive"
                  onClick={() => removeStep(step.id)}
                  disabled={steps.length <= 1}
                  aria-label={t("removeStep")}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={addStep}>
            <Plus className="mr-1.5 size-3.5" aria-hidden="true" />
            {t("addStep")}
          </Button>
        </CardContent>
      </Card>

      {/* Link to issues */}
      <div className="grid gap-2">
        <Label htmlFor="tc-linked-issue">{t("linkedIssue")}</Label>
        <div className="flex items-center gap-2">
          <LinkIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          <Input
            id="tc-linked-issue"
            value={linkedIssueId}
            onChange={(e) => setLinkedIssueId(e.target.value)}
            placeholder={t("linkedIssuePlaceholder")}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-2">
        <Button onClick={handleSave} disabled={!title.trim() || isSaving}>
          <Save className="mr-2 size-4" aria-hidden="true" />
          {isSaving ? tc("loading") : isEdit ? tc("save") : tc("create")}
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            {tc("cancel")}
          </Button>
        )}
      </div>
    </div>
  );
}
