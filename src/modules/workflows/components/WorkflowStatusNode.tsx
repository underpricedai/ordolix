"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/utils";

/**
 * Status category for visual styling of workflow nodes.
 */
export type WorkflowStatusCategory = "TO_DO" | "IN_PROGRESS" | "DONE";

/**
 * Data shape for a status node on the workflow canvas.
 */
export interface WorkflowStatusNodeData {
  id: string;
  name: string;
  category: WorkflowStatusCategory;
  color?: string;
  description?: string;
  position: { x: number; y: number };
}

interface WorkflowStatusNodeProps {
  /** Status node data */
  status: WorkflowStatusNodeData;
  /** Whether this node is currently selected */
  isSelected?: boolean;
  /** Callback when the node is clicked */
  onClick?: (statusId: string) => void;
  /** Callback when the node position changes via drag */
  onPositionChange?: (statusId: string, position: { x: number; y: number }) => void;
  /** Callback when a connection drag starts from this node */
  onConnectStart?: (statusId: string, point: { x: number; y: number }) => void;
  /** Callback when a connection drag ends on this node */
  onConnectEnd?: (statusId: string) => void;
}

/** Width of a status node */
export const NODE_WIDTH = 160;
/** Height of a status node */
export const NODE_HEIGHT = 64;

const categoryColors: Record<WorkflowStatusCategory, { bg: string; text: string; border: string; dot: string }> = {
  TO_DO: {
    bg: "fill-blue-50 dark:fill-blue-950/40",
    text: "fill-blue-700 dark:fill-blue-300",
    border: "stroke-blue-300 dark:stroke-blue-700",
    dot: "fill-blue-500",
  },
  IN_PROGRESS: {
    bg: "fill-yellow-50 dark:fill-yellow-950/40",
    text: "fill-yellow-700 dark:fill-yellow-300",
    border: "stroke-yellow-400 dark:stroke-yellow-600",
    dot: "fill-yellow-500",
  },
  DONE: {
    bg: "fill-green-50 dark:fill-green-950/40",
    text: "fill-green-700 dark:fill-green-300",
    border: "stroke-green-300 dark:stroke-green-700",
    dot: "fill-green-500",
  },
};

/**
 * WorkflowStatusNode renders a status as a draggable node on the workflow canvas.
 *
 * @description Displays a rounded rectangle with the status name, category badge,
 * and optional color indicator. Supports drag-to-reposition and click-to-select.
 * Connection points on the edges are used for drawing transitions.
 *
 * @param props - WorkflowStatusNodeProps
 * @returns An SVG group element representing the status node
 *
 * @example
 * <WorkflowStatusNode status={statusData} isSelected onClick={handleClick} />
 */
