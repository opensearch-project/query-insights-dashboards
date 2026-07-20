/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import {
  EuiPopover,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
} from '@elastic/eui';
import { ColumnDef } from '../hooks/useColumnVisibility';

export interface ColumnVisibilityPopoverProps {
  columns: ColumnDef[];
  visibleColumnIds: Set<string>;
  onToggleColumn: (id: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  unavailableColumnIds?: Set<string>;
}

export const ColumnVisibilityPopover: React.FC<ColumnVisibilityPopoverProps> = ({
  columns,
  visibleColumnIds,
  onToggleColumn,
  onShowAll,
  onHideAll,
  unavailableColumnIds = new Set(),
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const togglePopover = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closePopover = useCallback(() => {
    setIsOpen(false);
  }, []);

  const button = (
    <EuiButtonEmpty
      onClick={togglePopover}
      aria-label="Toggle column visibility"
      data-test-subj="column-visibility-button"
      iconType="tableDensityExpanded"
      iconSide="left"
      size="s"
      flush="both"
    >
      <span>Columns</span>
      <EuiIcon type="arrowDown" size="s" style={{ marginLeft: 4 }} aria-hidden={true} />
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={closePopover}
      anchorPosition="downLeft"
      panelPaddingSize="s"
      data-test-subj="column-visibility-popover"
    >
      <div style={{ width: 260 }}>
        <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              onClick={onShowAll}
              data-test-subj="column-visibility-show-all"
            >
              Show all
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              onClick={onHideAll}
              data-test-subj="column-visibility-hide-all"
            >
              Hide all
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="xs" />
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {columns.map((col) => {
            const isChecked = visibleColumnIds.has(col.id);
            const isPinned = !!col.pinned;
            const isUnavailable = unavailableColumnIds.has(col.id);
            const isDisabled = isPinned || isUnavailable;

            const tooltipContent = isPinned
              ? 'This column cannot be hidden'
              : isUnavailable
                ? 'Not applicable for aggregated data'
                : '';

            const checkbox = (
              <EuiCheckbox
                id={`column-toggle-${col.id}`}
                label={col.label}
                checked={isPinned ? true : isUnavailable ? false : isChecked}
                disabled={isDisabled}
                onChange={() => onToggleColumn(col.id)}
                data-test-subj={`column-toggle-${col.id}`}
              />
            );

            return (
              <div key={col.id} style={{ padding: '4px 0' }}>
                {isDisabled ? (
                  <EuiToolTip content={tooltipContent} position="right">
                    {checkbox}
                  </EuiToolTip>
                ) : (
                  checkbox
                )}
              </div>
            );
          })}
        </div>
      </div>
    </EuiPopover>
  );
};
