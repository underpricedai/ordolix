"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Separator } from "@/shared/components/ui/separator";
import { Switch } from "@/shared/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import type { WorkflowStatusNodeData, WorkflowStatusCategory } from "./WorkflowStatusNode";
import type { WorkflowTransitionData } from "./WorkflowTransitionLine";

/**
 * Known validator types with their configurable options.
 */
const VALIDATOR_TYPES = [
  { value: "required_field", label: "Required Field" },
  { value: "no_open_subtasks", label: "No Open Subtasks" },
] as const;


/**
 * Selection types for the properties panel.
 */
type SelectionType =
  | { type: "status"; data: WorkflowStatusNodeData }
  | { type: "transition"; data: WorkflowTransitionData & {
      fromStatusName: string;
      toStatusName: string;
      validators?: Array<{ type: string; config: Record<string, unknown> }>;
      conditions?: Array<{ type: string; config: Record<string, unknown> }>;
    } }
  | null;

interface WorkflowPropertiesProps {
  /** Currently selected item (status or transition) */
  selection: SelectionType;
  /** Available statuses for transition source/target dropdowns */
  availableStatuses: WorkflowStatusNodeData[];
  /** Callback when a status property changes */
  onStatusChange?: (statusId: string, changes: Partial<WorkflowStatusNodeData>) => void;
  /** Callback when a transition property changes */
  onTransitionChange?: (transitionId: string, changes: Partial<WorkflowTransitionData>) => void;
  /** Callback to close the properties panel */
  onClose?: () => void;
}

/**
 * WorkflowProperties renders a side panel showing editable properties
 * for the currently selected status or transition in the workflow editor.
 *
 * @description When a status is selected, shows name, category, color, and
 * description fields. When a transition is selected, shows name, source/target
 * statuses, validators, and conditions. All changes are propagated up via callbacks.
 *
 * @param props - WorkflowPropertiesProps
 * @returns A properties panel component
 *
 * @example
 * <WorkflowProperties
 *   selection={{ type: "status", data: statusData }}
 *   availableStatuses={statuses}
 *   onStatusChange={handleStatusChange}
 *   onClose={handleClose}
 * />
 */
