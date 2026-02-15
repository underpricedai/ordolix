import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBreakpoint } from "./use-breakpoint";

describe("useBreakpoint", () => {
  let listeners: Array<() => void> = [];
  const originalAddEventListener = window.addEventListener;
  const originalRemoveEventListener = window.removeEventListener;

  beforeEach(() => {
    listeners = [];
    window.addEventListener = vi.fn((event: string, cb: unknown) => {
      if (event === "resize") listeners.push(cb as () => void);
    });
    window.removeEventListener = vi.fn();
  });

  afterEach(() => {
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
  });

  function setWidth(w: number) {
    Object.defineProperty(window, "innerWidth", { value: w, writable: true });
    listeners.forEach((fn) => fn());
  }

  it("returns 'xs' for narrow screens", () => {
    Object.defineProperty(window, "innerWidth", { value: 375, writable: true });
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe("xs");
  });

  it("returns 'sm' at 640px", () => {
    Object.defineProperty(window, "innerWidth", { value: 640, writable: true });
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe("sm");
  });

  it("returns 'md' at 768px", () => {
    Object.defineProperty(window, "innerWidth", { value: 768, writable: true });
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe("md");
  });

  it("returns 'lg' at 1024px", () => {
    Object.defineProperty(window, "innerWidth", { value: 1024, writable: true });
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe("lg");
  });

  it("returns 'xl' at 1280px", () => {
    Object.defineProperty(window, "innerWidth", { value: 1280, writable: true });
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe("xl");
  });

  it("returns '2xl' at 1536px", () => {
    Object.defineProperty(window, "innerWidth", { value: 1536, writable: true });
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe("2xl");
  });

  it("updates on resize", () => {
    Object.defineProperty(window, "innerWidth", { value: 1024, writable: true });
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe("lg");

    act(() => setWidth(375));
    expect(result.current).toBe("xs");
  });
});
