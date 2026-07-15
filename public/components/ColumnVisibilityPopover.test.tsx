/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, fireEvent, screen, configure } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ColumnVisibilityPopover } from './ColumnVisibilityPopover';
import { ColumnDef } from '../hooks/useColumnVisibility';

// EUI uses data-test-subj instead of data-testid
configure({ testIdAttribute: 'data-test-subj' });

const mockColumns: ColumnDef[] = [
  { id: 'id', label: 'ID', pinned: true },
  { id: 'type', label: 'Type' },
  { id: 'timestamp', label: 'Timestamp' },
  { id: 'latency', label: 'Latency' },
];

const defaultProps = {
  columns: mockColumns,
  visibleColumnIds: new Set(['id', 'type', 'timestamp', 'latency']),
  onToggleColumn: jest.fn(),
  onShowAll: jest.fn(),
  onHideAll: jest.fn(),
};

function openPopover() {
  const button = screen.getByTestId('column-visibility-button');
  fireEvent.click(button);
}

describe('ColumnVisibilityPopover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the popover on button click', () => {
    render(<ColumnVisibilityPopover {...defaultProps} />);
    expect(screen.queryByTestId('column-visibility-show-all')).toBeNull();
    openPopover();
    expect(screen.getByTestId('column-visibility-show-all')).toBeTruthy();
  });

  it('renders all columns as checkboxes', () => {
    render(<ColumnVisibilityPopover {...defaultProps} />);
    openPopover();
    mockColumns.forEach((col) => {
      // EUI puts data-test-subj directly on the input element
      const checkbox = screen.getByTestId(`column-toggle-${col.id}`);
      expect(checkbox).toBeTruthy();
      expect(checkbox.tagName).toBe('INPUT');
      expect(screen.getByLabelText(col.label)).toBeTruthy();
    });
  });

  it('disables checkboxes for pinned columns', () => {
    render(<ColumnVisibilityPopover {...defaultProps} />);
    openPopover();
    const pinnedCheckbox = screen.getByTestId('column-toggle-id') as HTMLInputElement;
    expect(pinnedCheckbox.disabled).toBe(true);
  });

  it('calls onToggleColumn when a non-pinned checkbox is toggled', () => {
    render(<ColumnVisibilityPopover {...defaultProps} />);
    openPopover();
    const typeCheckbox = screen.getByTestId('column-toggle-type');
    fireEvent.click(typeCheckbox);
    expect(defaultProps.onToggleColumn).toHaveBeenCalledWith('type');
  });

  it('calls onShowAll when "Show all" is clicked', () => {
    render(<ColumnVisibilityPopover {...defaultProps} />);
    openPopover();
    fireEvent.click(screen.getByTestId('column-visibility-show-all'));
    expect(defaultProps.onShowAll).toHaveBeenCalledTimes(1);
  });

  it('calls onHideAll when "Hide all" is clicked', () => {
    render(<ColumnVisibilityPopover {...defaultProps} />);
    openPopover();
    fireEvent.click(screen.getByTestId('column-visibility-hide-all'));
    expect(defaultProps.onHideAll).toHaveBeenCalledTimes(1);
  });

  it('has proper accessibility attributes', () => {
    render(<ColumnVisibilityPopover {...defaultProps} />);
    const button = screen.getByTestId('column-visibility-button');
    expect(button.getAttribute('aria-label')).toBe('Toggle column visibility');
    openPopover();
    mockColumns.forEach((col) => {
      expect(screen.getByLabelText(col.label)).toBeTruthy();
    });
  });
});