export function WorkflowProperties({
  selection,
  availableStatuses,
  onStatusChange,
  onTransitionChange,
  onClose,
}: WorkflowPropertiesProps) {
  const t = useTranslations("workflows");
  const tc = useTranslations("common");

  if (!selection) {
    return (
      <div className="flex h-full w-72 flex-col items-center justify-center border-s bg-muted/20 p-6">
        <p className="text-sm text-muted-foreground text-center">
          {t("noSelection")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-72 flex-col border-s bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">
          {selection.type === "status"
            ? t("statusProperties")
            : t("transitionProperties")}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onClose}
          aria-label={tc("close")}
        >
          <X className="size-3.5" aria-hidden="true" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 p-4">
          {selection.type === "status" ? (
            <StatusProperties
              key={selection.data.id}
              status={selection.data}
              onStatusChange={onStatusChange}
            />
          ) : (
            <TransitionProperties
              key={selection.data.id}
              transition={selection.data}
              availableStatuses={availableStatuses}
              onTransitionChange={onTransitionChange}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

/**
 * Editable properties for a workflow status node.
 */
function StatusProperties({
  status,
  onStatusChange,
}: {
  status: WorkflowStatusNodeData;
  onStatusChange?: (statusId: string, changes: Partial<WorkflowStatusNodeData>) => void;
}) {
  const t = useTranslations("workflows");

  const [name, setName] = useState(status.name);
  const [category, setCategory] = useState<WorkflowStatusCategory>(status.category);
  const [color, setColor] = useState(status.color ?? "");
  const [description, setDescription] = useState(status.description ?? "");

  const handleNameBlur = useCallback(() => {
    if (name !== status.name && name.trim()) {
      onStatusChange?.(status.id, { name: name.trim() });
    }
  }, [name, status.id, status.name, onStatusChange]);

  const handleCategoryChange = useCallback(
    (value: string) => {
      const newCategory = value as WorkflowStatusCategory;
      setCategory(newCategory);
      onStatusChange?.(status.id, { category: newCategory });
    },
    [status.id, onStatusChange],
  );

  const handleColorBlur = useCallback(() => {
    if (color !== (status.color ?? "")) {
      onStatusChange?.(status.id, { color: color || undefined });
    }
  }, [color, status.id, status.color, onStatusChange]);

  const handleDescriptionBlur = useCallback(() => {
    if (description !== (status.description ?? "")) {
      onStatusChange?.(status.id, { description: description || undefined });
    }
  }, [description, status.id, status.description, onStatusChange]);

  return (
    <>
      {/* Name */}
      <div className="grid gap-1.5">
        <Label htmlFor="status-name" className="text-xs">
          {t("statusName")}
        </Label>
        <Input
          id="status-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameBlur}
          placeholder={t("statusNamePlaceholder")}
          className="h-8 text-sm"
        />
      </div>

      {/* Category */}
      <div className="grid gap-1.5">
        <Label htmlFor="status-category" className="text-xs">
          {t("statusCategory")}
        </Label>
        <Select value={category} onValueChange={handleCategoryChange}>
          <SelectTrigger id="status-category" className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TO_DO">{t("categories.TO_DO")}</SelectItem>
            <SelectItem value="IN_PROGRESS">{t("categories.IN_PROGRESS")}</SelectItem>
            <SelectItem value="DONE">{t("categories.DONE")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Color */}
      <div className="grid gap-1.5">
        <Label htmlFor="status-color" className="text-xs">
          {t("statusColor")}
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="status-color"
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            onBlur={handleColorBlur}
            placeholder={t("statusColorPlaceholder")}
            className="h-8 flex-1 text-sm"
          />
          {color && (
            <div
              className="size-8 shrink-0 rounded-md border"
              style={{ backgroundColor: color }}
              aria-label={`Color preview: ${color}`}
            />
          )}
        </div>
      </div>

      <Separator />

      {/* Description */}
      <div className="grid gap-1.5">
        <Label htmlFor="status-description" className="text-xs">
          {t("statusDescription")}
        </Label>
        <Textarea
          id="status-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleDescriptionBlur}
          placeholder={t("statusDescriptionPlaceholder")}
          rows={3}
          className="text-sm"
        />
      </div>
    </>
  );
}

/**
 * Editable properties for a workflow transition.
 */
function TransitionProperties({
  transition,
  availableStatuses,
  onTransitionChange,
}: {
  transition: WorkflowTransitionData & {
    fromStatusName: string;
    toStatusName: string;
    validators?: Array<{ type: string; config: Record<string, unknown> }>;
    conditions?: Array<{ type: string; config: Record<string, unknown> }>;
  };
  availableStatuses: WorkflowStatusNodeData[];
  onTransitionChange?: (transitionId: string, changes: Partial<WorkflowTransitionData>) => void;
}) {
  const t = useTranslations("workflows");

  const [name, setName] = useState(transition.name);
  const [validators, setValidators] = useState<
    Array<{ type: string; config: Record<string, unknown> }>
  >(transition.validators ?? []);
  const [conditions, setConditions] = useState<
    Array<{ type: string; config: Record<string, unknown> }>
  >(transition.conditions ?? []);

  const handleNameBlur = useCallback(() => {
    if (name !== transition.name && name.trim()) {
      onTransitionChange?.(transition.id, { name: name.trim() });
    }
  }, [name, transition.id, transition.name, onTransitionChange]);

  const handleSourceChange = useCallback(
    (value: string) => {
      onTransitionChange?.(transition.id, { fromStatusId: value });
    },
    [transition.id, onTransitionChange],
  );

  const handleTargetChange = useCallback(
    (value: string) => {
      onTransitionChange?.(transition.id, { toStatusId: value });
    },
    [transition.id, onTransitionChange],
  );

  /**
   * Adds a new validator of the given type with a default config.
   */
  const handleAddValidator = useCallback(
    (type: string) => {
      const defaultConfig: Record<string, unknown> =
        type === "required_field"
          ? { fieldName: "" }
          : type === "no_open_subtasks"
            ? { enabled: true }
            : {};
      const updated = [...validators, { type, config: defaultConfig }];
      setValidators(updated);
    },
    [validators],
  );

  /**
   * Removes a validator at the given index.
   */
  const handleRemoveValidator = useCallback(
    (idx: number) => {
      const updated = validators.filter((_, i) => i !== idx);
      setValidators(updated);
    },
    [validators],
  );

  /**
   * Updates the config for a specific validator.
   */
  const handleValidatorConfigChange = useCallback(
    (idx: number, key: string, value: unknown) => {
      const updated = validators.map((v, i) =>
        i === idx ? { ...v, config: { ...v.config, [key]: value } } : v,
      );
      setValidators(updated);
    },
    [validators],
  );

  /**
   * Adds a new condition of the given type with a default config.
   */
  const handleAddCondition = useCallback(
    (type: string) => {
      const updated = [...conditions, { type, config: {} }];
      setConditions(updated);
    },
    [conditions],
  );

  /**
   * Removes a condition at the given index.
   */
  const handleRemoveCondition = useCallback(
    (idx: number) => {
      const updated = conditions.filter((_, i) => i !== idx);
      setConditions(updated);
    },
    [conditions],
  );

  return (
    <>
      {/* Name */}
      <div className="grid gap-1.5">
        <Label htmlFor="transition-name" className="text-xs">
          {t("transitionName")}
        </Label>
        <Input
          id="transition-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameBlur}
          placeholder={t("transitionNamePlaceholder")}
          className="h-8 text-sm"
        />
      </div>

      {/* From Status */}
      <div className="grid gap-1.5">
        <Label htmlFor="transition-from" className="text-xs">
          {t("fromStatus")}
        </Label>
        <Select
          value={transition.fromStatusId}
          onValueChange={handleSourceChange}
        >
          <SelectTrigger id="transition-from" className="h-8 text-sm">
            <SelectValue placeholder={t("selectStatus")} />
          </SelectTrigger>
          <SelectContent>
            {availableStatuses.map((status) => (
              <SelectItem key={status.id} value={status.id}>
                {status.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* To Status */}
      <div className="grid gap-1.5">
        <Label htmlFor="transition-to" className="text-xs">
          {t("toStatus")}
        </Label>
        <Select
          value={transition.toStatusId}
          onValueChange={handleTargetChange}
        >
          <SelectTrigger id="transition-to" className="h-8 text-sm">
            <SelectValue placeholder={t("selectStatus")} />
          </SelectTrigger>
          <SelectContent>
            {availableStatuses.map((status) => (
              <SelectItem key={status.id} value={status.id}>
                {status.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Validators */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">{t("validators")}</Label>
          <Select onValueChange={handleAddValidator}>
            <SelectTrigger className="h-7 w-7 p-0 [&>svg:last-child]:hidden" aria-label={t("addValidator")}>
              <Plus className="size-3.5" aria-hidden="true" />
            </SelectTrigger>
            <SelectContent>
              {VALIDATOR_TYPES.map((vt) => (
                <SelectItem key={vt.value} value={vt.value}>
                  {vt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {validators.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("noTransitions")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {validators.map((validator, idx) => (
              <div
                key={`${validator.type}-${idx}`}
                className="rounded-md border bg-muted/30 p-2"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Badge variant="secondary" className="text-xs">
                    {VALIDATOR_TYPES.find((vt) => vt.value === validator.type)?.label ?? validator.type}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={() => handleRemoveValidator(idx)}
                    aria-label={t("removeValidator")}
                  >
                    <Trash2 className="size-3" aria-hidden="true" />
                  </Button>
                </div>

                {/* Validator-specific config fields */}
                {validator.type === "required_field" && (
                  <div className="grid gap-1">
                    <Label htmlFor={`validator-field-${idx}`} className="text-[11px] text-muted-foreground">
                      {t("fieldName")}
                    </Label>
                    <Input
                      id={`validator-field-${idx}`}
                      value={(validator.config.fieldName as string) ?? ""}
                      onChange={(e) => handleValidatorConfigChange(idx, "fieldName", e.target.value)}
                      placeholder="e.g. assigneeId, resolution"
                      className="h-7 text-xs"
                    />
                  </div>
                )}

                {validator.type === "no_open_subtasks" && (
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`validator-enabled-${idx}`}
                      checked={(validator.config.enabled as boolean) ?? true}
                      onCheckedChange={(checked) => handleValidatorConfigChange(idx, "enabled", checked)}
                    />
                    <Label htmlFor={`validator-enabled-${idx}`} className="text-[11px] text-muted-foreground">
                      {t("enabled")}
                    </Label>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conditions */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">{t("conditions")}</Label>
          <Select onValueChange={handleAddCondition}>
            <SelectTrigger className="h-7 w-7 p-0 [&>svg:last-child]:hidden" aria-label={t("addCondition")}>
              <Plus className="size-3.5" aria-hidden="true" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user_in_group">User in Group</SelectItem>
              <SelectItem value="only_assignee">Only Assignee</SelectItem>
              <SelectItem value="permission_check">Permission Check</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {conditions.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("noTransitions")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {conditions.map((condition, idx) => (
              <div
                key={`${condition.type}-${idx}`}
                className="flex items-center justify-between rounded-md border bg-muted/30 p-2"
              >
                <Badge variant="secondary" className="text-xs">
                  {condition.type}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => handleRemoveCondition(idx)}
                  aria-label={t("removeCondition")}
                >
                  <Trash2 className="size-3" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
