/**
 * Project-scoped backlog page with drag-and-drop.
 *
 * @description Jira-style backlog view showing sprint sections and a backlog
 * section. Issues can be dragged between sprints and the backlog using
 * @dnd-kit. Each sprint section is collapsible and shows issue count and
 * total story points. The backlog section holds unassigned issues.
 *
 * @module project-backlog-page
 */
"use client";

import { use, useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Plus,
  Search,
  ListTodo,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Zap,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { AppHeader } from "@/shared/components/app-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import {
  StatusBadge,
  type StatusCategory,
} from "@/shared/components/status-badge";
import {
  PriorityIcon,
  type PriorityLevel,
} from "@/shared/components/priority-icon";
import { trpc } from "@/shared/lib/trpc";
import { cn } from "@/shared/lib/utils";
import { usePeek } from "@/shared/providers/peek-provider";

// ── Types ─────────────────────────────────────────────────────────────────

/**
 * Shape of an issue as returned by the list query (with included relations).
 */
interface BacklogIssue {
  id: string;
  key: string;
  summary: string;
  sprintId: string | null;
  storyPoints: number | null;
  status: {
    id: string;
    name: string;
    category: StatusCategory;
  } | null;
  priority: {
    id: string;
    name: string;
    rank: number;
  } | null;
  assignee: {
    id: string;
    name: string | null;
    image?: string | null;
  } | null;
  issueType: {
    id: string;
    name: string;
    icon?: string | null;
  } | null;
}

/**
 * Shape of a sprint as returned by the sprint list query.
 */
interface BacklogSprint {
  id: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  goal: string | null;
  _count: {
    issues: number;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Maps a priority name to the PriorityLevel union type.
 */
function toPriorityLevel(name: string): PriorityLevel {
  const normalized = name.toLowerCase() as PriorityLevel;
  const validLevels: PriorityLevel[] = [
    "highest",
    "high",
    "medium",
    "low",
    "lowest",
  ];
  return validLevels.includes(normalized) ? normalized : "medium";
}

/** Droppable ID for the backlog section. */
const BACKLOG_DROPPABLE_ID = "backlog";

// ── DraggableIssueRow ─────────────────────────────────────────────────────

interface DraggableIssueRowProps {
  issue: BacklogIssue;
  onClick: (issueId: string) => void;
}

/**
 * A single draggable issue row rendered inside a sprint or backlog section.
 *
 * @description Displays the issue key, summary, status badge, priority icon,
 * and story points. Has a drag handle (GripVertical) on the left. Clicking
 * opens the issue peek panel.
 */
function DraggableIssueRow({ issue, onClick }: DraggableIssueRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: issue.id,
    data: { issue },
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-md border bg-card px-3 py-2 transition-colors hover:bg-accent/50",
        isDragging && "opacity-30",
      )}
      role="button"
      tabIndex={0}
      aria-label={`${issue.key}: ${issue.summary}`}
      onClick={() => onClick(issue.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(issue.id);
        }
      }}
    >
      {/* Drag handle */}
      <button
        className="cursor-grab touch-none text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...listeners}
        {...attributes}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>

      {/* Issue type icon placeholder + key */}
      <span className="shrink-0 text-xs font-medium text-primary">
        {issue.key}
      </span>

      {/* Summary */}
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
        {issue.summary}
      </span>

      {/* Status badge */}
      {issue.status && (
        <StatusBadge
          name={issue.status.name}
          category={issue.status.category}
          className="shrink-0"
        />
      )}

      {/* Priority icon */}
      {issue.priority && (
        <PriorityIcon
          priority={toPriorityLevel(issue.priority.name)}
          className="shrink-0"
        />
      )}

      {/* Story points */}
      <span className="w-8 shrink-0 text-center text-xs text-muted-foreground">
        {issue.storyPoints ?? ""}
      </span>
    </div>
  );
}

// ── DroppableSection ──────────────────────────────────────────────────────

