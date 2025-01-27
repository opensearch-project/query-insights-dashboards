/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import QueryInsights from './QueryInsights';
import { MemoryRouter } from 'react-router-dom';
import { MockQueries } from '../../../test/testUtils';
import { DataSourceContext } from '../TopNQueries/TopNQueries';

// Mock functions and data
const mockOnTimeChange = jest.fn();
const mockCore = {
  chrome: {
    setBreadcrumbs: jest.fn(),
  },
};

const dataSourceMenuMock = jest.fn(() => <div>Mock DataSourceMenu</div>);

const dataSourceManagementMock = {
  ui: {
    getDataSourceMenu: jest.fn().mockReturnValue(dataSourceMenuMock),
  },
};
const mockDataSourceContext = {
  dataSource: { id: 'test', label: 'Test' },
  setDataSource: jest.fn(),
};

const sampleQueries = MockQueries();

const renderQueryInsights = () =>
  render(
    <MemoryRouter>
      <DataSourceContext.Provider value={mockDataSourceContext}>
        <QueryInsights
          queries={sampleQueries}
          loading={false}
          onTimeChange={mockOnTimeChange}
          recentlyUsedRanges={[]}
          currStart="now-15m"
          currEnd="now"
          // @ts-ignore
          core={mockCore}
          depsStart={{ navigation: {} }}
          params={{} as any}
          dataSourceManagement={dataSourceManagementMock}
        />
      </DataSourceContext.Provider>
    </MemoryRouter>
  );

describe('QueryInsights Component', () => {
  beforeAll(() => {
    jest.spyOn(Date.prototype, 'toLocaleTimeString').mockImplementation(() => '12:00:00 AM');
    jest.spyOn(Date.prototype, 'toDateString').mockImplementation(() => 'Mon Jan 13 2025');
  });

  afterAll(() => {
    jest.resetAllMocks(); // Reset all mocks after all tests
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the table with the correct columns and data', () => {
    const { container } = renderQueryInsights();
    expect(container).toMatchSnapshot();
  });

  it('calls setBreadcrumbs on mount', () => {
    renderQueryInsights();
    expect(mockCore.chrome.setBreadcrumbs).toHaveBeenCalledWith([
      {
        text: 'Query insights',
        href: '/queryInsights',
        onClick: expect.any(Function),
      },
    ]);
  });

  it('triggers onTimeChange when the date picker changes', () => {
    renderQueryInsights();

    // Find the date picker update button
    const updateButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(updateButton);

    // Verify the onTimeChange callback is triggered
    expect(mockOnTimeChange).toHaveBeenCalled();
  });
});
