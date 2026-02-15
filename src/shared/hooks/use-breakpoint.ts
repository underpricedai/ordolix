"use client";

import { useState, useEffect } from "react";

/** Tailwind breakpoint names */
export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const BREAKPOINTS: { name: Breakpoint; min: number }[] = [
  { name: "2xl", min: 1536 },
  { name: "xl", min: 1280 },
  { name: "lg", min: 1024 },
  { name: "md", min: 768 },
  { name: "sm", min: 640 },
  { name: "xs", min: 0 },
];

function getBreakpoint(width: number): Breakpoint {
  for (const bp of BREAKPOINTS) {
    if (width >= bp.min) return bp.name;
  }
  return "xs";
}

/**
 * Returns the current Tailwind breakpoint name based on window width.
 *
 * @returns Current breakpoint: "xs" | "sm" | "md" | "lg" | "xl" | "2xl"
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("md");

  useEffect(() => {
    const update = () => setBreakpoint(getBreakpoint(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return breakpoint;
}
