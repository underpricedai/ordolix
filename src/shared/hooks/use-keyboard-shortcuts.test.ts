import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import {
  ShortcutsProvider,
  useShortcutsContext,
  type Shortcut,
} from "../providers/shortcuts-provider";
import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";

/**
 * Helper to wrap hooks in ShortcutsProvider for testing.
 */
function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(ShortcutsProvider, null, children);
  };
}

/**
 * Dispatches a keydown event on the document.
 */
function pressKey(
  key: string,
  options: Partial<KeyboardEventInit> = {},
  target?: EventTarget,
) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  (target ?? document).dispatchEvent(event);
}

describe("useKeyboardShortcuts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("registers a shortcut and calls handler on key press", () => {
    const handler = vi.fn();
    const shortcuts: Shortcut[] = [
      { key: "c", description: "Create issue", handler },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts), {
      wrapper: createWrapper(),
    });

    act(() => {
      pressKey("c");
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("registers multiple shortcuts", () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const shortcuts: Shortcut[] = [
      { key: "c", description: "Create issue", handler: handler1 },
      { key: "/", description: "Focus search", handler: handler2 },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts), {
      wrapper: createWrapper(),
    });

    act(() => {
      pressKey("c");
    });
    expect(handler1).toHaveBeenCalledTimes(1);

    act(() => {
      pressKey("/");
    });
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it("unregisters shortcuts on unmount", () => {
    const handler = vi.fn();
    const shortcuts: Shortcut[] = [
      { key: "c", description: "Create issue", handler },
    ];

    const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts), {
      wrapper: createWrapper(),
    });

    unmount();

    act(() => {
      pressKey("c");
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("ignores shortcuts when user is typing in an input element", () => {
    const handler = vi.fn();
    const shortcuts: Shortcut[] = [
      { key: "c", description: "Create issue", handler },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts), {
      wrapper: createWrapper(),
    });

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    act(() => {
      pressKey("c", {}, input);
    });

    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("ignores shortcuts when user is typing in a textarea", () => {
    const handler = vi.fn();
    const shortcuts: Shortcut[] = [
      { key: "c", description: "Create issue", handler },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts), {
      wrapper: createWrapper(),
    });

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();

    act(() => {
      pressKey("c", {}, textarea);
    });

    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(textarea);
  });

  it("ignores shortcuts when user is typing in a contenteditable element", () => {
    const handler = vi.fn();
    const shortcuts: Shortcut[] = [
      { key: "c", description: "Create issue", handler },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts), {
      wrapper: createWrapper(),
    });

    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    document.body.appendChild(div);
    div.focus();

    act(() => {
      pressKey("c", {}, div);
    });

    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(div);
  });

  it("still fires modifier shortcuts when typing in an input", () => {
    const handler = vi.fn();
    const shortcuts: Shortcut[] = [
      { key: "k", description: "Command palette", handler, modifier: "meta" },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts), {
      wrapper: createWrapper(),
    });

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    act(() => {
      pressKey("k", { metaKey: true }, input);
    });

    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeChild(input);
  });

  it("handles sequential key presses (g then b)", () => {
    const handler = vi.fn();
    const shortcuts: Shortcut[] = [
      { key: "g b", description: "Go to board", handler },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts), {
      wrapper: createWrapper(),
    });

    act(() => {
      pressKey("g");
    });

    act(() => {
      pressKey("b");
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("resets sequential key buffer after 500ms timeout", () => {
    const handler = vi.fn();
    const shortcuts: Shortcut[] = [
      { key: "g b", description: "Go to board", handler },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts), {
      wrapper: createWrapper(),
    });

    act(() => {
      pressKey("g");
    });

    act(() => {
      vi.advanceTimersByTime(600);
    });

    act(() => {
      pressKey("b");
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("handles sequential key press within 500ms window", () => {
    const handler = vi.fn();
    const shortcuts: Shortcut[] = [
      { key: "g d", description: "Go to dashboard", handler },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts), {
      wrapper: createWrapper(),
    });

    act(() => {
      pressKey("g");
    });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    act(() => {
      pressKey("d");
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("supports modifier keys (meta)", () => {
    const handler = vi.fn();
    const shortcuts: Shortcut[] = [
      { key: "k", description: "Command palette", handler, modifier: "meta" },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts), {
      wrapper: createWrapper(),
    });

    // Without modifier - should not fire
    act(() => {
      pressKey("k");
    });
    expect(handler).not.toHaveBeenCalled();

    // With modifier - should fire
    act(() => {
      pressKey("k", { metaKey: true });
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("supports modifier keys (ctrl)", () => {
    const handler = vi.fn();
    const shortcuts: Shortcut[] = [
      { key: "s", description: "Save", handler, modifier: "ctrl" },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts), {
      wrapper: createWrapper(),
    });

    act(() => {
      pressKey("s", { ctrlKey: true });
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("supports modifier keys (shift)", () => {
    const handler = vi.fn();
    const shortcuts: Shortcut[] = [
      { key: "?", description: "Help", handler, modifier: "shift" },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts), {
      wrapper: createWrapper(),
    });

    act(() => {
      pressKey("?", { shiftKey: true });
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("supports modifier keys (alt)", () => {
    const handler = vi.fn();
    const shortcuts: Shortcut[] = [
      { key: "n", description: "New", handler, modifier: "alt" },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts), {
      wrapper: createWrapper(),
    });

    act(() => {
      pressKey("n", { altKey: true });
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("filters shortcuts by active scope", () => {
    const globalHandler = vi.fn();
    const boardHandler = vi.fn();
    const shortcuts: Shortcut[] = [
      {
        key: "c",
        description: "Create issue",
        handler: globalHandler,
        scope: "global",
      },
      {
        key: "x",
        description: "Board action",
        handler: boardHandler,
        scope: "board",
      },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts), {
      wrapper: createWrapper(),
    });

    // Global shortcut should work (default scope is global)
    act(() => {
      pressKey("c");
    });
    expect(globalHandler).toHaveBeenCalledTimes(1);

    // Board-scoped shortcut should not fire when scope is global
    act(() => {
      pressKey("x");
    });
    expect(boardHandler).not.toHaveBeenCalled();
  });

  it("fires scope-specific shortcuts when scope is active", () => {
    const boardHandler = vi.fn();
    const shortcuts: Shortcut[] = [
      {
        key: "x",
        description: "Board action",
        handler: boardHandler,
        scope: "board",
      },
    ];

    function useCombined() {
      const ctx = useShortcutsContext();
      useKeyboardShortcuts(shortcuts);
      return ctx;
    }

    const { result } = renderHook(() => useCombined(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setActiveScope("board");
    });

    act(() => {
      pressKey("x");
    });

    expect(boardHandler).toHaveBeenCalledTimes(1);
  });
});

describe("useShortcutsContext", () => {
  it("provides getShortcuts that returns registered shortcuts", () => {
    const handler = vi.fn();
    const shortcuts: Shortcut[] = [
      { key: "c", description: "Create issue", handler },
    ];

    function useCombined() {
      const ctx = useShortcutsContext();
      useKeyboardShortcuts(shortcuts);
      return ctx;
    }

    const { result } = renderHook(() => useCombined(), {
      wrapper: createWrapper(),
    });

    const registered = result.current.getShortcuts();

    expect(registered).toHaveLength(1);
    expect(registered[0]?.key).toBe("c");
    expect(registered[0]?.description).toBe("Create issue");
  });

  it("provides activeScope defaulting to global", () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useShortcutsContext(), { wrapper });

    expect(result.current.activeScope).toBe("global");
  });

  it("allows changing the active scope", () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useShortcutsContext(), { wrapper });

    act(() => {
      result.current.setActiveScope("board");
    });

    expect(result.current.activeScope).toBe("board");
  });

  it("throws when used outside ShortcutsProvider", () => {
    expect(() => {
      renderHook(() => useShortcutsContext());
    }).toThrow("useShortcutsContext must be used within a ShortcutsProvider");
  });
});
