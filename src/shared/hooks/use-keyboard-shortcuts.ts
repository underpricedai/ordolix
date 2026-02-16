"use client";

import { useEffect } from "react";
import { useShortcutsContext, type Shortcut } from "../providers/shortcuts-provider";

/**
 * Registers keyboard shortcuts with the global shortcuts system.
 *
 * @description Shortcuts are automatically registered on mount and
 * unregistered on unmount. They respect the active scope, editable
 * element suppression, and sequential key sequences.
 *
 * @param shortcuts - Array of shortcut definitions to register
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   { key: "c", description: "Create issue", handler: () => openCreateDialog() },
 *   { key: "g b", description: "Go to board", handler: () => router.push("/board") },
 *   { key: "k", description: "Command palette", handler: () => openPalette(), modifier: "meta" },
 * ]);
 * ```
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]): void {
  const { register } = useShortcutsContext();

  useEffect(() => {
    const unregister = register(shortcuts);
    return unregister;
  }, [register, shortcuts]);
}
