"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** Supported keyboard shortcut scopes. */
export type ShortcutScope = "global" | "board" | "issue" | "backlog";

/**
 * Defines a keyboard shortcut registration.
 *
 * @description Supports single keys ("c"), sequential keys ("g b"),
 * and modifier combinations (modifier: "meta" + key: "k").
 */
export interface Shortcut {
  /** Key or key sequence, e.g., "c", "g b", "?" */
  key: string;
  /** Human-readable description shown in the shortcuts help dialog */
  description: string;
  /** Callback invoked when the shortcut is triggered */
  handler: () => void;
  /** Scope in which this shortcut is active. Defaults to "global". */
  scope?: ShortcutScope;
  /** Modifier key required: "meta" | "ctrl" | "shift" | "alt" */
  modifier?: "meta" | "ctrl" | "shift" | "alt";
}

interface ShortcutsContextValue {
  /** Returns all currently registered shortcuts. */
  getShortcuts: () => Shortcut[];
  /** The currently active scope. */
  activeScope: ShortcutScope;
  /** Set the active scope (e.g., when navigating to a board page). */
  setActiveScope: (scope: ShortcutScope) => void;
  /** Register a set of shortcuts. Returns an unregister function. */
  register: (shortcuts: Shortcut[]) => () => void;
}

const ShortcutsContext = createContext<ShortcutsContextValue | null>(null);

/** Timeout in ms for sequential key sequences (e.g., "g b"). */
const SEQUENCE_TIMEOUT = 500;

/**
 * Checks whether the event target is an editable element (input, textarea,
 * contenteditable) where keyboard shortcuts should be suppressed.
 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true;
  }
  if (target.isContentEditable || target.getAttribute("contenteditable") === "true") return true;
  return false;
}

/**
 * Checks if the keyboard event matches the required modifier.
 */
function hasModifier(
  event: KeyboardEvent,
  modifier: Shortcut["modifier"],
): boolean {
  switch (modifier) {
    case "meta":
      return event.metaKey;
    case "ctrl":
      return event.ctrlKey;
    case "shift":
      return event.shiftKey;
    case "alt":
      return event.altKey;
    default:
      return true;
  }
}

/**
 * Checks that no unexpected modifiers are held when no modifier is required.
 */
function hasNoModifiers(event: KeyboardEvent): boolean {
  return !event.metaKey && !event.ctrlKey && !event.altKey;
}

/**
 * Context provider that manages keyboard shortcut registration and dispatching.
 *
 * @description Handles single-key shortcuts, sequential key sequences,
 * modifier combinations, and scope-based filtering. Suppresses shortcuts
 * when the user is typing in editable elements (unless a modifier is used).
 *
 * @example
 * ```tsx
 * <ShortcutsProvider>
 *   <App />
 * </ShortcutsProvider>
 * ```
 */
export function ShortcutsProvider({ children }: { children: ReactNode }) {
  const [activeScope, setActiveScope] = useState<ShortcutScope>("global");
  const shortcutsRef = useRef<Map<string, Shortcut[]>>(new Map());
  const sequenceBufferRef = useRef<string>("");
  const sequenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const register = useCallback((shortcuts: Shortcut[]) => {
    const id = Math.random().toString(36).slice(2);
    shortcutsRef.current.set(id, shortcuts);
    return () => {
      shortcutsRef.current.delete(id);
    };
  }, []);

  const getShortcuts = useCallback((): Shortcut[] => {
    const all: Shortcut[] = [];
    for (const group of shortcutsRef.current.values()) {
      all.push(...group);
    }
    return all;
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const allShortcuts = getShortcuts();
      const target = event.target;
      const inEditable = isEditableTarget(target);

      for (const shortcut of allShortcuts) {
        const scope = shortcut.scope ?? "global";

        // Skip if scope doesn't match (global shortcuts always fire)
        if (scope !== "global" && scope !== activeScope) continue;

        const keys = shortcut.key.split(" ");
        const isSequence = keys.length > 1;

        if (shortcut.modifier) {
          // Modifier shortcuts: check modifier + key match
          if (!hasModifier(event, shortcut.modifier)) continue;
          if (event.key !== shortcut.key) continue;

          // Modifier shortcuts bypass editable check
          event.preventDefault();
          shortcut.handler();
          return;
        }

        // Non-modifier shortcuts are suppressed in editable targets
        if (inEditable) continue;

        if (isSequence) {
          // Sequential key handling
          const firstKey = keys[0];
          const secondKey = keys[1];

          if (sequenceBufferRef.current === "" && event.key === firstKey) {
            // First key in sequence
            if (!hasNoModifiers(event)) continue;
            sequenceBufferRef.current = firstKey!;
            if (sequenceTimerRef.current) {
              clearTimeout(sequenceTimerRef.current);
            }
            sequenceTimerRef.current = setTimeout(() => {
              sequenceBufferRef.current = "";
              sequenceTimerRef.current = null;
            }, SEQUENCE_TIMEOUT);
            return;
          }

          if (
            sequenceBufferRef.current === firstKey &&
            event.key === secondKey
          ) {
            // Second key in sequence
            sequenceBufferRef.current = "";
            if (sequenceTimerRef.current) {
              clearTimeout(sequenceTimerRef.current);
              sequenceTimerRef.current = null;
            }
            event.preventDefault();
            shortcut.handler();
            return;
          }
        } else {
          // Single key shortcut
          if (!hasNoModifiers(event)) continue;
          if (event.key !== shortcut.key) continue;

          event.preventDefault();
          shortcut.handler();
          return;
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (sequenceTimerRef.current) {
        clearTimeout(sequenceTimerRef.current);
      }
    };
  }, [activeScope, getShortcuts]);

  const value = useMemo(
    () => ({
      getShortcuts,
      activeScope,
      setActiveScope,
      register,
    }),
    [getShortcuts, activeScope, setActiveScope, register],
  );

  return (
    <ShortcutsContext.Provider value={value}>
      {children}
    </ShortcutsContext.Provider>
  );
}

/**
 * Hook to access the shortcuts context.
 *
 * @throws Error if used outside of ShortcutsProvider
 * @returns The shortcuts context value
 */
export function useShortcutsContext(): ShortcutsContextValue {
  const context = useContext(ShortcutsContext);
  if (!context) {
    throw new Error(
      "useShortcutsContext must be used within a ShortcutsProvider",
    );
  }
  return context;
}
