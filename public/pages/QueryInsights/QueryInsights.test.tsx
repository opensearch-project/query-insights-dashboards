/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { waitFor, render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import QueryInsights from './QueryInsights';
import { MemoryRouter } from 'react-router-dom';
import stubTopQueries from '../../../cypress/fixtures/stub_top_queries.json';
import { DataSourceContext } from '../TopNQueries/TopNQueries';

const sampleQueries = (stubTopQueries as any).response.top_queries;

const mockOnTimeChange = jest.fn();
const mockCore = {
  chrome: { setBreadcrumbs: jest.fn() },
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

const findTypeFilterButton = (): HTMLElement => {
  const byText = screen
    .queryAllByText(/^Type$/i)
    .map((n) => n.closest('button'))
    .find(Boolean);
  if (byText) return byText as HTMLElement;

  const byRole = screen.queryAllByRole('button').find((b) => b.textContent?.trim() === 'Type');
  if (byRole) return byRole as HTMLElement;

  const availableButtons = screen.queryAllByRole('button').map(b => b.textContent?.trim()).filter(Boolean);
  throw new Error(`Type filter button not found. Available buttons: ${availableButtons.join(', ')}`);
};

const ensureTypePopoverOpen = async (): Promise<HTMLElement> => {
  let pop = screen.queryByRole('dialog');
  if (!pop) {
    fireEvent.click(findTypeFilterButton());
    pop = await screen.findByRole('dialog');
  }
  return pop;
};

const clickTypeOption = async (label: 'group' | 'query') => {
  const pop = await ensureTypePopoverOpen();

  const nodes = within(pop).getAllByText((content, element) => {
    const text = element?.textContent?.trim() ?? '';
    return new RegExp(`^${label}$`, 'i').test(text);
  });
  const btn = nodes[0].closest('button') as HTMLElement;
  fireEvent.click(btn);
};

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

  it('renders the table with the correct columns and data (snapshot)', () => {
    const { container } = renderQueryInsights();
    expect(container).toMatchSnapshot();
  });

  it('calls setBreadcrumbs on mount', () => {
    renderQueryInsights();
    expect(mockCore.chrome.setBreadcrumbs).toHaveBeenCalledWith([
      { text: 'Query insights', href: '/queryInsights', onClick: expect.any(Function) },
    ]);
  });

  it('triggers onTimeChange when the date picker refresh is clicked', () => {
    renderQueryInsights();
    const btn =
      screen.queryByRole('button', { name: /refresh/i }) ||
      screen.getByRole('button', { name: /update/i });
    fireEvent.click(btn!);
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
              queries={testQueries as any}
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

  it('renders the expected column headers for default (mixed) view', async () => {
    renderQueryInsights();
    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());

    const headers = await waitFor(() => screen.getAllByRole('columnheader', { hidden: false }));
    const texts = headers.map((h) => h.textContent?.trim());

    expect(texts).toEqual([
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

  it('renders correct columns when SIMILARITY filter (group-only) is applied', async () => {
    renderQueryInsights();

    await clickTypeOption('group');

    const headers = await screen.findAllByRole('columnheader', { hidden: true });
    const headerTexts = headers.map((h) => h.textContent?.trim());

    expect(headerTexts).toEqual([
      'Id',
      'Type',
      'Query Count',
      'Average Latency',
      'Average CPU Time',
      'Average Memory Usage',
    ]);
  });

  it('renders only query-related headers when NONE filter (query-only) is applied', async () => {
    renderQueryInsights();

    await clickTypeOption('query');

    const headers = await screen.findAllByRole('columnheader', { hidden: true });
    const headerTexts = headers.map((h) => h.textContent?.trim());

    expect(headerTexts).toEqual([
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
    ]);
  });

  it('renders mixed headers when both NONE and SIMILARITY filters are applied', async () => {
    renderQueryInsights();

    await clickTypeOption('query');
    await clickTypeOption('group');

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
