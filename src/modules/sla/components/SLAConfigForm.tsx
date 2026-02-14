"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Plus, Save } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Switch } from "@/shared/components/ui/switch";
import { Separator } from "@/shared/components/ui/separator";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { trpc } from "@/shared/lib/trpc";

/** SLA metric types */
const SLA_METRICS = [
  { value: "time_to_first_response", label: "Time to First Response" },
  { value: "time_to_resolution", label: "Time to Resolution" },
  { value: "time_to_close", label: "Time to Close" },
] as const;

type SLAMetric = (typeof SLA_METRICS)[number]["value"];

/** Business hours presets */
const BUSINESS_HOURS_PRESETS = [
  { value: "24x7", label: "24/7" },
  { value: "business", label: "Business Hours (9-5, Mon-Fri)" },
  { value: "extended", label: "Extended (7-7, Mon-Fri)" },
] as const;

interface SLAConfigFormProps {
  /** Existing config ID for editing. Omit for creation. */
  configId?: string;
  /** Called after successful save */
  onSuccess?: () => void;
}

/** Shape of an existing SLA config from the API */
interface ExistingConfigData {
  name?: string;
  description?: string;
  metric?: SLAMetric;
  targetDuration?: number;
  calendar?: { preset?: string };
  isActive?: boolean;
}

/**
 * SLAConfigForm renders a form for creating or editing an SLA configuration.
 *
 * @description Includes fields for name, description, SLA metric, target time,
 * calendar/business hours selection, and priority/issue type conditions.
 * Uses tRPC sla.createConfig or sla.updateConfig mutations.
 *
 * @param props - SLAConfigFormProps
 * @returns SLA configuration form component
 */
export function SLAConfigForm({ configId, onSuccess }: SLAConfigFormProps) {
  const isEditing = !!configId;

  // Load existing config if editing - render inner form with key to reset state
  const { data: existingConfig, isLoading } = trpc.sla.getConfig.useQuery(
    { id: configId! },
    { enabled: isEditing },
  );

  if (isEditing && isLoading) {
    return <SLAConfigFormSkeleton />;
  }

  const initial = existingConfig
    ? (existingConfig as ExistingConfigData)
    : undefined;

  return (
    <SLAConfigFormInner
      key={configId ?? "new"}
      configId={configId}
      onSuccess={onSuccess}
      initialData={initial}
    />
  );
}

interface SLAConfigFormInnerProps {
  configId?: string;
  onSuccess?: () => void;
  initialData?: ExistingConfigData;
}

/**
 * Inner form component that initializes state from props.
 * Using key on parent ensures fresh state when switching between configs.
 */
function SLAConfigFormInner({ configId, onSuccess, initialData }: SLAConfigFormInnerProps) {
  const t = useTranslations("sla");
  const tc = useTranslations("common");
  const isEditing = !!configId;

  const initMinutes = initialData?.targetDuration ?? 0;

  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [metric, setMetric] = useState<SLAMetric>(
    (initialData?.metric as SLAMetric) ?? "time_to_first_response",
  );
  const [targetHours, setTargetHours] = useState(
    initMinutes > 0 ? String(Math.floor(initMinutes / 60)) : "",
  );
  const [targetMinutes, setTargetMinutes] = useState(
    initMinutes > 0 ? String(initMinutes % 60) : "",
  );
  const [calendarPreset, setCalendarPreset] = useState(
    initialData?.calendar?.preset ?? "business",
  );
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [priorityCondition, setPriorityCondition] = useState("");

  const createMutation = trpc.sla.createConfig.useMutation({
    onSuccess: () => onSuccess?.(),
  });

  const updateMutation = trpc.sla.updateConfig.useMutation({
    onSuccess: () => onSuccess?.(),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const targetDuration =
        parseInt(targetHours || "0", 10) * 60 +
        parseInt(targetMinutes || "0", 10);

      const payload = {
        name,
        metric,
        targetDuration,
        startCondition: {},
        stopCondition: {},
        pauseConditions: [],
        calendar: { preset: calendarPreset },
        escalationRules: [],
        isActive,
      };

      if (isEditing && configId) {
        updateMutation.mutate({ id: configId, ...payload });
      } else {
        createMutation.mutate(payload);
      }
    },
    [
      name,
      metric,
      targetHours,
      targetMinutes,
      calendarPreset,
      isActive,
      isEditing,
      configId,
      createMutation,
      updateMutation,
    ],
  );

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing ? t("title") : t("createSla")}
          </CardTitle>
          <CardDescription>
            Configure SLA targets and business hours.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="sla-name">{t("slaName")}</Label>
            <Input
              id="sla-name"
              placeholder="e.g., Critical Bug Response SLA"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              aria-required="true"
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="sla-description">Description</Label>
            <Textarea
              id="sla-description"
              placeholder="Describe the SLA purpose..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <Separator />

          {/* Metric */}
          <div className="grid gap-2">
            <Label htmlFor="sla-metric">Metric</Label>
            <Select
              value={metric}
              onValueChange={(val) => setMetric(val as SLAMetric)}
            >
              <SelectTrigger id="sla-metric" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SLA_METRICS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target time */}
          <div className="grid gap-2">
            <Label>{t("target")}</Label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={targetHours}
                  onChange={(e) => setTargetHours(e.target.value)}
                  className="w-20"
                  aria-label="Target hours"
                />
                <span className="text-sm text-muted-foreground">h</span>
              </div>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={59}
                  placeholder="0"
                  value={targetMinutes}
                  onChange={(e) => setTargetMinutes(e.target.value)}
                  className="w-20"
                  aria-label="Target minutes"
                />
                <span className="text-sm text-muted-foreground">m</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Calendar / Business hours */}
          <div className="grid gap-2">
            <Label htmlFor="sla-calendar">Business Hours</Label>
            <Select
              value={calendarPreset}
              onValueChange={setCalendarPreset}
            >
              <SelectTrigger id="sla-calendar" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_HOURS_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority condition */}
          <div className="grid gap-2">
            <Label htmlFor="sla-priority">Priority Condition</Label>
            <Select
              value={priorityCondition}
              onValueChange={setPriorityCondition}
            >
              <SelectTrigger id="sla-priority" className="w-full">
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="highest">Highest only</SelectItem>
                <SelectItem value="high">High and above</SelectItem>
                <SelectItem value="medium">Medium and above</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sla-active">Active</Label>
              <p className="text-sm text-muted-foreground">
                Enable or disable this SLA configuration.
              </p>
            </div>
            <Switch
              id="sla-active"
              checked={isActive}
              onCheckedChange={setIsActive}
              aria-label="Toggle SLA active state"
            />
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline">
            {tc("cancel")}
          </Button>
          <Button type="submit" disabled={isPending || !name}>
            {isPending ? (
              tc("loading")
            ) : isEditing ? (
              <>
                <Save className="mr-2 size-4" aria-hidden="true" />
                {tc("save")}
              </>
            ) : (
              <>
                <Plus className="mr-2 size-4" aria-hidden="true" />
                {tc("create")}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

/**
 * Skeleton loading state for the SLA config form.
 */
function SLAConfigFormSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-24" />
      </CardFooter>
    </Card>
  );
}