interface DroppableSectionProps {
  /** Unique droppable ID (sprint ID or "backlog") */
  droppableId: string;
  /** Section header label */
  label: string;
  /** Status badge text (e.g., "Active", "Future") */
  statusLabel?: string;
  /** Status badge variant */
  statusVariant?: "default" | "secondary" | "outline";
  /** Number of issues in the section */
  issueCount: number;
  /** Total story points in the section */
  totalPoints: number;
  /** Whether the section is collapsed */
  collapsed: boolean;
  /** Toggle collapse */
  onToggleCollapse: () => void;
  /** Action button (e.g., "Start Sprint") */
  action?: React.ReactNode;
  /** The issue rows to render inside the section */
  children: React.ReactNode;
  /** Empty state message shown when expanded and no children */
  emptyMessage?: string;
  /** Whether the current drag is over this section */
  isOver?: boolean;
}

/**
 * A droppable container representing either a sprint or the backlog section.
 *
 * @description Renders a collapsible header with sprint name, status badge,
 * issue count, story points total, and optional action button. The body area
 * is a drop target for issue rows.
 */
function DroppableSection({
  droppableId,
  label,
  statusLabel,
  statusVariant = "secondary",
  issueCount,
  totalPoints,
  collapsed,
  onToggleCollapse,
  action,
  children,
  emptyMessage,
  isOver,
}: DroppableSectionProps) {
  const t = useTranslations("projectPages.backlog");
  const { setNodeRef } = useDroppable({
    id: droppableId,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border transition-colors",
        isOver && "border-primary/50 bg-primary/5",
      )}
    >
      {/* Section header */}
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/50"
        onClick={onToggleCollapse}
        aria-expanded={!collapsed}
        aria-controls={`section-${droppableId}`}
      >
        {collapsed ? (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}

        <span className="text-sm font-semibold text-foreground">{label}</span>

        {statusLabel && (
          <Badge variant={statusVariant} className="text-[10px] uppercase">
            {statusLabel}
          </Badge>
        )}

        <span className="text-xs text-muted-foreground">
          {t("issueCount", { count: issueCount })}
        </span>

        {totalPoints > 0 && (
          <span className="text-xs text-muted-foreground">
            {t("storyPointsTotal", { points: totalPoints })}
          </span>
        )}

        {/* Spacer to push action to the right */}
        <span className="flex-1" />

        {/* Action button (stop event propagation to prevent collapse toggle) */}
        {action && (
          <span
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {action}
          </span>
        )}
      </button>

      {/* Section body */}
      {!collapsed && (
        <div
          id={`section-${droppableId}`}
          className="flex flex-col gap-1 px-3 pb-3"
        >
          {issueCount === 0 && emptyMessage ? (
            <div className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}

// ── DragOverlayCard ───────────────────────────────────────────────────────

interface DragOverlayCardProps {
  issue: BacklogIssue;
}

/**
 * Simplified issue card displayed while dragging.
 *
 * @description Shows issue key and summary in a floating card with a shadow.
 */
function DragOverlayCard({ issue }: DragOverlayCardProps) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 shadow-lg">
      <GripVertical className="size-4 text-muted-foreground" aria-hidden="true" />
      <span className="text-xs font-medium text-primary">{issue.key}</span>
      <span className="truncate text-sm text-foreground">{issue.summary}</span>
      {issue.status && (
        <StatusBadge
          name={issue.status.name}
          category={issue.status.category}
          className="shrink-0"
        />
      )}
      {issue.priority && (
        <PriorityIcon
          priority={toPriorityLevel(issue.priority.name)}
          className="shrink-0"
        />
      )}
      <span className="w-8 shrink-0 text-center text-xs text-muted-foreground">
        {issue.storyPoints ?? ""}
      </span>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────

export default function ProjectBacklogPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = use(params);
  const t = useTranslations("projectPages.backlog");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");
  const { openPeek } = usePeek();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeDragIssue, setActiveDragIssue] = useState<BacklogIssue | null>(
    null,
  );
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  const breadcrumbs = [
    { label: tn("projects"), href: "/projects" },
    { label: key.toUpperCase(), href: `/projects/${key}` },
    { label: tn("backlog") },
  ];

  // ── Data fetching ─────────────────────────────────────────────────────

  const { data: project, isLoading: projectLoading } =
    trpc.project.getByKey.useQuery({ key });

  const projectId = project?.id;

  const {
    data: issuesData,
    isLoading: issuesLoading,
    error: issuesError,
  } = trpc.issue.list.useQuery(
    {
      projectId: projectId!,
      limit: 100,
      sortBy: "rank" as const,
      sortOrder: "asc" as const,
    },
    { enabled: !!projectId },
  );

  const {
    data: sprintsData,
    isLoading: sprintsLoading,
  } = trpc.sprint.list.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId },
  );

  const isLoading = projectLoading || issuesLoading || sprintsLoading;
  const allIssues: BacklogIssue[] = useMemo(() => {
    const issuesResult = issuesData as
      | { items?: BacklogIssue[] }
      | undefined;
    return issuesResult?.items ?? [];
  }, [issuesData]);
  const sprints: BacklogSprint[] = useMemo(
    () => (sprintsData ?? []) as BacklogSprint[],
    [sprintsData],
  );

  // ── Issue update mutation (optimistic) ────────────────────────────────

  const utils = trpc.useUtils();
  const updateIssueMutation = trpc.issue.update.useMutation({
    onSuccess: () => {
      void utils.issue.list.invalidate();
      void utils.sprint.list.invalidate();
    },
  });

  // ── Computed data ─────────────────────────────────────────────────────

  // Filter non-completed sprints, order active first, then planning
  const visibleSprints = useMemo(() => {
    return sprints
      .filter((s) => s.status !== "completed" && s.status !== "cancelled")
      .sort((a, b) => {
        const order: Record<string, number> = { active: 0, planning: 1 };
        return (order[a.status] ?? 2) - (order[b.status] ?? 2);
      });
  }, [sprints]);

  // Client-side filter for search
  const filteredIssues = useMemo(() => {
    if (!searchQuery.trim()) return allIssues;
    const q = searchQuery.toLowerCase();
    return allIssues.filter(
      (issue) =>
        issue.key.toLowerCase().includes(q) ||
        issue.summary.toLowerCase().includes(q),
    );
  }, [allIssues, searchQuery]);

  // Bucket issues into sprint sections and backlog
  const issuesBySprint = useMemo(() => {
    const map: Record<string, BacklogIssue[]> = {};
    for (const sprint of visibleSprints) {
      map[sprint.id] = [];
    }
    map[BACKLOG_DROPPABLE_ID] = [];

    for (const issue of filteredIssues) {
      const sprintId = issue.sprintId;
      if (sprintId && map[sprintId]) {
        map[sprintId].push(issue);
      } else {
        map[BACKLOG_DROPPABLE_ID].push(issue);
      }
    }
    return map;
  }, [filteredIssues, visibleSprints]);

  // ── Drag-and-drop handlers ────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const issue = event.active.data.current?.issue as
        | BacklogIssue
        | undefined;
      if (issue) {
        setActiveDragIssue(issue);
      }
    },
    [],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragIssue(null);

      const { active, over } = event;
      if (!over) return;

      const issue = active.data.current?.issue as BacklogIssue | undefined;
      if (!issue) return;

      const targetId = String(over.id);

      // Determine the new sprintId
      const newSprintId =
        targetId === BACKLOG_DROPPABLE_ID ? null : targetId;

      // No change needed if already in the target
      if (issue.sprintId === newSprintId) return;

      // Optimistic update: update the local allIssues cache
      utils.issue.list.setData(
        { projectId: projectId!, limit: 100, sortBy: "rank", sortOrder: "asc" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            items: (old.items ?? []).map((i: any) =>
              i.id === issue.id ? { ...i, sprintId: newSprintId } : i,
            ),
          };
        },
      );

      // Fire the mutation
      updateIssueMutation.mutate(
        { id: issue.id, sprintId: newSprintId },
        {
          onError: () => {
            // Revert on error by re-fetching
            void utils.issue.list.invalidate();
          },
        },
      );
    },
    [projectId, updateIssueMutation, utils.issue.list],
  );

  // ── Section collapse toggle ───────────────────────────────────────────

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  // ── Helpers for sprint display ────────────────────────────────────────

  const getSprintStatusLabel = useCallback(
    (status: string) => {
      switch (status) {
        case "active":
          return t("sprintActive");
        case "planning":
          return t("sprintFuture");
        case "completed":
          return t("sprintCompleted");
        default:
          return status;
      }
    },
    [t],
  );

  const getSprintStatusVariant = (
    status: string,
  ): "default" | "secondary" | "outline" => {
    switch (status) {
      case "active":
        return "default";
      case "planning":
        return "secondary";
      default:
        return "outline";
    }
  };

  const calcTotalPoints = useCallback((issues: BacklogIssue[]) => {
    return issues.reduce(
      (sum, issue) => sum + (issue.storyPoints ?? 0),
      0,
    );
  }, []);

  const handleIssueClick = useCallback(
    (issueId: string) => {
      openPeek(issueId);
    },
    [openPeek],
  );

  // ── Render ────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <>
        <AppHeader breadcrumbs={breadcrumbs} />
        <div className="flex-1 space-y-4 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full max-w-md" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
              {Array.from({ length: 2 }).map((_, j) => (
                <Skeleton key={j} className="h-10 w-full" />
              ))}
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader breadcrumbs={breadcrumbs} />
      <div className="flex-1 space-y-4 p-6">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {key.toUpperCase()} {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("pageDescription")}
            </p>
          </div>
          <Button>
            <Plus className="mr-2 size-4" aria-hidden="true" />
            {t("createIssue")}
          </Button>
        </div>

        {/* Search bar */}
        <div className="relative max-w-md">
          <Search
            className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label={t("searchPlaceholder")}
          />
        </div>

        {/* Error state */}
        {issuesError ? (
          <EmptyState
            icon={<ListTodo className="size-12" />}
            title={tc("error")}
            description={tc("retry")}
            action={
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                {tc("retry")}
              </Button>
            }
          />
        ) : (
          /* Drag-and-drop context wrapping all sections */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-3">
              {/* Sprint sections */}
              {visibleSprints.map((sprint) => {
                const sectionIssues =
                  issuesBySprint[sprint.id] ?? [];
                const totalPoints = calcTotalPoints(sectionIssues);
                const isCollapsed =
                  collapsedSections[sprint.id] ?? false;

                return (
                  <DroppableSection
                    key={sprint.id}
                    droppableId={sprint.id}
                    label={sprint.name}
                    statusLabel={getSprintStatusLabel(sprint.status)}
                    statusVariant={getSprintStatusVariant(sprint.status)}
                    issueCount={sectionIssues.length}
                    totalPoints={totalPoints}
                    collapsed={isCollapsed}
                    onToggleCollapse={() => toggleSection(sprint.id)}
                    isOver={
                      activeDragIssue !== null &&
                      activeDragIssue.sprintId !== sprint.id
                    }
                    emptyMessage={t("dropHere")}
                    action={
                      sprint.status === "planning" ? (
                        <Button variant="outline" size="sm">
                          <Zap
                            className="mr-1.5 size-3.5"
                            aria-hidden="true"
                          />
                          {t("startSprint")}
                        </Button>
                      ) : undefined
                    }
                  >
                    {sectionIssues.map((issue) => (
                      <DraggableIssueRow
                        key={issue.id}
                        issue={issue}
                        onClick={handleIssueClick}
                      />
                    ))}
                  </DroppableSection>
                );
              })}

              {/* Backlog section */}
              <DroppableSection
                droppableId={BACKLOG_DROPPABLE_ID}
                label={t("backlogSection")}
                issueCount={
                  (issuesBySprint[BACKLOG_DROPPABLE_ID] ?? []).length
                }
                totalPoints={calcTotalPoints(
                  issuesBySprint[BACKLOG_DROPPABLE_ID] ?? [],
                )}
                collapsed={
                  collapsedSections[BACKLOG_DROPPABLE_ID] ?? false
                }
                onToggleCollapse={() =>
                  toggleSection(BACKLOG_DROPPABLE_ID)
                }
                isOver={
                  activeDragIssue !== null &&
                  activeDragIssue.sprintId !== null
                }
                emptyMessage={t("noIssuesDescription")}
              >
                {(issuesBySprint[BACKLOG_DROPPABLE_ID] ?? []).map(
                  (issue) => (
                    <DraggableIssueRow
                      key={issue.id}
                      issue={issue}
                      onClick={handleIssueClick}
                    />
                  ),
                )}
              </DroppableSection>
            </div>

            {/* Drag overlay — rendered at root portal level by DndContext */}
            <DragOverlay dropAnimation={null}>
              {activeDragIssue ? (
                <DragOverlayCard issue={activeDragIssue} />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Hint text */}
        {allIssues.length > 0 && (
          <p className="text-xs text-muted-foreground">{t("dragToSprint")}</p>
        )}
      </div>
    </>
  );
}
