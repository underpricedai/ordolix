"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Zap,
  Plus,
  X,
  Save,
  Play,
  ArrowRight,
  Filter,
  Bolt,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
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

/** Trigger event types */
const TRIGGER_TYPES = [
  { value: "issue_created", label: "Issue Created" },
  { value: "status_changed", label: "Status Changed" },
  { value: "field_updated", label: "Field Updated" },
  { value: "scheduled", label: "Scheduled" },
] as const;

/** Action types */
const ACTION_TYPES = [
  { value: "set_field", label: "Set Field Value" },
  { value: "add_comment", label: "Add Comment" },
  { value: "send_email", label: "Send Email" },
  { value: "transition", label: "Transition Issue" },
] as const;

/** Condition operators */
const OPERATORS = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "not equals" },
  { value: "contains", label: "contains" },
  { value: "greater_than", label: "greater than" },
  { value: "less_than", label: "less than" },
  { value: "in", label: "in" },
] as const;

/** Field options for conditions */
const CONDITION_FIELDS = [
  "status",
  "priority",
  "assignee",
  "type",
  "project",
  "labels",
  "summary",
] as const;

interface ConditionRow {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface ActionRow {
  id: string;
  type: string;
  config: Record<string, string>;
}

interface AutomationRuleEditorProps {
  /** Existing rule ID for editing */
  ruleId?: string;
  /** Called after successful save */
  onSuccess?: () => void;
  /** Called when cancel is clicked */
  onCancel?: () => void;
}

/**
 * AutomationRuleEditor renders a builder for creating or editing automation rules.
 *
 * @description Contains sections for trigger event, conditions (field/operator/value),
 * and actions. Supports adding/removing multiple conditions and actions.
 * Includes a test (dry run) button.
 *
 * @param props - AutomationRuleEditorProps
 * @returns Automation rule editor component
 */
export function AutomationRuleEditor({
  ruleId,
  onSuccess,
  onCancel,
}: AutomationRuleEditorProps) {
  const isEditing = !!ruleId;

  // Load existing rule data before rendering inner form
  const { data: existingRule, isLoading } = trpc.automation.getById.useQuery(
    { id: ruleId! },
    { enabled: isEditing },
  );

  if (isEditing && isLoading) {
    return <AutomationRuleEditorSkeleton />;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initialData = existingRule as any;

  return (
    <AutomationRuleEditorInner
      key={ruleId ?? "new"}
      ruleId={ruleId}
      onSuccess={onSuccess}
      onCancel={onCancel}
      initialData={initialData}
    />
  );
}

interface AutomationRuleEditorInnerProps extends AutomationRuleEditorProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData?: any;
}

/**
 * Inner editor component initialized from props to avoid useEffect/setState pattern.
 */
function AutomationRuleEditorInner({
  ruleId,
  onSuccess,
  onCancel,
  initialData,
}: AutomationRuleEditorInnerProps) {
  const t = useTranslations("automation");
  const tc = useTranslations("common");

  const isEditing = !!ruleId;

  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [triggerType, setTriggerType] = useState(
    initialData?.trigger?.type ?? "issue_created",
  );
  const [conditions, setConditions] = useState<ConditionRow[]>(() => {
    if (!initialData?.conditions) return [];
    return initialData.conditions.map(
      (c: { field: string; operator: string; value: unknown }) => ({
        id: crypto.randomUUID(),
        field: c.field,
        operator: c.operator,
        value: String(c.value ?? ""),
      }),
    );
  });
  const [actions, setActions] = useState<ActionRow[]>(() => {
    if (!initialData?.actions) {
      return [{ id: crypto.randomUUID(), type: "set_field", config: {} }];
    }
    return initialData.actions.map(
      (a: { type: string; config: Record<string, unknown> }) => ({
        id: crypto.randomUUID(),
        type: a.type,
        config: Object.fromEntries(
          Object.entries(a.config).map(([k, v]) => [k, String(v)]),
        ),
      }),
    );
  });

  const createMutation = trpc.automation.create.useMutation({
    onSuccess: () => onSuccess?.(),
  });

  const updateMutation = trpc.automation.update.useMutation({
    onSuccess: () => onSuccess?.(),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Condition management
  const addCondition = useCallback(() => {
    setConditions((prev) => [
      ...prev,
      { id: crypto.randomUUID(), field: "status", operator: "equals", value: "" },
    ]);
  }, []);

  const removeCondition = useCallback((id: string) => {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateCondition = useCallback(
    (id: string, key: keyof ConditionRow, value: string) => {
      setConditions((prev) =>
        prev.map((c) => (c.id === id ? { ...c, [key]: value } : c)),
      );
    },
    [],
  );

  // Action management
  const addAction = useCallback(() => {
    setActions((prev) => [
      ...prev,
      { id: crypto.randomUUID(), type: "set_field", config: {} },
    ]);
  }, []);

  const removeAction = useCallback((id: string) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const updateAction = useCallback(
    (id: string, key: string, value: string) => {
      setActions((prev) =>
        prev.map((a) =>
          a.id === id
            ? key === "type"
              ? { ...a, type: value }
              : { ...a, config: { ...a.config, [key]: value } }
            : a,
        ),
      );
    },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (actions.length === 0) return;

      const payload = {
        name,
        description: description || undefined,
        trigger: { type: triggerType as "issue_created" | "status_changed" | "field_updated" | "scheduled", config: {} },
        conditions: conditions.map(({ field, operator, value }) => ({
          field,
          operator,
          value,
        })),
        actions: actions.map(({ type, config }) => ({
          type: type as "set_field" | "add_comment" | "send_email" | "transition",
          config,
        })),
        isActive: true,
      };

      if (isEditing && ruleId) {
        updateMutation.mutate({ id: ruleId, ...payload });
      } else {
        createMutation.mutate(payload);
      }
    },
    [name, description, triggerType, conditions, actions, isEditing, ruleId, createMutation, updateMutation],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic info */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing ? t("editRule") : t("createRule")}
          </CardTitle>
          <CardDescription>
            Define the trigger, conditions, and actions for this rule.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="rule-name">{t("ruleName")}</Label>
            <Input
              id="rule-name"
              placeholder="e.g., Auto-assign high priority bugs"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              aria-required="true"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rule-desc">Description</Label>
            <Textarea
              id="rule-desc"
              placeholder="What does this rule do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Trigger section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="size-5 text-yellow-500" aria-hidden="true" />
            <CardTitle className="text-base">{t("trigger")}</CardTitle>
          </div>
          <CardDescription>When should this rule fire?</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={triggerType} onValueChange={setTriggerType}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRIGGER_TYPES.map((tt) => (
                <SelectItem key={tt.value} value={tt.value}>
                  {tt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Conditions section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="size-5 text-blue-500" aria-hidden="true" />
              <CardTitle className="text-base">{t("conditions")}</CardTitle>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addCondition}>
              <Plus className="mr-1 size-3.5" aria-hidden="true" />
              Add Condition
            </Button>
          </div>
          <CardDescription>
            Optional conditions to narrow when the rule applies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {conditions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No conditions. Rule will fire for all matching events.
            </p>
          ) : (
            <div className="space-y-2">
              {conditions.map((cond, idx) => (
                <div
                  key={cond.id}
                  className="flex items-center gap-2 rounded-md border p-2"
                >
                  {idx > 0 && (
                    <Badge variant="secondary" className="shrink-0">AND</Badge>
                  )}
                  <Select
                    value={cond.field}
                    onValueChange={(v) => updateCondition(cond.id, "field", v)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITION_FIELDS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f.charAt(0).toUpperCase() + f.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={cond.operator}
                    onValueChange={(v) =>
                      updateCondition(cond.id, "operator", v)
                    }
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Value"
                    value={cond.value}
                    onChange={(e) =>
                      updateCondition(cond.id, "value", e.target.value)
                    }
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeCondition(cond.id)}
                    aria-label="Remove condition"
                  >
                    <X className="size-3" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Arrow connector */}
      <div className="flex justify-center">
        <ArrowRight className="size-6 text-muted-foreground" aria-hidden="true" />
      </div>

      {/* Actions section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bolt className="size-5 text-green-500" aria-hidden="true" />
              <CardTitle className="text-base">{t("actions")}</CardTitle>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addAction}>
              <Plus className="mr-1 size-3.5" aria-hidden="true" />
              Add Action
            </Button>
          </div>
          <CardDescription>What should happen when conditions are met?</CardDescription>
        </CardHeader>
        <CardContent>
          {actions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              At least one action is required.
            </p>
          ) : (
            <div className="space-y-3">
              {actions.map((action, idx) => (
                <div
                  key={action.id}
                  className="space-y-2 rounded-md border p-3"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Action {idx + 1}</Badge>
                    {actions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeAction(action.id)}
                        aria-label="Remove action"
                      >
                        <X className="size-3" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                  <Select
                    value={action.type}
                    onValueChange={(v) => updateAction(action.id, "type", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map((at) => (
                        <SelectItem key={at.value} value={at.value}>
                          {at.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Action-specific config */}
                  {action.type === "set_field" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Field name"
                        value={action.config.field ?? ""}
                        onChange={(e) =>
                          updateAction(action.id, "field", e.target.value)
                        }
                      />
                      <Input
                        placeholder="Value"
                        value={action.config.value ?? ""}
                        onChange={(e) =>
                          updateAction(action.id, "value", e.target.value)
                        }
                      />
                    </div>
                  )}
                  {action.type === "add_comment" && (
                    <Textarea
                      placeholder="Comment text..."
                      value={action.config.comment ?? ""}
                      onChange={(e) =>
                        updateAction(action.id, "comment", e.target.value)
                      }
                      rows={2}
                    />
                  )}
                  {action.type === "send_email" && (
                    <div className="grid gap-2">
                      <Input
                        placeholder="Recipient email or {{assignee}}"
                        value={action.config.to ?? ""}
                        onChange={(e) =>
                          updateAction(action.id, "to", e.target.value)
                        }
                      />
                      <Input
                        placeholder="Subject"
                        value={action.config.subject ?? ""}
                        onChange={(e) =>
                          updateAction(action.id, "subject", e.target.value)
                        }
                      />
                    </div>
                  )}
                  {action.type === "transition" && (
                    <Input
                      placeholder="Target status name"
                      value={action.config.targetStatus ?? ""}
                      onChange={(e) =>
                        updateAction(action.id, "targetStatus", e.target.value)
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={onCancel}>
          {tc("cancel")}
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={!name}>
            <Play className="mr-2 size-4" aria-hidden="true" />
            Test Rule
          </Button>
          <Button
            type="submit"
            disabled={isPending || !name || actions.length === 0}
          >
            {isPending ? (
              tc("loading")
            ) : (
              <>
                <Save className="mr-2 size-4" aria-hidden="true" />
                {isEditing ? tc("save") : tc("create")}
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

/**
 * Skeleton loading state for the automation rule editor.
 */
function AutomationRuleEditorSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
