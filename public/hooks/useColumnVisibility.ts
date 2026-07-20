/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';

export interface ColumnDef {
  id: string;
  label: string;
  pinned?: boolean;
  defaultVisible?: boolean;
}

export interface UseColumnVisibilityOptions {
  storageKey: string;
  columns: ColumnDef[];
}

export interface UseColumnVisibilityResult {
  visibleColumnIds: Set<string>;
  isColumnVisible: (id: string) => boolean;
  toggleColumn: (id: string) => void;
  showAll: () => void;
  hideAll: () => void;
  columns: ColumnDef[];
}

/**
 * Reads stored column IDs from localStorage.
 * Returns null if unavailable, corrupted, or not present.
 */
function readFromStorage(storageKey: string): string[] | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Persists visible column IDs to localStorage.
 * Silently ignores errors (e.g., quota exceeded, private browsing).
 */
function writeToStorage(storageKey: string, ids: string[]): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(ids));
  } catch {
    // Fall back to in-memory only — no action needed
  }
}

/**
 * Computes the default visible set: columns with defaultVisible !== false.
 */
function getAllColumnIds(columns: ColumnDef[]): Set<string> {
  return new Set(columns.filter((col) => col.defaultVisible !== false).map((col) => col.id));
}

/**
 * A reusable hook for managing column visibility state with localStorage persistence.
 *
 * - Reads initial state from localStorage; defaults to all columns visible.
 * - Pinned columns are always included in visibleColumnIds.
 * - Guards against hiding all non-pinned columns (toggle is a no-op for the last one).
 * - Reconciles state when the columns array changes (removes stale, adds new as visible).
 * - Handles localStorage errors and corrupted JSON gracefully.
 */
export function useColumnVisibility(
  options: UseColumnVisibilityOptions
): UseColumnVisibilityResult {
  const { storageKey, columns } = options;

  // Track columns array identity for reconciliation
  const prevColumnsRef = useRef<ColumnDef[]>(columns);

  const [visibleColumnIds, setVisibleColumnIds] = useState<Set<string>>(() => {
    const stored = readFromStorage(storageKey);
    if (stored === null) {
      return getAllColumnIds(columns);
    }

    // Build visible set from stored preferences, filtering to known column IDs
    const knownIds = new Set(columns.map((col) => col.id));
    const pinnedIds = new Set(columns.filter((col) => col.pinned).map((col) => col.id));
    const visibleFromStorage = new Set<string>(stored.filter((id) => knownIds.has(id)));

    // Always include pinned columns
    for (const id of pinnedIds) {
      visibleFromStorage.add(id);
    }

    return visibleFromStorage;
  });

  // Reconcile when columns array changes
  const reconciledVisibleIds = useMemo(() => {
    const currentIds = new Set(columns.map((col) => col.id));
    const pinnedIds = new Set(columns.filter((col) => col.pinned).map((col) => col.id));
    const prevIds = new Set(prevColumnsRef.current.map((col) => col.id));

    // Find new columns (not in previous set)
    const newColumnIds = [...currentIds].filter((id) => !prevIds.has(id));
    // Find stale columns (in visible set but not in current columns)
    const staleIds = [...visibleColumnIds].filter((id) => !currentIds.has(id));

    if (newColumnIds.length === 0 && staleIds.length === 0) {
      // Ensure pinned are always included
      let needsUpdate = false;
      for (const id of pinnedIds) {
        if (!visibleColumnIds.has(id)) {
          needsUpdate = true;
          break;
        }
      }
      if (!needsUpdate) return visibleColumnIds;
    }

    // Build reconciled set
    const reconciled = new Set<string>();
    for (const id of visibleColumnIds) {
      if (currentIds.has(id)) {
        reconciled.add(id);
      }
    }
    // Add new columns as visible by default (respecting defaultVisible setting)
    for (const id of newColumnIds) {
      const col = columns.find((c) => c.id === id);
      if (col && col.defaultVisible !== false) {
        reconciled.add(id);
      }
    }
    // Ensure pinned columns are always included
    for (const id of pinnedIds) {
      reconciled.add(id);
    }

    return reconciled;
  }, [columns, visibleColumnIds]);

  // Sync reconciled state back if it differs (via useEffect to avoid setting state during render)
  useEffect(() => {
    if (reconciledVisibleIds !== visibleColumnIds) {
      setVisibleColumnIds(reconciledVisibleIds);
      // Persist reconciled state
      const idsToStore = [...reconciledVisibleIds].filter((id) => {
        const col = columns.find((c) => c.id === id);
        return col && !col.pinned;
      });
      writeToStorage(storageKey, idsToStore);
    }
  }, [reconciledVisibleIds, visibleColumnIds, columns, storageKey]);

  // Update prevColumnsRef
  useEffect(() => {
    prevColumnsRef.current = columns;
  }, [columns]);

  const isColumnVisible = useCallback(
    (id: string): boolean => {
      return reconciledVisibleIds.has(id);
    },
    [reconciledVisibleIds]
  );

  const toggleColumn = useCallback(
    (id: string) => {
      const col = columns.find((c) => c.id === id);
      // No-op for pinned columns
      if (col?.pinned) return;

      setVisibleColumnIds((prev) => {
        const isCurrentlyVisible = prev.has(id);

        if (isCurrentlyVisible) {
          // Guard: don't hide if it's the last visible non-pinned column
          const pinnedIds = new Set(columns.filter((c) => c.pinned).map((c) => c.id));
          const currentColumnIds = new Set(columns.map((c) => c.id));
          const nonPinnedVisible = [...prev].filter(
            (visId) => !pinnedIds.has(visId) && currentColumnIds.has(visId)
          );
          if (nonPinnedVisible.length <= 1) {
            return prev; // no-op
          }
        }

        const next = new Set(prev);
        if (isCurrentlyVisible) {
          next.delete(id);
        } else {
          next.add(id);
        }

        // Persist (store only non-pinned visible IDs)
        const idsToStore = [...next].filter((visId) => {
          const colDef = columns.find((c) => c.id === visId);
          return colDef && !colDef.pinned;
        });
        writeToStorage(storageKey, idsToStore);

        return next;
      });
    },
    [columns, storageKey]
  );

  const showAll = useCallback(() => {
    const allIds = new Set(columns.map((col) => col.id));
    setVisibleColumnIds(allIds);

    // Persist (store only non-pinned)
    const idsToStore = columns.filter((col) => !col.pinned).map((col) => col.id);
    writeToStorage(storageKey, idsToStore);
  }, [columns, storageKey]);

  const hideAll = useCallback(() => {
    // Keep only pinned columns visible
    const pinnedIds = new Set(columns.filter((col) => col.pinned).map((col) => col.id));

    // Guard: if there are no pinned columns, keep at least the first non-pinned column
    if (pinnedIds.size === 0 && columns.length > 0) {
      pinnedIds.add(columns[0].id);
    }

    setVisibleColumnIds(pinnedIds);

    // Persist: store empty array for non-pinned (none visible)
    const idsToStore = [...pinnedIds].filter((id) => {
      const col = columns.find((c) => c.id === id);
      return col && !col.pinned;
    });
    writeToStorage(storageKey, idsToStore);
  }, [columns, storageKey]);

  return {
    visibleColumnIds: reconciledVisibleIds,
    isColumnVisible,
    toggleColumn,
    showAll,
    hideAll,
    columns,
  };
}
