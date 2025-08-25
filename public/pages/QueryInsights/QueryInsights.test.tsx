/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { waitFor, render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import QueryInsights from './QueryInsights';
import { MemoryRouter } from 'react-router-dom';
import stubTopQueries from '../../../cypress/fixtures/stub_top_queries.json';
import { DataSourceContext } from '../TopNQueries/TopNQueries';

// Fix duplicate IDs in sample data to prevent React key warnings
const sampleQueries = stubTopQueries.response.top_queries.map((query, index) => ({
  ...query,
  id:
    query.id === 'a2e1c822-3e3c-4d1b-adb2-9f73af094b43' && index > 0
      ? `${query.id}-${index}`
      : query.id,
  source: {},
  phase_latency_map: {},
  task_resource_usages: [],
})) as any;

// Mocks
const mockOnTimeChange = jest.fn();
const mockCore = {
  chrome: { setBreadcrumbs: jest.fn() },
  application: {},
  docLinks: {},
  http: {},
  savedObjects: {},
  uiSettings: {},
  notifications: {},
  overlays: {},
  i18n: {},
  theme: {},
  injectedMetadata: {},
  deprecations: {},
  executionContext: {},
} as any;

const dataSourceMenuMock = jest.fn(() => <div>Mock DataSourceMenu</div>);
const dataSourceManagementMock = {
  ui: { getDataSourceMenu: jest.fn().mockReturnValue(dataSourceMenuMock) },
} as any;

const mockDataSourceContext = {
  dataSource: { id: 'test', label: 'Test' },
  setDataSource: jest.fn(),
};

const mockRetrieveQueries = jest.fn();

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
          retrieveQueries={mockRetrieveQueries}
          core={mockCore}
          depsStart={{} as any}
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

  it('triggers onTimeChange when the date picker refresh is clicked', () => {
    renderQueryInsights();
    // EUI can label this "Refresh" or "Update" depending on props/version
    const refreshBtn =
      screen.queryByRole('button', { name: /refresh/i }) ||
      screen.getByRole('button', { name: /update/i });
    fireEvent.click(refreshBtn);
    expect(mockOnTimeChange).toHaveBeenCalled();
  });

  it('uses query ID as itemId for table rows to prevent duplicate row rendering', () => {
    const testQueries = [
      { ...sampleQueries[0], id: 'unique-query-id-1', timestamp: 1000, group_by: 'NONE' },
      { ...sampleQueries[1], id: 'unique-query-id-2', timestamp: 2000, group_by: 'NONE' },
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
              core={mockCore}
              depsStart={{} as any}
              params={{} as any}
              dataSourceManagement={dataSourceManagementMock}
            />
          </DataSourceContext.Provider>
        </MemoryRouter>
      );
    }).not.toThrow();

    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders the expected column headers in the correct sequence for default (mixed)', async () => {
    renderQueryInsights();

    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());

    const headers = await waitFor(() => screen.getAllByRole('columnheader', { hidden: false }));
    const renderedHeaders = headers.map((h) => h.textContent?.trim());

    expect(renderedHeaders).toEqual([
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
    ]);
  });

  it('renders correct columns when SIMILARITY filter is applied', async () => {
    renderQueryInsights();

    const typeFilterButton = screen
      .getAllByRole('button')
      .find((btn) => btn.textContent?.trim() === 'Type');
    fireEvent.click(typeFilterButton!);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    const groupOptions = screen.getAllByText(/group/i);
    fireEvent.click(groupOptions[0]);

    const headers = await screen.findAllByRole('columnheader', { hidden: true });
    const headerTexts = headers.map((h) => h.textContent?.trim());
    expect(headerTexts).toEqual([
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
    ]);
  });

  it('renders only individual query-related column headers when NONE filter is applied', async () => {
    renderQueryInsights();

    const typeFilterButton = screen
      .getAllByRole('button')
      .find((btn) => btn.textContent?.trim() === 'Type');
    fireEvent.click(typeFilterButton!);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    const queryOptions = screen.getAllByText(/query/i);
    fireEvent.click(queryOptions[0]);

    const headers = await screen.findAllByRole('columnheader', { hidden: true });
    const headerTexts = headers.map((h) => h.textContent?.trim());
    expect(headerTexts).toEqual([
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
    ]);
  });

  it('renders column headers when both NONE and SIMILARITY filter is applied', async () => {
    renderQueryInsights();

    const typeFilterButton = screen
      .getAllByRole('button')
      .find((btn) => btn.textContent?.trim() === 'Type');
    fireEvent.click(typeFilterButton!);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    const queryOptions = screen.getAllByText(/query/i);
    fireEvent.click(queryOptions[0]);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    const groupOptions = screen.getAllByText(/group/i);
    fireEvent.click(groupOptions[0]);

    const headers = await screen.findAllByRole('columnheader', { hidden: true });
    const headerTexts = headers.map((h) => h.textContent?.trim());
    expect(headerTexts).toEqual([
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
    ]);
  });
});
