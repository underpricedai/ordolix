import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRowSelection } from "./use-row-selection";

describe("useRowSelection", () => {
  it("starts with empty selection", () => {
    const { result } = renderHook(() => useRowSelection());

    expect(result.current.selectedCount).toBe(0);
    expect(result.current.selectedIds.size).toBe(0);
  });

  it("toggles an item into selection", () => {
    const { result } = renderHook(() => useRowSelection());

    act(() => {
      result.current.toggle("item-1");
    });

    expect(result.current.isSelected("item-1")).toBe(true);
    expect(result.current.selectedCount).toBe(1);
  });

  it("toggles an item out of selection", () => {
    const { result } = renderHook(() => useRowSelection());

    act(() => {
      result.current.toggle("item-1");
    });
    act(() => {
      result.current.toggle("item-1");
    });

    expect(result.current.isSelected("item-1")).toBe(false);
    expect(result.current.selectedCount).toBe(0);
  });

  it("selects multiple items independently", () => {
    const { result } = renderHook(() => useRowSelection());

    act(() => {
      result.current.toggle("item-1");
      result.current.toggle("item-2");
      result.current.toggle("item-3");
    });

    expect(result.current.selectedCount).toBe(3);
    expect(result.current.isSelected("item-1")).toBe(true);
    expect(result.current.isSelected("item-2")).toBe(true);
    expect(result.current.isSelected("item-3")).toBe(true);
  });

  it("selectAll replaces current selection", () => {
    const { result } = renderHook(() => useRowSelection());

    act(() => {
      result.current.toggle("old-item");
    });
    act(() => {
      result.current.selectAll(["a", "b", "c"]);
    });

    expect(result.current.selectedCount).toBe(3);
    expect(result.current.isSelected("old-item")).toBe(false);
    expect(result.current.isSelected("a")).toBe(true);
    expect(result.current.isSelected("b")).toBe(true);
    expect(result.current.isSelected("c")).toBe(true);
  });

  it("clearSelection removes all items", () => {
    const { result } = renderHook(() => useRowSelection());

    act(() => {
      result.current.selectAll(["a", "b", "c"]);
    });
    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedCount).toBe(0);
    expect(result.current.isSelected("a")).toBe(false);
  });

  it("isSelected returns false for unknown items", () => {
    const { result } = renderHook(() => useRowSelection());

    expect(result.current.isSelected("nonexistent")).toBe(false);
  });

  it("selectedIds returns a Set of all selected IDs", () => {
    const { result } = renderHook(() => useRowSelection());

    act(() => {
      result.current.toggle("x");
      result.current.toggle("y");
    });

    const ids = result.current.selectedIds;
    expect(ids).toBeInstanceOf(Set);
    expect(ids.has("x")).toBe(true);
    expect(ids.has("y")).toBe(true);
    expect(ids.size).toBe(2);
  });

  it("selectRange selects items between indices", () => {
    const { result } = renderHook(() => useRowSelection());

    act(() => {
      result.current.selectRange(["a", "b", "c", "d", "e"], 1, 3);
    });

    expect(result.current.selectedCount).toBe(3);
    expect(result.current.isSelected("a")).toBe(false);
    expect(result.current.isSelected("b")).toBe(true);
    expect(result.current.isSelected("c")).toBe(true);
    expect(result.current.isSelected("d")).toBe(true);
    expect(result.current.isSelected("e")).toBe(false);
  });

  it("selectRange works with reversed indices", () => {
    const { result } = renderHook(() => useRowSelection());

    act(() => {
      result.current.selectRange(["a", "b", "c", "d", "e"], 3, 1);
    });

    expect(result.current.selectedCount).toBe(3);
    expect(result.current.isSelected("b")).toBe(true);
    expect(result.current.isSelected("c")).toBe(true);
    expect(result.current.isSelected("d")).toBe(true);
  });
});
