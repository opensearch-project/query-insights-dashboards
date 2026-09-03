/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderHook, act } from '@testing-library/react';
import { useColumnVisibility, ColumnDef } from './useColumnVisibility';

const STORAGE_KEY = 'test_visible_columns';

// Seed the choice map (the persisted shape: id -> explicit boolean override).
const seedChoiceMap = (choices: Record<string, boolean>) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(choices));
};

const baseColumns: ColumnDef[] = [
  { id: 'id', label: 'ID', pinned: true },
  { id: 'type', label: 'Type' },
  { id: 'timestamp', label: 'Timestamp' },
  { id: 'latency', label: 'Latency' },
  { id: 'cpu', label: 'CPU Time' },
];

describe('useColumnVisibility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('default state', () => {
    it('all columns are visible when no localStorage value exists', () => {
      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns: baseColumns })
      );

      expect(result.current.visibleColumnIds.size).toBe(baseColumns.length);
      baseColumns.forEach((col) => {
        expect(result.current.isColumnVisible(col.id)).toBe(true);
      });
    });

    it('a column with defaultVisible:false is hidden with no stored choice', () => {
      const columns: ColumnDef[] = [
        ...baseColumns,
        { id: 'node_id', label: 'Node ID', defaultVisible: false },
      ];
      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns })
      );

      expect(result.current.isColumnVisible('node_id')).toBe(false);
    });
  });

  describe('toggle on/off', () => {
    it('toggling a column hides it', () => {
      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns: baseColumns })
      );

      act(() => {
        result.current.toggleColumn('type');
      });

      expect(result.current.isColumnVisible('type')).toBe(false);
    });

    it('toggling a hidden column shows it again', () => {
      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns: baseColumns })
      );

      act(() => {
        result.current.toggleColumn('type');
      });
      expect(result.current.isColumnVisible('type')).toBe(false);

      act(() => {
        result.current.toggleColumn('type');
      });
      expect(result.current.isColumnVisible('type')).toBe(true);
    });

    it('toggling a defaultVisible:false column on opts the user in', () => {
      const columns: ColumnDef[] = [
        ...baseColumns,
        { id: 'node_id', label: 'Node ID', defaultVisible: false },
      ];
      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns })
      );

      expect(result.current.isColumnVisible('node_id')).toBe(false);
      act(() => {
        result.current.toggleColumn('node_id');
      });
      expect(result.current.isColumnVisible('node_id')).toBe(true);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).node_id).toBe(true);
    });
  });

  describe('pinned columns', () => {
    it('attempting to toggle a pinned column is a no-op', () => {
      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns: baseColumns })
      );

      act(() => {
        result.current.toggleColumn('id');
      });

      expect(result.current.isColumnVisible('id')).toBe(true);
    });
  });

  describe('last-non-pinned-column guard', () => {
    it('cannot hide the last visible non-pinned column', () => {
      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns: baseColumns })
      );

      // Hide all non-pinned columns except one
      act(() => {
        result.current.toggleColumn('type');
      });
      act(() => {
        result.current.toggleColumn('timestamp');
      });
      act(() => {
        result.current.toggleColumn('latency');
      });
      // Now only 'cpu' is the last non-pinned visible column
      expect(result.current.isColumnVisible('cpu')).toBe(true);

      // Trying to hide the last one should be a no-op
      act(() => {
        result.current.toggleColumn('cpu');
      });
      expect(result.current.isColumnVisible('cpu')).toBe(true);
    });
  });

  describe('showAll', () => {
    it('makes all present columns visible', () => {
      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns: baseColumns })
      );

      // Hide some columns first
      act(() => {
        result.current.toggleColumn('type');
      });
      act(() => {
        result.current.toggleColumn('latency');
      });

      act(() => {
        result.current.showAll();
      });

      baseColumns.forEach((col) => {
        expect(result.current.isColumnVisible(col.id)).toBe(true);
      });
    });

    it('only enables columns present in the current data source; other choices are preserved', () => {
      // The user previously hid a column ('username') that is NOT present in this data source.
      seedChoiceMap({ username: false });

      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns: baseColumns })
      );

      act(() => {
        result.current.showAll();
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      // Present columns were enabled...
      baseColumns.filter((c) => !c.pinned).forEach((c) => expect(stored[c.id]).toBe(true));
      // ...but the absent column's choice was left untouched (not enabled).
      expect(stored.username).toBe(false);
    });
  });

  describe('hideAll', () => {
    it('hides all non-pinned columns (pinned remain visible)', () => {
      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns: baseColumns })
      );

      act(() => {
        result.current.hideAll();
      });

      // Pinned column remains visible
      expect(result.current.isColumnVisible('id')).toBe(true);
      // Non-pinned columns are hidden
      expect(result.current.isColumnVisible('type')).toBe(false);
      expect(result.current.isColumnVisible('timestamp')).toBe(false);
      expect(result.current.isColumnVisible('latency')).toBe(false);
      expect(result.current.isColumnVisible('cpu')).toBe(false);
    });

    it('keeps at least one column visible when there are no pinned columns', () => {
      const noPinnedColumns: ColumnDef[] = [
        { id: 'type', label: 'Type' },
        { id: 'timestamp', label: 'Timestamp' },
      ];

      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns: noPinnedColumns })
      );

      act(() => {
        result.current.hideAll();
      });

      // At least one column should remain visible
      const visibleCount = noPinnedColumns.filter((col) =>
        result.current.isColumnVisible(col.id)
      ).length;
      expect(visibleCount).toBeGreaterThanOrEqual(1);
    });

    it('only disables columns present in the current data source; other choices are preserved', () => {
      // The user previously opted a column ('node_id') in that is NOT present in this data source.
      seedChoiceMap({ node_id: true });

      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns: baseColumns })
      );

      act(() => {
        result.current.hideAll();
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      // Present non-pinned columns were disabled...
      expect(stored.type).toBe(false);
      // ...but the absent column's choice was preserved.
      expect(stored.node_id).toBe(true);
    });
  });

  describe('choice-map persistence', () => {
    it('persists an explicit choice map on toggle (merge, not overwrite)', () => {
      seedChoiceMap({ username: true }); // a choice for an absent column

      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns: baseColumns })
      );

      act(() => {
        result.current.toggleColumn('type');
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored).toMatchObject({ type: false, username: true });
    });

    it('restores state from a stored choice map on mount', () => {
      // Explicit choices: hide type (default on), show node_id (default off).
      const columns: ColumnDef[] = [
        ...baseColumns,
        { id: 'node_id', label: 'Node ID', defaultVisible: false },
      ];
      seedChoiceMap({ type: false, node_id: true });

      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns })
      );

      expect(result.current.isColumnVisible('id')).toBe(true); // pinned
      expect(result.current.isColumnVisible('type')).toBe(false); // explicit off
      expect(result.current.isColumnVisible('node_id')).toBe(true); // explicit on
      // No explicit choice -> default.
      expect(result.current.isColumnVisible('timestamp')).toBe(true);
      expect(result.current.isColumnVisible('cpu')).toBe(true);
    });

    it('migrates a legacy bare string[] of visible IDs to explicit choices', () => {
      // Legacy format written by an older build: the user had type/latency visible.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(['type', 'latency']));

      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns: baseColumns })
      );

      // Listed IDs become explicit true.
      expect(result.current.isColumnVisible('type')).toBe(true);
      expect(result.current.isColumnVisible('latency')).toBe(true);
      // Unlisted IDs have no explicit choice, so they fall back to their default (visible here).
      expect(result.current.isColumnVisible('timestamp')).toBe(true);
      expect(result.current.isColumnVisible('cpu')).toBe(true);
    });
  });

  describe('version-gated columns', () => {
    it('shows a gated column by its default when it appears with no stored choice', () => {
      const withoutGated = baseColumns;
      const withGated = [...baseColumns, { id: 'status', label: 'Status' }];

      const { result, rerender } = renderHook(
        ({ cols }) => useColumnVisibility({ storageKey: STORAGE_KEY, columns: cols }),
        { initialProps: { cols: withoutGated } }
      );

      // Gate off: column absent, not rendered.
      expect(result.current.isColumnVisible('status')).toBe(false);

      // Gate on: column appears and uses its default (visible), no reconcile needed.
      rerender({ cols: withGated });
      expect(result.current.isColumnVisible('status')).toBe(true);
    });

    it('honors a stored explicit choice for a gated column when it appears', () => {
      // The user turned the gated 'status' column off previously.
      seedChoiceMap({ status: false });

      const withoutGated = baseColumns;
      const withGated = [...baseColumns, { id: 'status', label: 'Status' }];

      const { result, rerender } = renderHook(
        ({ cols }) => useColumnVisibility({ storageKey: STORAGE_KEY, columns: cols }),
        { initialProps: { cols: withoutGated } }
      );

      // The stored choice must not be lost while the column is absent.
      rerender({ cols: withGated });
      expect(result.current.isColumnVisible('status')).toBe(false);
    });

    it('preserves an absent gated column choice across data-source columns', () => {
      // A choice for a gated column absent this render must survive a toggle of a present column.
      seedChoiceMap({ status: true });

      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns: baseColumns })
      );

      act(() => {
        result.current.toggleColumn('type');
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored.status).toBe(true); // preserved
      expect(stored.type).toBe(false); // merged in
    });
  });

  describe('storage key changes (MDS data-source switch)', () => {
    it('re-reads choices when the storage key changes', () => {
      localStorage.setItem('ds_a', JSON.stringify({ type: false }));
      localStorage.setItem('ds_b', JSON.stringify({ timestamp: false }));

      const { result, rerender } = renderHook(
        ({ key }) => useColumnVisibility({ storageKey: key, columns: baseColumns }),
        { initialProps: { key: 'ds_a' } }
      );

      expect(result.current.isColumnVisible('type')).toBe(false);
      expect(result.current.isColumnVisible('timestamp')).toBe(true);

      rerender({ key: 'ds_b' });
      expect(result.current.isColumnVisible('type')).toBe(true);
      expect(result.current.isColumnVisible('timestamp')).toBe(false);
    });
  });

  describe('corrupted localStorage handling', () => {
    it('falls back to defaults when stored JSON is invalid', () => {
      localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');

      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns: baseColumns })
      );

      baseColumns.forEach((col) => {
        expect(result.current.isColumnVisible(col.id)).toBe(true);
      });
    });

    it('ignores non-boolean values in a stored choice map', () => {
      // Only valid boolean entries are honored; others fall back to defaults.
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ type: 'nope', timestamp: false }));

      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns: baseColumns })
      );

      expect(result.current.isColumnVisible('type')).toBe(true); // invalid -> default
      expect(result.current.isColumnVisible('timestamp')).toBe(false); // valid explicit off
    });

    it('ignores non-string entries in a legacy array', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([1, 2, 3]));

      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns: baseColumns })
      );

      // No valid entries -> empty choice map -> all default (visible).
      baseColumns.forEach((col) => {
        expect(result.current.isColumnVisible(col.id)).toBe(true);
      });
    });

    it('falls back to defaults when the stored value is a JSON primitive', () => {
      // Valid JSON, but neither an array (legacy) nor an object (choice map).
      localStorage.setItem(STORAGE_KEY, JSON.stringify(42));

      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns: baseColumns })
      );

      baseColumns.forEach((col) => {
        expect(result.current.isColumnVisible(col.id)).toBe(true);
      });
    });

    it('keeps working when localStorage writes throw (e.g. quota exceeded)', () => {
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns: baseColumns })
      );

      // The write throws internally but is swallowed; in-memory state still updates.
      act(() => {
        result.current.toggleColumn('type');
      });
      expect(result.current.isColumnVisible('type')).toBe(false);

      setItemSpy.mockRestore();
    });
  });

  describe('dynamic columns change', () => {
    it('new columns that appear default to visible', () => {
      const initialColumns: ColumnDef[] = [
        { id: 'id', label: 'ID', pinned: true },
        { id: 'type', label: 'Type' },
      ];

      const expandedColumns: ColumnDef[] = [
        { id: 'id', label: 'ID', pinned: true },
        { id: 'type', label: 'Type' },
        { id: 'wlm_group', label: 'WLM Group' },
      ];

      const { result, rerender } = renderHook((props) => useColumnVisibility(props), {
        initialProps: { storageKey: STORAGE_KEY, columns: initialColumns },
      });

      expect(result.current.isColumnVisible('id')).toBe(true);
      expect(result.current.isColumnVisible('type')).toBe(true);

      // Simulate columns changing (e.g., data source update)
      rerender({ storageKey: STORAGE_KEY, columns: expandedColumns });

      expect(result.current.isColumnVisible('wlm_group')).toBe(true);
    });

    it('columns that disappear are removed from the visible set', () => {
      const initialColumns: ColumnDef[] = [
        { id: 'id', label: 'ID', pinned: true },
        { id: 'type', label: 'Type' },
        { id: 'wlm_group', label: 'WLM Group' },
      ];

      const reducedColumns: ColumnDef[] = [
        { id: 'id', label: 'ID', pinned: true },
        { id: 'type', label: 'Type' },
      ];

      const { result, rerender } = renderHook((props) => useColumnVisibility(props), {
        initialProps: { storageKey: STORAGE_KEY, columns: initialColumns },
      });

      expect(result.current.isColumnVisible('wlm_group')).toBe(true);

      // Simulate columns changing (feature flag turned off)
      rerender({ storageKey: STORAGE_KEY, columns: reducedColumns });

      expect(result.current.visibleColumnIds.has('wlm_group')).toBe(false);
    });
  });

  describe('columns pass-through', () => {
    it('returns the columns array from options', () => {
      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns: baseColumns })
      );

      expect(result.current.columns).toBe(baseColumns);
    });
  });
});
