/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import QueryDetails from './QueryDetails';
import { MockQueries } from '../../../test/testUtils';
import '@testing-library/jest-dom';
import { MemoryRouter, Route } from 'react-router-dom';
import hash from 'object-hash';
import { retrieveQueryWithSearches } from '../../../common/utils/QueryUtils';
import { DataSourceContext } from '../TopNQueries/TopNQueries';

jest.mock('echarts-for-react', () => () => <div data-testid="echarts-mock" />);

jest.mock('../../../common/utils/QueryUtils', () => ({
  // Keep the real getOpaqueId so the mock can't drift from production precedence;
  // only retrieveQueryWithSearches needs stubbing.
  ...jest.requireActual('../../../common/utils/QueryUtils'),
  retrieveQueryWithSearches: jest.fn(),
}));

jest.mock('../../utils/version-utils', () => ({
  getVersionOnce: jest.fn().mockResolvedValue('3.6.0'),
  isVersion33OrHigher: jest.fn().mockReturnValue(true),
  isVersion35OrHigher: jest.fn().mockReturnValue(true),
  isVersion36OrHigher: jest.fn().mockReturnValue(true),
}));

const mockCoreStart = {
  chrome: {
    setBreadcrumbs: jest.fn(),
  },
  uiSettings: {
    get: jest.fn().mockReturnValue(false),
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

const mockQuery = MockQueries()[0];

describe('QueryDetails component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (retrieveQueryWithSearches as jest.Mock).mockResolvedValue({ query: mockQuery, searches: [] });
  });

  const renderQueryDetails = () => {
    return render(
      <MemoryRouter
        initialEntries={[
          `/query-details/?id=${hash(
            mockQuery.id
          )}&from=2025-01-21T22:30:33.347Z&to=2025-01-22T22:30:33.347Z&verbose=true`,
        ]}
      >
        <DataSourceContext.Provider value={mockDataSourceContext}>
          <Route path="/query-details">
            <QueryDetails
              core={mockCoreStart}
              depsStart={{ navigation: {} }}
              params={{} as any}
              dataSourceManagement={dataSourceManagementMock}
            />
          </Route>
        </DataSourceContext.Provider>
      </MemoryRouter>
    );
  };

  it('renders the main components', async () => {
    renderQueryDetails();

    await waitFor(() => {
      expect(screen.getByText('Query details')).toBeInTheDocument();
      expect(screen.getByText('Query')).toBeInTheDocument();
      expect(screen.getByText('Latency')).toBeInTheDocument();
    });
  });

  const getByTestSubj = (container: HTMLElement, id: string) =>
    container.querySelector(`[data-test-subj="${id}"]`);

  it('fetches and displays query data', async () => {
    const { container } = renderQueryDetails();

    await waitFor(() => {
      expect(retrieveQueryWithSearches).toHaveBeenCalled();
    });

    const sourceSection = getByTestSubj(container, 'query-details-source-section');
    const latencyChart = getByTestSubj(container, 'query-details-latency-chart');

    expect(sourceSection).toBeInTheDocument();
    expect(latencyChart).toBeInTheDocument();
  });

  it('renders the ECharts latency chart', async () => {
    renderQueryDetails();

    await waitFor(() => {
      expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
    });
  });

  it('sets breadcrumbs correctly', async () => {
    renderQueryDetails();

    await waitFor(() => {
      expect(mockCoreStart.chrome.setBreadcrumbs).toHaveBeenCalled();
      const breadcrumbs = mockCoreStart.chrome.setBreadcrumbs.mock.calls[0][0];
      expect(breadcrumbs[0].text).toBe('Query insights');
      expect(breadcrumbs[1].text).toContain('Query details:');
    });
  });

  it('shows a PPL query as written, without the profiler', async () => {
    const pplQuery = {
      ...mockQuery,
      query_source: 'PPL',
      source: 'source=logs | where status = 500 | stats count() by host',
      indices: undefined,
      search_type: undefined,
      total_shards: undefined,
      task_resource_usages: undefined,
      phase_latency_map: undefined,
    };
    (retrieveQueryWithSearches as jest.Mock).mockResolvedValue({ query: pplQuery, searches: [] });

    const { container } = renderQueryDetails();

    expect(
      await screen.findByText('source=logs | where status = 500 | stats count() by host')
    ).toBeInTheDocument();
    expect(screen.queryByText('Open in Profiler')).not.toBeInTheDocument();
    // The latency chart shows a search's phases, which a PPL query hasn't got.
    expect(getByTestSubj(container, 'query-details-latency-chart')).not.toBeInTheDocument();
  });

  it('lists the searches a PPL query ran', async () => {
    const pplQuery = {
      ...mockQuery,
      query_source: 'PPL',
      parent_marker: 'PPL:node-1:42',
      source: 'source=logs | join left=a right=b ON a.k = b.k [ source=hosts ]',
      indices: undefined,
      task_resource_usages: undefined,
    };
    const search = (id: string, index: string, latencyMs: number, failed = false) => ({
      ...mockQuery,
      id,
      query_source: 'DSL',
      is_child: true,
      derived_from: 'PPL:node-1:42',
      indices: [index],
      failed,
      measurements: {
        latency: { number: latencyMs, count: 1, aggregationType: 'NONE' },
        cpu: { number: 2e6, count: 1, aggregationType: 'NONE' },
        memory: { number: 1024, count: 1, aggregationType: 'NONE' },
      },
    });
    (retrieveQueryWithSearches as jest.Mock).mockResolvedValue({
      query: pplQuery,
      searches: [search('search-1', 'logs', 12), search('search-2', 'hosts', 345, true)],
    });

    renderQueryDetails();

    const title = await screen.findByText('Searches (2)');
    const panel = title.closest('[data-test-subj="query-details-searches"]') as HTMLElement;
    expect(panel).not.toBeNull();
    const rows = within(panel).getAllByRole('row').slice(1);
    // Slowest first.
    expect(within(rows[0]).getByText('hosts')).toBeInTheDocument();
    expect(within(rows[0]).getByText('345.00 ms')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Failed')).toBeInTheDocument();
    expect(within(rows[1]).getByText('logs')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Completed')).toBeInTheDocument();
  });

  it('shows no Searches table for a search', async () => {
    const { container } = renderQueryDetails();
    await screen.findByText('Open in Profiler');
    expect(container.querySelector('[data-test-subj="query-details-searches"]')).toBeNull();
  });

  it('shows the coordinator task of a search a PPL query ran', async () => {
    const [shard, coordinator] = mockQuery.task_resource_usages;
    (retrieveQueryWithSearches as jest.Mock).mockResolvedValue({
      query: {
        ...mockQuery,
        is_child: true,
        derived_from: 'PPL:node-1:4242',
        // A PPL query's search is a child of the query's own task, which isn't listed.
        task_resource_usages: [shard, { ...coordinator, parentTaskId: 4242 }],
      },
      searches: [],
    });

    const { container } = renderQueryDetails();

    await screen.findByText('Coordinator Task');
    const panel = container.querySelector(
      '[data-test-subj="query-details-task-resource-usages"]'
    ) as HTMLElement;
    const shardRows = within(panel).getAllByRole('row').slice(1);
    expect(shardRows).toHaveLength(1);
    expect(within(shardRows[0]).getByText(String(shard.taskId))).toBeInTheDocument();
    expect(within(panel).getByText(String(coordinator.taskId))).toBeInTheDocument();
  });

  it('offers the profiler for a search', async () => {
    renderQueryDetails();
    expect(await screen.findByText('Open in Profiler')).toBeInTheDocument();
  });

  it('matches snapshot', async () => {
    const { container } = renderQueryDetails();

    await waitFor(() => {
      expect(retrieveQueryWithSearches).toHaveBeenCalled();
    });

    const dateElements = container.getElementsByClassName('euiDescriptionList__description');
    Array.from(dateElements).forEach((element) => {
      if (element.textContent?.includes('@')) {
        element.textContent = 'Sep 24, 2021 @ 12:00:00 AM';
      }
    });

    expect(container).toMatchSnapshot();
  });
});
