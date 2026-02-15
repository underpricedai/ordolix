"use client";

import { useRef, useEffect, type RefObject } from "react";

interface PinchZoomOptions {
  /** Minimum scale factor */
  minScale?: number;
  /** Maximum scale factor */
  maxScale?: number;
  /** Called when the scale changes */
  onScaleChange?: (scale: number) => void;
}

/**
 * Hook for pinch-to-zoom on touch devices, targeting an SVG or canvas element.
 *
 * @param ref - Ref to the element to enable pinch-zoom on
 * @param options - Zoom configuration
 *
 * @example
 * const svgRef = useRef<SVGSVGElement>(null);
 * usePinchZoom(svgRef, { minScale: 0.5, maxScale: 3, onScaleChange: setZoom });
 */
export function usePinchZoom<T extends HTMLElement | SVGSVGElement>(
  ref: RefObject<T | null>,
  options: PinchZoomOptions = {},
) {
  const { minScale = 0.25, maxScale = 4, onScaleChange } = options;
  const scaleRef = useRef(1);
  const initialDistRef = useRef<number | null>(null);
  const initialScaleRef = useRef(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function getDistance(t1: Touch, t2: Touch) {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function handleTouchStart(e: Event) {
      const te = e as TouchEvent;
      if (te.touches.length === 2) {
        te.preventDefault();
        initialDistRef.current = getDistance(te.touches[0]!, te.touches[1]!);
        initialScaleRef.current = scaleRef.current;
      }
    }

    function handleTouchMove(e: Event) {
      const te = e as TouchEvent;
      if (te.touches.length === 2 && initialDistRef.current !== null) {
        te.preventDefault();
        const dist = getDistance(te.touches[0]!, te.touches[1]!);
        const ratio = dist / initialDistRef.current;
        const newScale = Math.min(
          maxScale,
          Math.max(minScale, initialScaleRef.current * ratio),
        );
        scaleRef.current = newScale;
        onScaleChange?.(newScale);
      }
    }

    function handleTouchEnd() {
      initialDistRef.current = null;
    }

    el.addEventListener("touchstart", handleTouchStart, { passive: false });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [ref, minScale, maxScale, onScaleChange]);
}
