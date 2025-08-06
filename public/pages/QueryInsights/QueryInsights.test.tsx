/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { waitFor, render, screen, fireEvent } from '@testing-library/react';
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
    jest.resetAllMocks();
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

    const updateButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(updateButton);

    expect(mockOnTimeChange).toHaveBeenCalled();
  });

  it('uses query ID as itemId for table rows to prevent duplicate row rendering', () => {
    const testQueries = [
      {
        ...sampleQueries[0],
        id: 'unique-query-id-1',
        timestamp: 1000,
        group_by: 'NONE',
      },
      {
        ...sampleQueries[0],
        id: 'unique-query-id-2',
        timestamp: 2000,
        group_by: 'NONE',
      },
    ];
    expect(() => {
      render(
        <MemoryRouter>
          <DataSourceContext.Provider value={mockDataSourceContext}>
            <QueryInsights
              queries={testQueries}
              loading={false}
              onTimeChange={mockOnTimeChange}
              recentlyUsedRanges={[]}
              currStart="now-15m"
              currEnd="now"
              retrieveQueries={mockRetrieveQueries}
              // @ts-ignore
              core={mockCore}
              depsStart={{} as any}
              params={{} as any}
              dataSourceManagement={dataSourceManagementMock as any}
            />
          </DataSourceContext.Provider>
        </MemoryRouter>
      );
    }).not.toThrow();

    // Verify that the table component renders successfully
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders the expected column headers in the correct sequence for default', async () => {
    renderQueryInsights();

    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());

    const headers = await waitFor(() => screen.getAllByRole('columnheader', { hidden: false }));

    const renderedHeaders = headers.map((h) => h.textContent?.trim());

    const expectedHeaders = [
      'Id',
      'Type',
      'Query Count',
      'Timestamp',
      'Avg Latency / Latency',
      'Avg CPU Time / CPU Time',
      'Avg Memory Usage / Memory Usage',
      'Indices',
      'Search Type',
      'Coordinator Node ID',
      'Total Shards',
    ];

    expect(renderedHeaders).toEqual(expectedHeaders);
  });

  it('renders correct columns when SIMILARITY filter is applied', async () => {
    renderQueryInsights();

    const typeFilterButton = screen
      .getAllByRole('button')
      .find((btn) => btn.textContent?.trim() === 'Type');
    fireEvent.click(typeFilterButton!);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    const groupOption = await screen.findByText(/group/i); // Use this if options are plain text
    fireEvent.click(groupOption);
    const headers = await screen.findAllByRole('columnheader', { hidden: true });
    const headerTexts = headers.map((h) => h.textContent?.trim());
    const expectedHeaders = [
      'Id',
      'Type',
      'Query Count',
      'Average Latency',
      'Average CPU Time',
      'Average Memory Usage',
    ];

    expect(headerTexts).toEqual(expectedHeaders);
  });

  it('renders only individual query-related column headers when NONE filter is applied', async () => {
    renderQueryInsights();

    const typeFilterButton = screen
      .getAllByRole('button')
      .find((btn) => btn.textContent?.trim() === 'Type');
    fireEvent.click(typeFilterButton!);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('option', { name: /query/i }));
    const headers = await screen.findAllByRole('columnheader', { hidden: true });
    const headerTexts = headers.map((h) => h.textContent?.trim());
    const expectedHeaders = [
      'Id',
      'Type',
      'Timestamp',
      'Latency',
      'CPU Time',
      'Memory Usage',
      'Indices',
      'Search Type',
      'Coordinator Node ID',
      'Total Shards',
    ];

    expect(headerTexts).toEqual(expectedHeaders);
  });

  it('renders column headers when both NONE and SIMILARITY filter is applied', async () => {
    renderQueryInsights();

    const typeFilterButton = screen
      .getAllByRole('button')
      .find((btn) => btn.textContent?.trim() === 'Type');
    fireEvent.click(typeFilterButton!);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('option', { name: /query/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('option', { name: /group/i }));
    const headers = await screen.findAllByRole('columnheader', { hidden: true });
    const headerTexts = headers.map((h) => h.textContent?.trim());
    const expectedHeaders = [
      'Id',
      'Type',
      'Query Count',
      'Timestamp',
      'Avg Latency / Latency',
      'Avg CPU Time / CPU Time',
      'Avg Memory Usage / Memory Usage',
      'Indices',
      'Search Type',
      'Coordinator Node ID',
      'Total Shards',
    ];

    expect(headerTexts).toEqual(expectedHeaders);
  });
});