export function WorkflowStatusNode({
  status,
  isSelected = false,
  onClick,
  onPositionChange,
  onConnectStart,
  onConnectEnd,
}: WorkflowStatusNodeProps) {
  const t = useTranslations("workflows");
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const nodeRef = useRef<SVGGElement>(null);

  const colors = categoryColors[status.category];
  const categoryLabel = t(`categories.${status.category}`);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; // Left click only
      e.stopPropagation();

      const svgElement = nodeRef.current?.ownerSVGElement;
      if (!svgElement) return;

      const ctm = svgElement.getScreenCTM();
      if (!ctm) return;

      const point = svgElement.createSVGPoint();
      point.x = e.clientX;
      point.y = e.clientY;
      const svgPoint = point.matrixTransform(ctm.inverse());

      setDragOffset({
        x: svgPoint.x - status.position.x,
        y: svgPoint.y - status.position.y,
      });
      setIsDragging(true);
    },
    [status.position],
  );

  /**
   * Touch handler for dragging status nodes on mobile.
   */
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      e.stopPropagation();

      const svgElement = nodeRef.current?.ownerSVGElement;
      if (!svgElement) return;

      const ctm = svgElement.getScreenCTM();
      if (!ctm) return;

      const point = svgElement.createSVGPoint();
      point.x = touch.clientX;
      point.y = touch.clientY;
      const svgPoint = point.matrixTransform(ctm.inverse());

      setDragOffset({
        x: svgPoint.x - status.position.x,
        y: svgPoint.y - status.position.y,
      });
      setIsDragging(true);
    },
    [status.position],
  );

  useEffect(() => {
    if (!isDragging) return;

    const svgElement = nodeRef.current?.ownerSVGElement;
    if (!svgElement) return;

    const handleMouseMove = (e: MouseEvent) => {
      const ctm = svgElement.getScreenCTM();
      if (!ctm) return;

      const point = svgElement.createSVGPoint();
      point.x = e.clientX;
      point.y = e.clientY;
      const svgPoint = point.matrixTransform(ctm.inverse());

      const newX = Math.max(0, svgPoint.x - dragOffset.x);
      const newY = Math.max(0, svgPoint.y - dragOffset.y);

      onPositionChange?.(status.id, { x: newX, y: newY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;

      const ctm = svgElement.getScreenCTM();
      if (!ctm) return;

      const point = svgElement.createSVGPoint();
      point.x = touch.clientX;
      point.y = touch.clientY;
      const svgPoint = point.matrixTransform(ctm.inverse());

      const newX = Math.max(0, svgPoint.x - dragOffset.x);
      const newY = Math.max(0, svgPoint.y - dragOffset.y);

      onPositionChange?.(status.id, { x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, dragOffset, status.id, onPositionChange]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isDragging) {
        onClick?.(status.id);
      }
    },
    [isDragging, onClick, status.id],
  );

  /**
   * Handles mousedown on a connection point circle to initiate a drag-to-connect.
   * The connection point coordinates are computed relative to the SVG canvas.
   */
  const handleConnectPointMouseDown = useCallback(
    (pointX: number, pointY: number) => (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onConnectStart?.(status.id, {
        x: status.position.x + pointX,
        y: status.position.y + pointY,
      });
    },
    [status.id, status.position, onConnectStart],
  );

  /**
   * Handles mouseup on a connection point or the node body to complete a connect.
   */
  const handleConnectPointMouseUp = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onConnectEnd?.(status.id);
    },
    [status.id, onConnectEnd],
  );

  return (
    <g
      ref={nodeRef}
      transform={`translate(${status.position.x}, ${status.position.y})`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      onMouseUp={handleConnectPointMouseUp}
      className={cn(
        "cursor-pointer select-none",
        isDragging && "cursor-grabbing",
      )}
      role="button"
      tabIndex={0}
      aria-label={`${status.name} - ${categoryLabel}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(status.id);
        }
      }}
    >
      {/* Selection ring */}
      {isSelected && (
        <rect
          x={-3}
          y={-3}
          width={NODE_WIDTH + 6}
          height={NODE_HEIGHT + 6}
          rx={11}
          ry={11}
          className="fill-none stroke-primary"
          strokeWidth={2}
          strokeDasharray="4 2"
        />
      )}

      {/* Node background */}
      <rect
        x={0}
        y={0}
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={8}
        ry={8}
        className={cn(colors.bg, colors.border)}
        strokeWidth={1.5}
        style={status.color ? { fill: `${status.color}15`, stroke: status.color } : undefined}
      />

      {/* Category color top bar */}
      <rect
        x={1}
        y={1}
        width={NODE_WIDTH - 2}
        height={4}
        rx={4}
        className={status.color ? undefined : colors.dot}
        style={status.color ? { fill: status.color } : undefined}
      />

      {/* Color indicator left bar */}
      {status.color && (
        <rect
          x={0}
          y={0}
          width={4}
          height={NODE_HEIGHT}
          rx={2}
          style={{ fill: status.color }}
        />
      )}

      {/* Status name */}
      <text
        x={NODE_WIDTH / 2}
        y={28}
        textAnchor="middle"
        className={cn("text-sm font-medium", colors.text)}
        style={status.color ? { fill: status.color } : undefined}
      >
        {status.name.length > 16
          ? `${status.name.slice(0, 14)}...`
          : status.name}
      </text>

      {/* Category indicator dot + label */}
      <circle
        cx={NODE_WIDTH / 2 - categoryLabel.length * 2.8 - 4}
        cy={46}
        r={3}
        className={colors.dot}
      />
      <text
        x={NODE_WIDTH / 2 + 4}
        y={49}
        textAnchor="middle"
        className="fill-muted-foreground text-[10px]"
      >
        {categoryLabel}
      </text>

      {/* Connection points (circles on edges) - draggable for creating transitions */}
      {/* Invisible larger touch targets behind visible circles */}
      {/* Left */}
      <circle cx={0} cy={NODE_HEIGHT / 2} r={12} fill="transparent" onMouseDown={handleConnectPointMouseDown(0, NODE_HEIGHT / 2)} onMouseUp={handleConnectPointMouseUp} className="cursor-crosshair" />
      <circle
        cx={0}
        cy={NODE_HEIGHT / 2}
        r={5}
        className="fill-background stroke-border hover:fill-primary hover:stroke-primary cursor-crosshair transition-colors pointer-events-none"
        strokeWidth={1.5}
      />
      {/* Right */}
      <circle cx={NODE_WIDTH} cy={NODE_HEIGHT / 2} r={12} fill="transparent" onMouseDown={handleConnectPointMouseDown(NODE_WIDTH, NODE_HEIGHT / 2)} onMouseUp={handleConnectPointMouseUp} className="cursor-crosshair" />
      <circle
        cx={NODE_WIDTH}
        cy={NODE_HEIGHT / 2}
        r={5}
        className="fill-background stroke-border hover:fill-primary hover:stroke-primary cursor-crosshair transition-colors pointer-events-none"
        strokeWidth={1.5}
      />
      {/* Top */}
      <circle cx={NODE_WIDTH / 2} cy={0} r={12} fill="transparent" onMouseDown={handleConnectPointMouseDown(NODE_WIDTH / 2, 0)} onMouseUp={handleConnectPointMouseUp} className="cursor-crosshair" />
      <circle
        cx={NODE_WIDTH / 2}
        cy={0}
        r={5}
        className="fill-background stroke-border hover:fill-primary hover:stroke-primary cursor-crosshair transition-colors pointer-events-none"
        strokeWidth={1.5}
      />
      {/* Bottom */}
      <circle cx={NODE_WIDTH / 2} cy={NODE_HEIGHT} r={12} fill="transparent" onMouseDown={handleConnectPointMouseDown(NODE_WIDTH / 2, NODE_HEIGHT)} onMouseUp={handleConnectPointMouseUp} className="cursor-crosshair" />
      <circle
        cx={NODE_WIDTH / 2}
        cy={NODE_HEIGHT}
        r={5}
        className="fill-background stroke-border hover:fill-primary hover:stroke-primary cursor-crosshair transition-colors pointer-events-none"
        strokeWidth={1.5}
      />
    </g>
  );
}
