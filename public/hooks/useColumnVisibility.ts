/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useMemo, useEffect } from 'react';

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
 * Persisted shape: a choice map of the user's EXPLICIT visibility overrides.
 *
 *   { "memory": false, "node_id": true, ... }
 *
 * A column present in the map has an explicit choice (true = shown, false = hidden). A column
 * ABSENT from the map has no explicit choice and falls back to its source-code default
 * (`defaultVisible`, defaulting to true). This lets version-gated columns behave correctly
 * without tracking which columns "existed" before: an absent column is simply not rendered, and
 * when it appears it resolves from the map (if the user chose) or from its default.
 *
 * Updates MERGE into the map rather than overwriting it, so choices for columns not present in
 * the current data source (e.g. under MDS) are preserved.
 */
type ChoiceMap = Record<string, boolean>;

/**
 * Reads the choice map from localStorage.
 *
 * Accepts two shapes for backward compatibility:
 *  - The current object shape: `{ [id]: boolean }`.
 *  - The legacy bare `string[]` of visible IDs (written by older builds). It is migrated by
 *    marking each listed ID as an explicit `true`; unlisted IDs stay absent and fall back to
 *    their defaults.
 *
 * Returns an empty map when nothing is stored, unavailable, or corrupted.
 */
function readChoiceMap(storageKey: string): ChoiceMap {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) return {};
    const parsed = JSON.parse(raw);

    // Legacy format: bare array of visible IDs.
    if (Array.isArray(parsed)) {
      const map: ChoiceMap = {};
      for (const id of parsed) {
        if (typeof id === 'string') map[id] = true;
      }
      return map;
    }

    // Current format: object of id -> boolean.
    if (parsed && typeof parsed === 'object') {
      const map: ChoiceMap = {};
      for (const [id, value] of Object.entries(parsed)) {
        if (typeof value === 'boolean') map[id] = value;
      }
      return map;
    }

    return {};
  } catch {
    return {};
  }
}

/**
 * Persists the choice map. Silently ignores errors (e.g. quota exceeded, private browsing).
 */
function writeChoiceMap(storageKey: string, choices: ChoiceMap): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(choices));
  } catch {
    // Fall back to in-memory only — no action needed.
  }
}

/**
 * Resolves whether a column is visible: pinned columns are always visible; otherwise an explicit
 * choice in the map wins, and an absent column falls back to its `defaultVisible` (default true).
 */
function resolveVisible(col: ColumnDef, choices: ChoiceMap): boolean {
  if (col.pinned) return true;
  const choice = choices[col.id];
  if (choice !== undefined) return choice;
  return col.defaultVisible !== false;
}

/**
 * A reusable hook for managing column visibility, persisted to localStorage as a choice map of
 * explicit user overrides (see ChoiceMap).
 *
 * - Columns without an explicit choice use their source-code default (`defaultVisible`).
 * - Pinned columns are always visible and never stored.
 * - Toggling merges a single entry into the map; "Show all" / "Hide all" only affect columns
 *   present in the current data source, so choices for other columns are preserved.
 * - Guards against hiding the last visible non-pinned column.
 * - Handles localStorage errors and corrupted JSON gracefully.
 */
export function useColumnVisibility(
  options: UseColumnVisibilityOptions
): UseColumnVisibilityResult {
  const { storageKey, columns } = options;

  const [choices, setChoices] = useState<ChoiceMap>(() => readChoiceMap(storageKey));

  // Re-read persisted choices when the storage key changes (e.g. switching data source).
  useEffect(() => {
    setChoices(readChoiceMap(storageKey));
  }, [storageKey]);

  const persist = useCallback(
    (next: ChoiceMap) => {
      setChoices(next);
      writeChoiceMap(storageKey, next);
    },
    [storageKey]
  );

  // Visible columns present in the current data source, resolved from choices + defaults.
  const visibleColumnIds = useMemo(() => {
    const visible = new Set<string>();
    for (const col of columns) {
      if (resolveVisible(col, choices)) visible.add(col.id);
    }
    return visible;
  }, [columns, choices]);

  const isColumnVisible = useCallback(
    (id: string): boolean => visibleColumnIds.has(id),
    [visibleColumnIds]
  );

  const toggleColumn = useCallback(
    (id: string) => {
      const col = columns.find((c) => c.id === id);
      // No-op for unknown or pinned columns.
      if (!col || col.pinned) return;

      const currentlyVisible = resolveVisible(col, choices);

      // Guard: don't hide the last visible non-pinned column in this data source.
      if (currentlyVisible) {
        const nonPinnedVisible = columns.filter((c) => !c.pinned && resolveVisible(c, choices));
        if (nonPinnedVisible.length <= 1) return;
      }

      // Merge a single explicit choice into the map.
      persist({ ...choices, [id]: !currentlyVisible });
    },
    [columns, choices, persist]
  );

  const showAll = useCallback(() => {
    // Only enable columns present in this data source; preserve choices for absent columns.
    const next: ChoiceMap = { ...choices };
    for (const col of columns) {
      if (!col.pinned) next[col.id] = true;
    }
    persist(next);
  }, [columns, choices, persist]);

  const hideAll = useCallback(() => {
    // Hide every non-pinned column present in this data source, but keep at least one visible
    // when there are no pinned columns. Choices for absent columns are preserved.
    const next: ChoiceMap = { ...choices };
    const nonPinned = columns.filter((col) => !col.pinned);
    const hasPinned = columns.some((col) => col.pinned);
    // When nothing is pinned, keep the first non-pinned column visible so the table isn't empty.
    const keepVisibleId = !hasPinned && nonPinned.length > 0 ? nonPinned[0].id : undefined;

    for (const col of nonPinned) {
      next[col.id] = col.id === keepVisibleId;
    }
    persist(next);
  }, [columns, choices, persist]);

  return {
    visibleColumnIds,
    isColumnVisible,
    toggleColumn,
    showAll,
    hideAll,
    columns,
  };
}
