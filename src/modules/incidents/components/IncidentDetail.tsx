"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  ExternalLink,
  Link as LinkIcon,
  Save,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { Separator } from "@/shared/components/ui/separator";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { EmptyState } from "@/shared/components/empty-state";
import { trpc } from "@/shared/lib/trpc";
import { cn } from "@/shared/lib/utils";

/**
 * Timeline event within an incident.
 */
interface TimelineEvent {
  id: string;
  event: string;
  author?: string;
  timestamp: string;
}

/**
 * Linked issue from the incident.
 */
interface LinkedIssue {
  id: string;
  key: string;
  summary: string;
}

const severityConfig: Record<
  string,
  { label: string; bgColor: string }
> = {
  P1: {
    label: "Critical",
    bgColor: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  P2: {
    label: "Major",
    bgColor: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  },
  P3: {
    label: "Minor",
    bgColor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  P4: {
    label: "Cosmetic",
    bgColor: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
};

interface IncidentDetailProps {
  /** Incident ID to display */
  incidentId: string;
  /** Callback to navigate back */
  onBack?: () => void;
}

/**
 * IncidentDetail renders the full detail view for an incident.
 *
 * @description Displays a header with title, severity badge, and status.
 * Includes a timeline of events, linked issues section, and editable root
 * cause and resolution fields. Provides a link to the post-mortem document.
 *
 * @param props - IncidentDetailProps
 * @returns The incident detail view
 *
 * @example
 * <IncidentDetail incidentId="inc-123" onBack={() => setView("list")} />
 */
export function IncidentDetail({ incidentId, onBack }: IncidentDetailProps) {
  const t = useTranslations("incidents");
  const tc = useTranslations("common");

  const [rootCause, setRootCause] = useState("");
  const [resolution, setResolution] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // tRPC query for incident detail
  const { data: incidentData, isLoading, error } = trpc.incident.getById.useQuery(
    { id: incidentId },
    { enabled: Boolean(incidentId) },
  );

  const updateMutation = trpc.incident.update.useMutation();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const incident = incidentData as any;

  // Populate editable fields when data loads
  if (incident && !rootCause && incident.rootCause) {
    setRootCause(incident.rootCause);
  }
  if (incident && !resolution && incident.resolution) {
    setResolution(incident.resolution);
  }

  const timeline: TimelineEvent[] = incident?.timeline ?? [];
  const linkedIssues: LinkedIssue[] = incident?.linkedIssues ?? [];
  const sevConfig = severityConfig[incident?.severity] ?? severityConfig.P3 ?? { label: "Unknown", bgColor: "" };

  const handleSaveFields = useCallback(async () => {
    if (!incident) return;
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({
        id: incidentId,
        statusPageUpdate: resolution || undefined,
      });
    } finally {
      setIsSaving(false);
    }
  }, [incidentId, resolution, updateMutation, incident]);

  if (isLoading) {
    return <IncidentDetailSkeleton />;
  }

  if (error || !incident) {
    return (
      <EmptyState
        icon={<AlertTriangle className="size-12" />}
        title={tc("error")}
        description={tc("retry")}
        action={
          <Button variant="outline" onClick={() => window.location.reload()}>
            {tc("retry")}
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} aria-label={tc("back")}>
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Button>
        )}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              {incident.title ?? incident.key}
            </h2>
            <Badge
              variant="outline"
              className={cn("border-transparent font-semibold", sevConfig.bgColor)}
            >
              <AlertTriangle className="mr-1 size-3" aria-hidden="true" />
              {incident.severity} - {sevConfig.label}
            </Badge>
            <Badge variant="outline">{incident.status}</Badge>
          </div>
          <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden="true" />
              {t("created")}:{" "}
              {new Intl.DateTimeFormat("en", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(incident.createdAt))}
            </span>
            {incident.resolvedAt && (
              <span>
                {t("resolved")}:{" "}
                {new Intl.DateTimeFormat("en", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(incident.resolvedAt))}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Timeline of events */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4" aria-hidden="true" />
              {t("timeline")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("noTimeline")}
              </p>
            ) : (
              <div
                className="relative space-y-6 ps-6"
                role="list"
                aria-label={t("timeline")}
              >
                {/* Vertical line */}
                <div className="absolute inset-y-0 left-[7px] w-0.5 bg-border" />

                {timeline.map((event) => (
                  <div
                    key={event.id}
                    className="relative flex items-start gap-3"
                    role="listitem"
                  >
                    {/* Dot */}
                    <div className="absolute -left-6 mt-1.5 size-3 rounded-full border-2 border-background bg-muted-foreground" />

                    <div className="flex-1">
                      <p className="text-sm text-foreground">{event.event}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        {event.author && <span>{event.author}</span>}
                        <span>
                          {new Intl.DateTimeFormat("en", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(event.timestamp))}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar: Linked issues + Post-mortem */}
        <div className="space-y-6">
          {/* Linked issues */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LinkIcon className="size-4" aria-hidden="true" />
                {t("linkedIssues")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {linkedIssues.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("noLinkedIssues")}
                </p>
              ) : (
                <ul className="space-y-2" role="list">
                  {linkedIssues.map((issue) => (
                    <li key={issue.id} className="flex items-center gap-2">
                      <span className="shrink-0 text-sm font-medium text-primary">
                        {issue.key}
                      </span>
                      <span className="truncate text-sm text-foreground">
                        {issue.summary}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Post-mortem link */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("postmortem")}</CardTitle>
            </CardHeader>
            <CardContent>
              {incident.postmortemUrl ? (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={incident.postmortemUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-1.5 size-3.5" aria-hidden="true" />
                    {t("viewPostmortem")}
                  </a>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("noPostmortem")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* Root cause and resolution (editable) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="root-cause">{t("rootCause")}</Label>
          <Textarea
            id="root-cause"
            value={rootCause}
            onChange={(e) => setRootCause(e.target.value)}
            placeholder={t("rootCausePlaceholder")}
            rows={4}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="resolution">{t("resolution")}</Label>
          <Textarea
            id="resolution"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder={t("resolutionPlaceholder")}
            rows={4}
          />
        </div>
      </div>

      <Button onClick={handleSaveFields} disabled={isSaving}>
        <Save className="mr-2 size-4" aria-hidden="true" />
        {isSaving ? tc("loading") : tc("save")}
      </Button>
    </div>
  );
}

/**
 * Skeleton loading state for IncidentDetail.
 */
function IncidentDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-8" />
        <div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-1 h-4 w-64" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-3 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="mt-1 h-3 w-32" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader><Skeleton className="h-5 w-28" /></CardHeader>
            <CardContent><Skeleton className="h-4 w-full" /></CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
            <CardContent><Skeleton className="h-8 w-32" /></CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
