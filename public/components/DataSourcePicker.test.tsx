/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { DataSourceMenu } from './DataSourcePicker';

describe('DataSourceMenu', () => {
  it('ignores picker initialization and does not remount when the callback changes', () => {
    const selectedDataSource = { id: 'source-a', label: 'Source A' };
    const nextDataSource = { id: 'source-b', label: 'Source B' };
    const firstSelectionCallback = jest.fn();
    const latestSelectionCallback = jest.fn();
    const setDataSource = jest.fn();

    const getDataSourceMenu = jest.fn(() => {
      const MockDataSourceMenu = ({ componentConfig }: any) => {
        useEffect(() => {
          componentConfig.onSelectedDataSources([selectedDataSource]);
          // The real selectable menu reports its active option when it mounts.
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        return (
          <button
            type="button"
            onClick={() => componentConfig.onSelectedDataSources([nextDataSource])}
          >
            Select source
          </button>
        );
      };

      return MockDataSourceMenu;
    });

    const commonProps = {
      dataSourceManagement: { ui: { getDataSourceMenu } } as any,
      depsStart: { dataSource: { dataSourceEnabled: true } } as any,
      coreStart: {
        savedObjects: { client: {} },
        notifications: {},
      } as any,
      params: { setHeaderActionMenu: undefined } as any,
      setDataSource,
      selectedDataSource,
      onManageDataSource: jest.fn(),
      dataSourcePickerReadOnly: false,
    };

    const { rerender } = render(
      <DataSourceMenu {...commonProps} onSelectedDataSource={firstSelectionCallback} />
    );

    expect(getDataSourceMenu).toHaveBeenCalledTimes(1);
    expect(firstSelectionCallback).not.toHaveBeenCalled();

    rerender(<DataSourceMenu {...commonProps} onSelectedDataSource={latestSelectionCallback} />);

    expect(getDataSourceMenu).toHaveBeenCalledTimes(1);
    expect(latestSelectionCallback).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Select source' }));

    expect(latestSelectionCallback).toHaveBeenCalledTimes(1);
    expect(setDataSource).toHaveBeenLastCalledWith(nextDataSource);
  });
});
