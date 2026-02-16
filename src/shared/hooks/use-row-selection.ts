import { useState, useCallback, useMemo } from "react";

/**
 * Hook for managing row selection in tables/lists.
 *
 * @description Provides state and actions for selecting, deselecting,
 * and range-selecting rows by their IDs. Designed for use with
 * bulk operations on issue lists and similar data tables.
 *
 * @returns Selection state and mutation functions
 *
 * @example
 * const { selectedIds, isSelected, toggle, selectAll, clearSelection, selectedCount } = useRowSelection();
 */
export function useRowSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds],
  );

  const selectRange = useCallback((allIds: string[], fromIndex: number, toIndex: number) => {
    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);
    const rangeIds = allIds.slice(start, end + 1);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of rangeIds) {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectedCount = useMemo(() => selectedIds.size, [selectedIds]);

  return {
    selectedIds,
    isSelected,
    toggle,
    selectAll,
    clearSelection,
    selectRange,
    selectedCount,
  };
}
