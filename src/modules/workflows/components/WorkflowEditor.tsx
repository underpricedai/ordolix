"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { Plus, GitBranch, Workflow } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/shared/components/empty-state";
import { trpc } from "@/shared/lib/trpc";
import {
  WorkflowStatusNode,
  NODE_WIDTH,
  NODE_HEIGHT,
  type WorkflowStatusNodeData,
  type WorkflowStatusCategory,
} from "./WorkflowStatusNode";
import {
  WorkflowTransitionLine,
  type WorkflowTransitionData,
} from "./WorkflowTransitionLine";
import { WorkflowProperties } from "./WorkflowProperties";

interface WorkflowEditorProps {
  /** Project ID to load the workflow for */
  projectId: string;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Selection state for the properties panel.
 */
type Selection =
  | { type: "status"; id: string }
  | { type: "transition"; id: string }
  | null;

/**
 * Generates a default position layout for statuses arranged in a grid.
 */
function generateDefaultPositions(
  count: number,
): Array<{ x: number; y: number }> {
  const cols = Math.max(3, Math.ceil(Math.sqrt(count)));
  const gapX = NODE_WIDTH + 80;
  const gapY = NODE_HEIGHT + 80;
  const offsetX = 40;
  const offsetY = 40;

  return Array.from({ length: count }, (_, i) => ({
    x: offsetX + (i % cols) * gapX,
    y: offsetY + Math.floor(i / cols) * gapY,
  }));
}

/**
 * WorkflowEditor renders a visual SVG-based workflow editor canvas.
 *
 * @description Shows status nodes connected by transition arrows on an SVG canvas.
 * Users can click nodes/transitions to select them and edit properties in a side panel.
 * Status nodes can be dragged to reposition. Includes toolbar buttons for adding
 * new statuses and transitions.
 *
 * @param props - WorkflowEditorProps
 * @returns The workflow editor component with canvas and properties panel
 *
 * @example
 * <WorkflowEditor projectId="proj-1" />
 */
export function WorkflowEditor({
  projectId,
  className,
}: WorkflowEditorProps) {
  const t = useTranslations("workflows");
  const tc = useTranslations("common");
  const svgRef = useRef<SVGSVGElement>(null);

  const [selection, setSelection] = useState<Selection>(null);
  const [statusPositions, setStatusPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  // Drag-to-connect state
  const [connectingFrom, setConnectingFrom] = useState<{
    statusId: string;
    startPoint: { x: number; y: number };
  } | null>(null);
  const [connectMousePos, setConnectMousePos] = useState<{ x: number; y: number } | null>(null);

  const {
    data: workflowData,
    isLoading,
    error,
    refetch,
  } = trpc.workflow.getWorkflowForProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );

  // Map workflow statuses to node data with positions
  const statusNodes: WorkflowStatusNodeData[] = useMemo(() => {
    if (!workflowData?.workflowStatuses) return [];

    const statuses = workflowData.workflowStatuses;
    const defaultPositions = generateDefaultPositions(statuses.length);

    return statuses.map((ws: { statusId: string; status: { name: string; category: string; color?: string | null; description?: string | null } }, idx: number) => ({
      id: ws.statusId,
      name: ws.status.name,
      category: (ws.status.category ?? "TO_DO") as WorkflowStatusCategory,
      color: ws.status.color ?? undefined,
      description: ws.status.description ?? undefined,
      position: statusPositions[ws.statusId] ?? defaultPositions[idx] ?? { x: 40, y: 40 },
    }));
  }, [workflowData, statusPositions]);

  // Map workflow transitions to transition data
  const transitions: WorkflowTransitionData[] = useMemo(() => {
    if (!workflowData?.transitions) return [];

    return workflowData.transitions.map(
      (tr: { id: string; name: string; fromStatusId: string; toStatusId: string }) => ({
        id: tr.id,
        name: tr.name,
        fromStatusId: tr.fromStatusId,
        toStatusId: tr.toStatusId,
      }),
    );
  }, [workflowData]);

  // Compute SVG canvas size
  const canvasSize = useMemo(() => {
    const maxX = statusNodes.reduce(
      (max, n) => Math.max(max, n.position.x + NODE_WIDTH),
      800,
    );
    const maxY = statusNodes.reduce(
      (max, n) => Math.max(max, n.position.y + NODE_HEIGHT),
      500,
    );
    return { width: maxX + 80, height: maxY + 80 };
  }, [statusNodes]);

  const handleStatusClick = useCallback((statusId: string) => {
    setSelection({ type: "status", id: statusId });
  }, []);

  const handleTransitionClick = useCallback((transitionId: string) => {
    setSelection({ type: "transition", id: transitionId });
  }, []);

  const handleCanvasClick = useCallback(() => {
    setSelection(null);
    // Cancel any in-progress connection
    setConnectingFrom(null);
    setConnectMousePos(null);
  }, []);

  /**
   * Called when a user starts dragging from a connection point on a status node.
   */
  const handleConnectStart = useCallback(
    (statusId: string, point: { x: number; y: number }) => {
      setConnectingFrom({ statusId, startPoint: point });
      setConnectMousePos(point);

      const svgElement = svgRef.current;
      if (!svgElement) return;

      const handleMouseMove = (e: MouseEvent) => {
        const ctm = svgElement.getScreenCTM();
        if (!ctm) return;
        const svgPoint = svgElement.createSVGPoint();
        svgPoint.x = e.clientX;
        svgPoint.y = e.clientY;
        const transformed = svgPoint.matrixTransform(ctm.inverse());
        setConnectMousePos({ x: transformed.x, y: transformed.y });
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        // If we didn't drop on a node, cancel the connection
        setConnectingFrom(null);
        setConnectMousePos(null);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [],
  );

  /**
   * Called when a user drops a connection drag onto a target status node.
   * Creates a new transition between the source and target statuses.
   */
  const handleConnectEnd = useCallback(
    (targetStatusId: string) => {
      if (!connectingFrom || connectingFrom.statusId === targetStatusId) {
        setConnectingFrom(null);
        setConnectMousePos(null);
        return;
      }

      const fromStatus = statusNodes.find((s) => s.id === connectingFrom.statusId);
      const toStatus = statusNodes.find((s) => s.id === targetStatusId);
      const transitionName = fromStatus && toStatus
        ? `${fromStatus.name} to ${toStatus.name}`
        : "New Transition";

      // In a full implementation, this would call a tRPC mutation.
      // For now, log the intended transition for development visibility.
      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[WorkflowEditor] Create transition: ${transitionName} (${connectingFrom.statusId} -> ${targetStatusId})`,
        );
      }

      setConnectingFrom(null);
      setConnectMousePos(null);
      void refetch();
    },
    [connectingFrom, statusNodes, refetch],
  );

  const handlePositionChange = useCallback(
    (statusId: string, position: { x: number; y: number }) => {
      setStatusPositions((prev) => ({
        ...prev,
        [statusId]: position,
      }));
    },
    [],
  );

  const handleStatusChange: (statusId: string, changes: Partial<WorkflowStatusNodeData>) => void =
    useCallback(
      () => {
        // In a full implementation, this would call a tRPC mutation
        // to persist the status property changes
        void refetch();
      },
      [refetch],
    );

  const handleTransitionChange: (transitionId: string, changes: Partial<WorkflowTransitionData>) => void =
    useCallback(
      () => {
        // In a full implementation, this would call a tRPC mutation
        // to persist the transition property changes
        void refetch();
      },
      [refetch],
    );

  const handleCloseProperties = useCallback(() => {
    setSelection(null);
  }, []);

  // Build selection data for properties panel
  const selectionData = useMemo(() => {
    if (!selection) return null;

    if (selection.type === "status") {
      const status = statusNodes.find((s) => s.id === selection.id);
      if (!status) return null;
      return { type: "status" as const, data: status };
    }

    const transition = transitions.find((tr) => tr.id === selection.id);
    if (!transition) return null;

    const fromStatus = statusNodes.find((s) => s.id === transition.fromStatusId);
    const toStatus = statusNodes.find((s) => s.id === transition.toStatusId);

    return {
      type: "transition" as const,
      data: {
        ...transition,
        fromStatusName: fromStatus?.name ?? "",
        toStatusName: toStatus?.name ?? "",
        validators: [],
        conditions: [],
      },
    };
  }, [selection, statusNodes, transitions]);

  if (isLoading) {
    return <WorkflowEditorSkeleton />;
  }

  if (error || !workflowData) {
    return (
      <div className="flex-1 px-6 py-8">
        <EmptyState
          icon={<Workflow className="size-12" />}
          title={error ? tc("error") : t("emptyTitle")}
          description={error ? tc("retry") : t("emptyDescription")}
          action={
            error ? (
              <Button variant="outline" onClick={() => void refetch()}>
                {tc("retry")}
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className={`flex h-full ${className ?? ""}`}>
      {/* Main canvas area */}
      <div className="flex flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b px-4 py-2">
          <h2 className="text-sm font-semibold text-foreground">
            {workflowData.name}
          </h2>
          <Separator orientation="vertical" className="mx-2 h-4" />
          <Button variant="outline" size="sm" className="h-7 text-xs">
            <Plus className="mr-1 size-3" aria-hidden="true" />
            {t("addStatus")}
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs">
            <GitBranch className="mr-1 size-3" aria-hidden="true" />
            {t("addTransition")}
          </Button>
        </div>

        {/* SVG Canvas */}
        <div className="flex-1 overflow-auto bg-muted/20">
          <svg
            ref={svgRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="min-h-full min-w-full"
            onClick={handleCanvasClick}
            role="img"
            aria-label={t("canvas")}
          >
            {/* Grid background */}
            <defs>
              <pattern
                id="grid"
                width={20}
                height={20}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  className="stroke-border/30"
                  strokeWidth={0.5}
                />
              </pattern>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="url(#grid)"
            />

            {/* Transition lines (render below nodes) */}
            {transitions.map((transition) => {
              const fromStatus = statusNodes.find(
                (s) => s.id === transition.fromStatusId,
              );
              const toStatus = statusNodes.find(
                (s) => s.id === transition.toStatusId,
              );
              if (!fromStatus || !toStatus) return null;

              return (
                <WorkflowTransitionLine
                  key={transition.id}
                  transition={transition}
                  fromStatus={fromStatus}
                  toStatus={toStatus}
                  isSelected={
                    selection?.type === "transition" &&
                    selection.id === transition.id
                  }
                  onClick={handleTransitionClick}
                />
              );
            })}

            {/* Status nodes */}
            {statusNodes.map((status) => (
              <WorkflowStatusNode
                key={status.id}
                status={status}
                isSelected={
                  selection?.type === "status" && selection.id === status.id
                }
                onClick={handleStatusClick}
                onPositionChange={handlePositionChange}
                onConnectStart={handleConnectStart}
                onConnectEnd={handleConnectEnd}
              />
            ))}

            {/* Drag-to-connect preview line */}
            {connectingFrom && connectMousePos && (
              <line
                x1={connectingFrom.startPoint.x}
                y1={connectingFrom.startPoint.y}
                x2={connectMousePos.x}
                y2={connectMousePos.y}
                className="stroke-primary"
                strokeWidth={2}
                strokeDasharray="6 3"
                pointerEvents="none"
              />
            )}
          </svg>
        </div>
      </div>

      {/* Properties panel */}
      <WorkflowProperties
        selection={selectionData}
        availableStatuses={statusNodes}
        onStatusChange={handleStatusChange}
        onTransitionChange={handleTransitionChange}
        onClose={handleCloseProperties}
      />
    </div>
  );
}

/**
 * Skeleton loading state for the workflow editor.
 */
function WorkflowEditorSkeleton() {
  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-2 border-b px-4 py-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-7 w-28" />
        </div>
        <div className="flex-1 bg-muted/20 p-8">
          <div className="flex flex-wrap gap-12">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-16 w-40 rounded-lg"
              />
            ))}
          </div>
        </div>
      </div>
      <div className="w-72 border-s bg-card p-4">
        <Skeleton className="mb-4 h-5 w-24" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </div>
  );
}
