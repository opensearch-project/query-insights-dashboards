/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderHook, act } from '@testing-library/react';
import { useColumnVisibility, ColumnDef } from './useColumnVisibility';

const STORAGE_KEY = 'test_visible_columns';

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
    it('makes all columns visible', () => {
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
      const visibleCount = noPinnedColumns.filter((col) => result.current.isColumnVisible(col.id))
        .length;
      expect(visibleCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('localStorage persistence', () => {
    it('persists state to localStorage on toggle', () => {
      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns: baseColumns })
      );

      act(() => {
        result.current.toggleColumn('type');
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored).toBeInstanceOf(Array);
      expect(stored).not.toContain('type');
    });

    it('persists state to localStorage on showAll', () => {
      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns: baseColumns })
      );

      act(() => {
        result.current.toggleColumn('type');
      });
      act(() => {
        result.current.showAll();
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored).toContain('type');
      expect(stored).toContain('timestamp');
      expect(stored).toContain('latency');
      expect(stored).toContain('cpu');
    });

    it('persists state to localStorage on hideAll', () => {
      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns: baseColumns })
      );

      act(() => {
        result.current.hideAll();
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      // Non-pinned columns should not be in stored array (they're hidden)
      expect(stored).not.toContain('type');
      expect(stored).not.toContain('timestamp');
    });

    it('restores state from localStorage on mount', () => {
      // Pre-seed localStorage with only some columns visible
      localStorage.setItem(STORAGE_KEY, JSON.stringify(['type', 'latency']));

      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns: baseColumns })
      );

      // Pinned column always visible
      expect(result.current.isColumnVisible('id')).toBe(true);
      // Stored visible columns
      expect(result.current.isColumnVisible('type')).toBe(true);
      expect(result.current.isColumnVisible('latency')).toBe(true);
      // Not stored, so hidden
      expect(result.current.isColumnVisible('timestamp')).toBe(false);
      expect(result.current.isColumnVisible('cpu')).toBe(false);
    });
  });

  describe('corrupted localStorage handling', () => {
    it('falls back to all-visible defaults when stored JSON is invalid', () => {
      localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');

      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns: baseColumns })
      );

      baseColumns.forEach((col) => {
        expect(result.current.isColumnVisible(col.id)).toBe(true);
      });
    });

    it('falls back to all-visible defaults when stored value is not an array of strings', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));

      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns: baseColumns })
      );

      baseColumns.forEach((col) => {
        expect(result.current.isColumnVisible(col.id)).toBe(true);
      });
    });

    it('falls back to all-visible defaults when stored array contains non-strings', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([1, 2, 3]));

      const { result } = renderHook(() =>
        useColumnVisibility({ storageKey: STORAGE_KEY, columns: baseColumns })
      );

      baseColumns.forEach((col) => {
        expect(result.current.isColumnVisible(col.id)).toBe(true);
      });
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
