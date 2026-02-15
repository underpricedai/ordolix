import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTouchDrag } from "./use-touch-drag";

function createTouchEvent(
  type: string,
  touches: { clientX: number; clientY: number }[],
): React.TouchEvent {
  return {
    touches: touches.map((t) => ({ clientX: t.clientX, clientY: t.clientY })),
    changedTouches: touches.map((t) => ({
      clientX: t.clientX,
      clientY: t.clientY,
    })),
    preventDefault: vi.fn(),
  } as unknown as React.TouchEvent;
}

describe("useTouchDrag", () => {
  it("returns touch event handlers", () => {
    const { result } = renderHook(() => useTouchDrag());
    expect(result.current).toHaveProperty("onTouchStart");
    expect(result.current).toHaveProperty("onTouchMove");
    expect(result.current).toHaveProperty("onTouchEnd");
  });

  it("calls onDragStart after threshold is exceeded", () => {
    const onDragStart = vi.fn();
    const onDragMove = vi.fn();
    const { result } = renderHook(() =>
      useTouchDrag({ threshold: 5, onDragStart, onDragMove }),
    );

    result.current.onTouchStart(createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]));
    // Move within threshold — should not trigger
    result.current.onTouchMove(createTouchEvent("touchmove", [{ clientX: 102, clientY: 100 }]));
    expect(onDragStart).not.toHaveBeenCalled();

    // Move beyond threshold — should trigger
    result.current.onTouchMove(createTouchEvent("touchmove", [{ clientX: 110, clientY: 100 }]));
    expect(onDragStart).toHaveBeenCalledWith(100, 100);
    expect(onDragMove).toHaveBeenCalledWith(110, 100, 10, 0);
  });

  it("calls onDragEnd when touch ends after dragging", () => {
    const onDragEnd = vi.fn();
    const { result } = renderHook(() =>
      useTouchDrag({ threshold: 2, onDragEnd }),
    );

    result.current.onTouchStart(createTouchEvent("touchstart", [{ clientX: 0, clientY: 0 }]));
    result.current.onTouchMove(createTouchEvent("touchmove", [{ clientX: 20, clientY: 0 }]));
    result.current.onTouchEnd(createTouchEvent("touchend", [{ clientX: 20, clientY: 0 }]));
    expect(onDragEnd).toHaveBeenCalledWith(20, 0);
  });

  it("does not call onDragEnd when touch ends without dragging", () => {
    const onDragEnd = vi.fn();
    const { result } = renderHook(() =>
      useTouchDrag({ threshold: 50, onDragEnd }),
    );

    result.current.onTouchStart(createTouchEvent("touchstart", [{ clientX: 0, clientY: 0 }]));
    result.current.onTouchEnd(createTouchEvent("touchend", [{ clientX: 1, clientY: 0 }]));
    expect(onDragEnd).not.toHaveBeenCalled();
  });
});
