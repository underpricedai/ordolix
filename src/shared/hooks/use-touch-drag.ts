"use client";

import { useRef, useCallback, type RefObject } from "react";

interface TouchDragOptions {
  /** Minimum distance in px before drag starts (prevents accidental drags) */
  threshold?: number;
  /** Called when drag starts after threshold is exceeded */
  onDragStart?: (x: number, y: number) => void;
  /** Called on each move after drag has started */
  onDragMove?: (x: number, y: number, dx: number, dy: number) => void;
  /** Called when touch ends */
  onDragEnd?: (x: number, y: number) => void;
}

interface TouchDragHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

/**
 * Hook for handling touch drag gestures with a configurable threshold.
 *
 * @param options - Touch drag configuration
 * @returns Touch event handlers to spread onto a component
 *
 * @example
 * const handlers = useTouchDrag({ threshold: 10, onDragMove: (x, y, dx, dy) => { ... } });
 * <div {...handlers}>Draggable</div>
 */
export function useTouchDrag(options: TouchDragOptions = {}): TouchDragHandlers {
  const { threshold = 8, onDragStart, onDragMove, onDragEnd } = options;
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      startPos.current = { x: touch.clientX, y: touch.clientY };
      isDragging.current = false;
    },
    [],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch || !startPos.current) return;

      const dx = touch.clientX - startPos.current.x;
      const dy = touch.clientY - startPos.current.y;

      if (!isDragging.current) {
        if (Math.abs(dx) + Math.abs(dy) < threshold) return;
        isDragging.current = true;
        onDragStart?.(startPos.current.x, startPos.current.y);
      }

      e.preventDefault();
      onDragMove?.(touch.clientX, touch.clientY, dx, dy);
    },
    [threshold, onDragStart, onDragMove],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (isDragging.current) {
        const touch = e.changedTouches[0];
        if (touch) {
          onDragEnd?.(touch.clientX, touch.clientY);
        }
      }
      startPos.current = null;
      isDragging.current = false;
    },
    [onDragEnd],
  );

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}
