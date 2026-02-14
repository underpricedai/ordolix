"use client";

import { useCallback, useMemo } from "react";
import { cn } from "@/shared/lib/utils";
import { NODE_WIDTH, NODE_HEIGHT, type WorkflowStatusNodeData } from "./WorkflowStatusNode";

/**
 * Data shape for a transition between two statuses.
 */
export interface WorkflowTransitionData {
  id: string;
  name: string;
  fromStatusId: string;
  toStatusId: string;
}

interface WorkflowTransitionLineProps {
  /** Transition data */
  transition: WorkflowTransitionData;
  /** Source status node */
  fromStatus: WorkflowStatusNodeData;
  /** Target status node */
  toStatus: WorkflowStatusNodeData;
  /** Whether this transition is currently selected */
  isSelected?: boolean;
  /** Callback when the transition line is clicked */
  onClick?: (transitionId: string) => void;
}

/**
 * Computes the best connection points between two nodes.
 * Returns start and end coordinates for the path.
 */
function computeConnectionPoints(
  from: WorkflowStatusNodeData,
  to: WorkflowStatusNodeData,
): { x1: number; y1: number; x2: number; y2: number } {
  const fromCx = from.position.x + NODE_WIDTH / 2;
  const fromCy = from.position.y + NODE_HEIGHT / 2;
  const toCx = to.position.x + NODE_WIDTH / 2;
  const toCy = to.position.y + NODE_HEIGHT / 2;

  const dx = toCx - fromCx;
  const dy = toCy - fromCy;

  let x1: number, y1: number, x2: number, y2: number;

  // Determine which edge to connect from/to based on relative positions
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal connection
    if (dx > 0) {
      // Target is to the right
      x1 = from.position.x + NODE_WIDTH;
      y1 = from.position.y + NODE_HEIGHT / 2;
      x2 = to.position.x;
      y2 = to.position.y + NODE_HEIGHT / 2;
    } else {
      // Target is to the left
      x1 = from.position.x;
      y1 = from.position.y + NODE_HEIGHT / 2;
      x2 = to.position.x + NODE_WIDTH;
      y2 = to.position.y + NODE_HEIGHT / 2;
    }
  } else {
    // Vertical connection
    if (dy > 0) {
      // Target is below
      x1 = from.position.x + NODE_WIDTH / 2;
      y1 = from.position.y + NODE_HEIGHT;
      x2 = to.position.x + NODE_WIDTH / 2;
      y2 = to.position.y;
    } else {
      // Target is above
      x1 = from.position.x + NODE_WIDTH / 2;
      y1 = from.position.y;
      x2 = to.position.x + NODE_WIDTH / 2;
      y2 = to.position.y + NODE_HEIGHT;
    }
  }

  return { x1, y1, x2, y2 };
}

/**
 * Creates a curved SVG path between two points using a cubic bezier.
 */
function createCurvedPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;

  // Control point offset (makes the curve smoother)
  const offset = Math.min(Math.abs(dx), Math.abs(dy), 60);

  let cx1: number, cy1: number, cx2: number, cy2: number;

  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal dominant: curve outward horizontally
    cx1 = x1 + offset;
    cy1 = y1;
    cx2 = x2 - offset;
    cy2 = y2;
  } else {
    // Vertical dominant: curve outward vertically
    cx1 = x1;
    cy1 = y1 + offset;
    cx2 = x2;
    cy2 = y2 - offset;
  }

  return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
}

/**
 * WorkflowTransitionLine renders a directed arrow between two status nodes.
 *
 * @description Uses SVG cubic bezier curves to draw smooth transition arrows.
 * The arrow includes a head at the target end and a label showing the
 * transition name at the midpoint. Clicking selects the transition for editing.
 *
 * @param props - WorkflowTransitionLineProps
 * @returns An SVG group with the transition path, arrowhead, and label
 *
 * @example
 * <WorkflowTransitionLine
 *   transition={transitionData}
 *   fromStatus={fromNode}
 *   toStatus={toNode}
 *   isSelected={selected}
 *   onClick={handleClick}
 * />
 */
export function WorkflowTransitionLine({
  transition,
  fromStatus,
  toStatus,
  isSelected = false,
  onClick,
}: WorkflowTransitionLineProps) {
  const { x1, y1, x2, y2 } = useMemo(
    () => computeConnectionPoints(fromStatus, toStatus),
    [fromStatus, toStatus],
  );

  const pathD = useMemo(
    () => createCurvedPath(x1, y1, x2, y2),
    [x1, y1, x2, y2],
  );

  // Midpoint for the label
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick?.(transition.id);
    },
    [onClick, transition.id],
  );

  const arrowId = `arrow-${transition.id}`;

  return (
    <g
      onClick={handleClick}
      className="cursor-pointer"
      role="button"
      tabIndex={0}
      aria-label={`${transition.name}: ${fromStatus.name} to ${toStatus.name}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(transition.id);
        }
      }}
    >
      {/* Arrow marker definition */}
      <defs>
        <marker
          id={arrowId}
          markerWidth={10}
          markerHeight={7}
          refX={9}
          refY={3.5}
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            className={cn(
              isSelected ? "fill-primary" : "fill-muted-foreground",
            )}
          />
        </marker>
      </defs>

      {/* Invisible wider path for easier clicking */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        className="cursor-pointer"
      />

      {/* Visible path */}
      <path
        d={pathD}
        fill="none"
        className={cn(
          "transition-colors",
          isSelected ? "stroke-primary" : "stroke-muted-foreground/60",
        )}
        strokeWidth={isSelected ? 2 : 1.5}
        markerEnd={`url(#${arrowId})`}
      />

      {/* Selection highlight */}
      {isSelected && (
        <path
          d={pathD}
          fill="none"
          className="stroke-primary/20"
          strokeWidth={6}
        />
      )}

      {/* Transition label */}
      <g transform={`translate(${midX}, ${midY})`}>
        <rect
          x={-(transition.name.length * 3.5 + 8)}
          y={-10}
          width={transition.name.length * 7 + 16}
          height={20}
          rx={4}
          className={cn(
            "transition-colors",
            isSelected
              ? "fill-primary/10 stroke-primary"
              : "fill-background stroke-border",
          )}
          strokeWidth={1}
        />
        <text
          textAnchor="middle"
          dominantBaseline="middle"
          className={cn(
            "text-[11px] font-medium select-none",
            isSelected ? "fill-primary" : "fill-muted-foreground",
          )}
        >
          {transition.name.length > 18
            ? `${transition.name.slice(0, 16)}...`
            : transition.name}
        </text>
      </g>
    </g>
  );
}
