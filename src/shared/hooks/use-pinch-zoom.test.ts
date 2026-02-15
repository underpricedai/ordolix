import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRef } from "react";
import { usePinchZoom } from "./use-pinch-zoom";

function createTouchEvent(
  touches: { clientX: number; clientY: number }[],
): Partial<TouchEvent> {
  return {
    touches: touches.map((t) => ({ clientX: t.clientX, clientY: t.clientY })) as unknown as TouchList,
    preventDefault: vi.fn(),
  };
}

describe("usePinchZoom", () => {
  let el: HTMLDivElement;
  let listeners: Record<string, EventListener>;

  beforeEach(() => {
    listeners = {};
    el = {
      addEventListener: vi.fn((event: string, handler: EventListener) => {
        listeners[event] = handler;
      }),
      removeEventListener: vi.fn(),
    } as unknown as HTMLDivElement;
  });

  it("attaches touch listeners to the referenced element", () => {
    const ref = { current: el };
    renderHook(() => usePinchZoom(ref));
    expect(el.addEventListener).toHaveBeenCalledWith("touchstart", expect.any(Function), { passive: false });
    expect(el.addEventListener).toHaveBeenCalledWith("touchmove", expect.any(Function), { passive: false });
    expect(el.addEventListener).toHaveBeenCalledWith("touchend", expect.any(Function));
  });

  it("calls onScaleChange when pinching", () => {
    const onScaleChange = vi.fn();
    const ref = { current: el };
    renderHook(() => usePinchZoom(ref, { onScaleChange }));

    // Start pinch with two fingers 100px apart
    listeners["touchstart"]!(createTouchEvent([
      { clientX: 0, clientY: 0 },
      { clientX: 100, clientY: 0 },
    ]) as Event);

    // Spread to 200px apart (2x zoom)
    listeners["touchmove"]!(createTouchEvent([
      { clientX: 0, clientY: 0 },
      { clientX: 200, clientY: 0 },
    ]) as Event);

    expect(onScaleChange).toHaveBeenCalledWith(2);
  });

  it("clamps scale to minScale and maxScale", () => {
    const onScaleChange = vi.fn();
    const ref = { current: el };
    renderHook(() => usePinchZoom(ref, { minScale: 0.5, maxScale: 2, onScaleChange }));

    // Start 100px apart
    listeners["touchstart"]!(createTouchEvent([
      { clientX: 0, clientY: 0 },
      { clientX: 100, clientY: 0 },
    ]) as Event);

    // Spread to 500px apart (5x) — should clamp to 2
    listeners["touchmove"]!(createTouchEvent([
      { clientX: 0, clientY: 0 },
      { clientX: 500, clientY: 0 },
    ]) as Event);

    expect(onScaleChange).toHaveBeenCalledWith(2);
  });

  it("does not call onScaleChange for single-finger touch", () => {
    const onScaleChange = vi.fn();
    const ref = { current: el };
    renderHook(() => usePinchZoom(ref, { onScaleChange }));

    listeners["touchstart"]!(createTouchEvent([
      { clientX: 0, clientY: 0 },
    ]) as Event);

    listeners["touchmove"]!(createTouchEvent([
      { clientX: 50, clientY: 0 },
    ]) as Event);

    expect(onScaleChange).not.toHaveBeenCalled();
  });
});
