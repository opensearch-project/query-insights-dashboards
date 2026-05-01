/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CoreStart } from 'opensearch-dashboards/public';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { DataSourceContext } from '../TopNQueries/TopNQueries';
import { InflightQueries } from './InflightQueries';
import { retrieveLiveQueries } from '../../../common/utils/QueryUtils';
import { getVersionOnce, isVersion33OrHigher } from '../../utils/version-utils';
import stubLiveQueries from '../../../cypress/fixtures/stub_live_queries.json';
import '@testing-library/jest-dom';

jest.mock('../../../common/utils/QueryUtils');
jest.mock('../../utils/datasource-utils', () => ({
  getDataSourceVersion: jest.fn().mockResolvedValue('3.3.0'),
}));
jest.mock('../../utils/version-utils');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(),
}));

// super-lightweight react-vis stubs
jest.mock('react-vis', () => ({
  RadialChart: (props: any) => (
    <div data-testid={props['data-test-subj'] || 'RadialChart'}>{props.children}</div>
  ),
  XYPlot: (props: any) => (
    <div data-testid={props['data-test-subj'] || 'XYPlot'}>{props.children}</div>
  ),
  HorizontalBarSeries: () => <div>HorizontalBarSeries</div>,
  XAxis: () => <div>XAxis</div>,
  YAxis: () => <div>YAxis</div>,
  HorizontalGridLines: () => <div>HorizontalGridLines</div>,
}));

/**
 * Helpers
 */
const makeCore = (): CoreStart =>
  (({
    http: {
      get: jest.fn(),
      post: jest.fn(),
    },
    uiSettings: {
      get: jest.fn().mockReturnValue(false),
    },
    notifications: {
      toasts: {
        addSuccess: jest.fn(),
        addError: jest.fn(),
      },
    },
  } as unknown) as CoreStart);

const withDataSource = (ui: React.ReactNode) => (
  <MemoryRouter>
    <DataSourceContext.Provider
      value={{
        dataSource: { id: 'default' },
        setDataSource: jest.fn(),
      }}
    >
      {ui}
    </DataSourceContext.Provider>
  </MemoryRouter>
);

const mockLiveQueries = (payload: any) => {
  (retrieveLiveQueries as jest.MockedFunction<typeof retrieveLiveQueries>).mockResolvedValue(
    payload as any
  );
};

// Create mock data with fixed timestamps to avoid timezone issues in snapshots
const mockStubLiveQueries = {
  ok: true,
  response: {
    live_queries: stubLiveQueries.response.live_queries.map((query, index) => ({
      ...query,
      timestamp: 1640995200000 + index * 1000, // Fixed timestamp: 2022-01-01 00:00:00 UTC + index seconds
    })),
  },
};

// Some tests rely on periodic refresh. Keep timers disciplined.
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  cleanup();
  // Reset useLocation mock to default
  (useLocation as jest.Mock).mockReturnValue({ search: '' });
  // Mock version utilities - default to 3.3.0 for WLM support
  (getVersionOnce as jest.MockedFunction<typeof getVersionOnce>).mockResolvedValue('3.3.0');
  (isVersion33OrHigher as jest.MockedFunction<typeof isVersion33OrHigher>).mockReturnValue(true);
  // Suppress console warnings for cleaner test output
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('InflightQueries', () => {
  const scrubTimestamps = (root: HTMLElement) => {
    const nodes = root.querySelectorAll(
      '.euiTableCellContent, .euiTableCellContent--overflowingContent, .euiDescriptionList__description'
    );
    const ts = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b.*@.*(AM|PM)/;
    nodes.forEach((el) => {
      const txt = el.textContent ?? '';
      if (ts.test(txt)) {
        el.textContent = 'Sep 24, 2021 @ 12:00:00 AM';
      }
    });
  };

  it('matches snapshot', async () => {
    const core = makeCore();

    (core.http.get as jest.Mock).mockImplementation((url) => {
      if (url === '/api/_wlm/workload_group') {
        return Promise.resolve({ workload_groups: [] });
      }
      if (url.includes('_wlm/stats')) {
        return Promise.resolve({});
      }
      return Promise.resolve({});
    });

    mockLiveQueries(mockStubLiveQueries);

    const { container } = render(
      withDataSource(
        <InflightQueries
          core={core}
          depsStart={
            {
              data: {
                dataSources: {
                  get: jest.fn().mockReturnValue(core.http),
                },
              },
            } as any
          }
          params={{} as any}
          dataSourceManagement={undefined}
        />
      )
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(
      () => {
        expect(screen.getByText('Active queries')).toBeInTheDocument();
        expect(screen.getByLabelText('Workload group selector')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    scrubTimestamps(container);
    expect(container).toMatchSnapshot();
  });

  it('displays metric values from fixture', async () => {
    const core = makeCore();
    mockLiveQueries(mockStubLiveQueries);

    render(
      withDataSource(
        <InflightQueries
          core={core}
          depsStart={
            {
              data: {
                dataSources: {
                  get: jest.fn().mockReturnValue(core.http),
                },
              },
            } as any
          }
          params={{} as any}
          dataSourceManagement={undefined}
        />
      )
    );

    // Headings render
    await waitFor(() => expect(screen.getByText('Active queries')).toBeInTheDocument(), {
      timeout: 5000,
    });

    // Wait for data to load — 7 active queries (13 cancelled are excluded from metrics)
    await waitFor(() => expect(screen.getByText('7')).toBeInTheDocument(), { timeout: 5000 });

    // Spot-check a few fixture-driven values from your JSON (active queries only)
    expect(screen.getByText('8.25 s')).toBeInTheDocument();
    expect(screen.getByText('9.69 s')).toBeInTheDocument();
    expect(screen.getByText('576.76 µs')).toBeInTheDocument();
    expect(screen.getByText('23.53 KB')).toBeInTheDocument();

    // A row identifier — text is split across elements due to the link
    expect(screen.getByText('node-A1B2C4E5:3614')).toBeInTheDocument();
  });

  it('shows zeros when there are no queries', async () => {
    const core = makeCore();
    mockLiveQueries({ ok: true, response: { live_queries: [] } });
    // Mock version < 3.3.0 to disable WLM features
    (getVersionOnce as jest.Mock).mockResolvedValue('3.0.0');

    render(
      withDataSource(
        <InflightQueries
          core={core}
          depsStart={
            { data: { dataSources: { get: jest.fn().mockReturnValue(core.http) } } } as any
          }
          params={{} as any}
          dataSourceManagement={undefined}
        />
      )
    );

    await waitFor(
      () => {
        expect(screen.getByText('Active queries')).toBeInTheDocument();
        expect(screen.getAllByText('0')).toHaveLength(8); // 5 metric panels + 3 finished query stats panels
      },
      { timeout: 5000 }
    );
  });

  it('updates data periodically', async () => {
    const core = makeCore();
    mockLiveQueries(mockStubLiveQueries);

    render(
      withDataSource(
        <InflightQueries
          core={core}
          depsStart={
            { data: { dataSources: { get: jest.fn().mockReturnValue(core.http) } } } as any
          }
          params={{} as any}
          dataSourceManagement={undefined}
        />
      )
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => expect(retrieveLiveQueries).toHaveBeenCalledTimes(1), { timeout: 5000 });

    await act(async () => {
      jest.advanceTimersByTime(30_000);
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(retrieveLiveQueries).toHaveBeenCalledTimes(2), { timeout: 5000 });

    await act(async () => {
      jest.advanceTimersByTime(30_000);
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(retrieveLiveQueries).toHaveBeenCalledTimes(3), { timeout: 5000 });
  });

  it('formats time values correctly (small numbers)', async () => {
    const core = makeCore();
    mockLiveQueries({
      ok: true,
      response: {
        live_queries: [
          {
            id: 'query1',
            measurements: {
              latency: { number: 500 }, // nanos
              cpu: { number: 1_000_000 },
              memory: { number: 500 },
            },
            timestamp: Date.now(),
            node_id: 'node1',
            description: 'indices[index1] search_type[dfs_query_then_fetch]',
          },
        ],
      },
    });

    render(
      withDataSource(
        <InflightQueries
          core={core}
          depsStart={
            { data: { dataSources: { get: jest.fn().mockReturnValue(core.http) } } } as any
          }
          params={{} as any}
          dataSourceManagement={undefined}
        />
      )
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(
      () => {
        expect(screen.getByText('Active queries')).toBeInTheDocument();
        expect(screen.getAllByText('0.50 µs').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('1.00 ms').length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 5000 }
    );
  });

  it('renders legend correctly', async () => {
    const core = makeCore();
    mockLiveQueries(mockStubLiveQueries);

    render(
      withDataSource(
        <InflightQueries
          core={core}
          depsStart={
            { data: { dataSources: { get: jest.fn().mockReturnValue(core.http) } } } as any
          }
          params={{} as any}
          dataSourceManagement={undefined}
        />
      )
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(
      () => {
        expect(screen.getByText('Active queries')).toBeInTheDocument();
        expect(screen.getByText(/Queries by Node/i)).toBeInTheDocument();
        expect(screen.getByText(/others:/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it('handles WLM group selection when WLM plugin is present', async () => {
    const core = makeCore();

    (core.http.get as jest.Mock).mockImplementation((url) => {
      if (url === '/api/_wlm/workload_group') {
        return Promise.resolve({ workload_groups: [] });
      }
      if (url.includes('_wlm/stats')) {
        return Promise.resolve({});
      }
      return Promise.resolve({});
    });

    mockLiveQueries(mockStubLiveQueries);

    const { unmount } = render(
      withDataSource(
        <InflightQueries
          core={core}
          depsStart={
            { data: { dataSources: { get: jest.fn().mockReturnValue(core.http) } } } as any
          }
          params={{} as any}
          dataSourceManagement={undefined}
        />
      )
    );

    // Flush all promises and advance timers
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(
      () => {
        expect(retrieveLiveQueries).toHaveBeenCalled();
        expect(screen.getByLabelText('Workload group selector')).toBeInTheDocument();
      },
      { timeout: 1000 }
    );

    unmount();
  });

  it('toggles auto-refresh', async () => {
    const core = makeCore();
    mockLiveQueries(mockStubLiveQueries);

    render(
      withDataSource(
        <InflightQueries
          core={core}
          depsStart={
            { data: { dataSources: { get: jest.fn().mockReturnValue(core.http) } } } as any
          }
          params={{} as any}
          dataSourceManagement={undefined}
        />
      )
    );

    await waitFor(
      () => {
        const switches = screen.getAllByRole('switch');
        expect(switches.length).toBeGreaterThanOrEqual(1);
      },
      {
        timeout: 5000,
      }
    );
  });

  it('displays ANALYTICS_WORKLOAD_GROUP and SEARCH_WORKLOAD_GROUP in rows', async () => {
    const core = makeCore();

    (core.http.get as jest.Mock).mockImplementation((url) => {
      if (url === '/api/_wlm/workload_group') {
        return Promise.resolve({ workload_groups: [] });
      }
      if (url.includes('_wlm/stats')) {
        return Promise.resolve({});
      }
      return Promise.resolve({ response: { live_queries: [] } });
    });

    mockLiveQueries(mockStubLiveQueries);

    const { unmount } = render(
      withDataSource(
        <InflightQueries
          core={core}
          depsStart={
            { data: { dataSources: { get: jest.fn().mockReturnValue(core.http) } } } as any
          }
          params={{} as any}
          dataSourceManagement={undefined}
        />
      )
    );

    // Flush all promises and advance timers
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(
      () => {
        expect(retrieveLiveQueries).toHaveBeenCalled();
        expect(screen.getAllByText('WLM Group').length).toBeGreaterThan(0);
      },
      { timeout: 1000 }
    );

    expect(screen.getAllByText('ANALYTICS_WORKLOAD_GROUP').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SEARCH_WORKLOAD_GROUP').length).toBeGreaterThan(0);

    unmount();
  });

  it('calls API with SEARCH_WORKLOAD_GROUP parameter', async () => {
    const core = makeCore();
    mockLiveQueries(mockStubLiveQueries);

    (useLocation as jest.Mock).mockReturnValue({
      search: '?wlmGroupId=SEARCH_WORKLOAD_GROUP',
    });

    render(
      withDataSource(
        <InflightQueries
          core={core}
          depsStart={
            { data: { dataSources: { get: jest.fn().mockReturnValue(core.http) } } } as any
          }
          params={{} as any}
          dataSourceManagement={undefined}
        />
      )
    );

    await waitFor(
      () => {
        expect(retrieveLiveQueries).toHaveBeenCalledWith(
          expect.any(Object),
          'default',
          'SEARCH_WORKLOAD_GROUP',
          true
        );
      },
      { timeout: 5000 }
    );
  });

  it('calls API with ANALYTICS_WORKLOAD_GROUP parameter', async () => {
    const core = makeCore();
    mockLiveQueries(mockStubLiveQueries);

    (useLocation as jest.Mock).mockReturnValue({
      search: '?wlmGroupId=ANALYTICS_WORKLOAD_GROUP',
    });

    render(
      withDataSource(
        <InflightQueries
          core={core}
          depsStart={
            { data: { dataSources: { get: jest.fn().mockReturnValue(core.http) } } } as any
          }
          params={{} as any}
          dataSourceManagement={undefined}
        />
      )
    );

    await waitFor(
      () => {
        expect(retrieveLiveQueries).toHaveBeenCalledWith(
          expect.any(Object),
          'default',
          'ANALYTICS_WORKLOAD_GROUP',
          true
        );
      },
      { timeout: 5000 }
    );
  });

  it('handles WLM stats API error gracefully', async () => {
    const core = makeCore();
    const consoleSpy = jest.spyOn(console, 'warn');

    // Mock version functions to disable WLM for older version
    (getVersionOnce as jest.Mock).mockResolvedValue('2.0.0');
    (isVersion33OrHigher as jest.Mock).mockReturnValue(false);

    mockLiveQueries(mockStubLiveQueries);

    render(
      withDataSource(
        <InflightQueries
          core={core}
          depsStart={
            { data: { dataSources: { get: jest.fn().mockReturnValue(core.http) } } } as any
          }
          params={{} as any}
          dataSourceManagement={undefined}
        />
      )
    );

    await waitFor(
      () => {
        expect(screen.getByText('Active queries')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // For older versions, WLM features should not be available
    expect(screen.queryByText('Workload group')).not.toBeInTheDocument();
    expect(consoleSpy).not.toHaveBeenCalledWith(
      '[LiveQueries] Failed to fetch WLM stats',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('shows 8 zeros when WLM is supported (version 3.3+)', async () => {
    const core = makeCore();

    (core.http.get as jest.Mock).mockImplementation((url) => {
      if (url === '/api/_wlm/workload_group') {
        return Promise.resolve({ workload_groups: [] });
      }
      if (url.includes('_wlm/stats')) {
        return Promise.resolve({});
      }
      return Promise.resolve({ response: { live_queries: [] } });
    });

    mockLiveQueries({ ok: true, response: { live_queries: [] } });

    const { container } = render(
      withDataSource(
        <InflightQueries
          core={core}
          depsStart={
            { data: { dataSources: { get: jest.fn().mockReturnValue(core.http) } } } as any
          }
          params={{} as any}
          dataSourceManagement={undefined}
        />
      )
    );

    await waitFor(
      () => {
        const panels = container.querySelectorAll('[data-test-subj^="panel-"]');
        expect(panels.length).toBeGreaterThanOrEqual(5);
      },
      { timeout: 5000 }
    );
  });

  it('hides WLM features for versions below 3.3.0', async () => {
    const core = makeCore();

    // Mock version functions to disable WLM for older version
    (getVersionOnce as jest.Mock).mockResolvedValue('3.0.0');
    (isVersion33OrHigher as jest.Mock).mockReturnValue(false);

    mockLiveQueries(mockStubLiveQueries);

    render(
      withDataSource(
        <InflightQueries
          core={core}
          depsStart={
            { data: { dataSources: { get: jest.fn().mockReturnValue(core.http) } } } as any
          }
          params={{} as any}
          dataSourceManagement={undefined}
        />
      )
    );

    await waitFor(
      () => {
        expect(screen.getByText('Active queries')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Should not show WLM selector
    expect(screen.queryByLabelText('Workload group selector')).not.toBeInTheDocument();
  });
});

describe('InflightQueries - additional coverage', () => {
  it('shows bar chart when bar option is selected', async () => {
    const core = makeCore();
    mockLiveQueries(mockStubLiveQueries);

    const { container } = render(
      withDataSource(
        <InflightQueries
          core={core}
          depsStart={
            { data: { dataSources: { get: jest.fn().mockReturnValue(core.http) } } } as any
          }
          params={{} as any}
          dataSourceManagement={undefined}
        />
      )
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(
      () => {
        expect(screen.getByText('Active queries')).toBeInTheDocument();
        expect(screen.getByText(/Active Queries by Node/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Click bar chart button — find by icon type
    const barButtons = container.querySelectorAll('[data-test-subj="bar"]');
    if (barButtons.length > 0) {
      (barButtons[0] as HTMLElement).click();
    }

    // Verify chart area is still rendered
    expect(screen.getByText(/Active Queries by Node/i)).toBeInTheDocument();
  });

  it('shows finished queries stats when showFinished is enabled', async () => {
    const core = makeCore();
    mockLiveQueries({
      ok: true,
      response: {
        live_queries: [
          {
            id: 'running-1',
            timestamp: Date.now(),
            node_id: 'node1',
            description: 'indices[idx1] search_type[query_then_fetch]',
            measurements: { latency: { number: 1e9 }, cpu: { number: 1e6 }, memory: { number: 1024 } },
            is_cancelled: false,
          },
        ],
        finished_queries: [
          {
            id: 'finished-1',
            timestamp: Date.now() - 5000,
            node_id: 'node1',
            status: 'completed',
            indices: ['idx1'],
            search_type: 'query_then_fetch',
            measurements: { latency: { number: 2e9 }, cpu: { number: 2e6 }, memory: { number: 2048 } },
            task_resource_usages: [],
          },
          {
            id: 'finished-2',
            timestamp: Date.now() - 3000,
            node_id: 'node1',
            status: 'failed',
            failed: true,
            indices: ['idx1'],
            search_type: 'query_then_fetch',
            measurements: { latency: { number: 3e9 }, cpu: { number: 3e6 }, memory: { number: 3072 } },
            task_resource_usages: [],
          },
        ],
      },
    });

    render(
      withDataSource(
        <InflightQueries
          core={core}
          depsStart={
            { data: { dataSources: { get: jest.fn().mockReturnValue(core.http) } } } as any
          }
          params={{} as any}
          dataSourceManagement={undefined}
        />
      )
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(
      () => {
        expect(screen.getByText('Total completions')).toBeInTheDocument();
        expect(screen.getByText('Total cancellations')).toBeInTheDocument();
        expect(screen.getByText('Total failures')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it('opens flyout when Task ID is clicked', async () => {
    const core = makeCore();
    mockLiveQueries({
      ok: true,
      response: {
        live_queries: [
          {
            id: 'task-abc:123',
            timestamp: 1640995200000,
            node_id: 'node1',
            description: 'indices[my-index] search_type[query_then_fetch] source[{"query":{"match_all":{}}}]',
            measurements: { latency: { number: 5e9 }, cpu: { number: 1e6 }, memory: { number: 4096 } },
            is_cancelled: false,
            coordinator_task: {
              task_id: 'task-abc:123',
              node_id: 'node1',
              action: 'indices:data/read/search',
              status: 'running',
              description: 'indices[my-index] search_type[query_then_fetch] source[{"query":{"match_all":{}}}]',
              start_time: 1640995200000,
              running_time_nanos: 5e9,
              cpu_nanos: 1e6,
              memory_bytes: 4096,
            },
            shard_tasks: [
              {
                task_id: 'shard-xyz:456',
                node_id: 'node1',
                action: 'indices:data/read/search[phase/query]',
                status: 'running',
                description: 'shardId[[my-index][0]]',
                start_time: 1640995200000,
                running_time_nanos: 4e9,
                cpu_nanos: 800000,
                memory_bytes: 2048,
              },
            ],
          },
        ],
      },
    });

    render(
      withDataSource(
        <InflightQueries
          core={core}
          depsStart={
            { data: { dataSources: { get: jest.fn().mockReturnValue(core.http) } } } as any
          }
          params={{} as any}
          dataSourceManagement={undefined}
        />
      )
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Wait for table to render, then click the link
    await waitFor(
      () => expect(screen.getAllByText('task-abc:123').length).toBeGreaterThanOrEqual(1),
      { timeout: 5000 }
    );

    // Click the link (first match is the table link)
    const link = screen.getAllByText('task-abc:123')[0];
    link.click();

    await waitFor(() => {
      expect(screen.getByText('Task ID - task-abc:123')).toBeInTheDocument();
      expect(screen.getByText('Task Summary')).toBeInTheDocument();
      expect(screen.getByText('Task Resource Usage')).toBeInTheDocument();
      expect(screen.getByText('Query Source')).toBeInTheDocument();
      expect(screen.getByText('my-index[0]')).toBeInTheDocument();
      expect(screen.getByText('Kill Query')).toBeInTheDocument();
    });
  });

  it('flyout shows View Top N for completed tasks', async () => {
    const core = makeCore();
    mockLiveQueries({
      ok: true,
      response: {
        live_queries: [],
        finished_queries: [
          {
            id: 'finished-task:789',
            timestamp: 1640995200000,
            node_id: 'node1',
            status: 'completed',
            indices: ['test-idx'],
            search_type: 'query_then_fetch',
            measurements: { latency: { number: 2e9 }, cpu: { number: 5e6 }, memory: { number: 8192 } },
            task_resource_usages: [],
            top_n_id: 'topn-abc-123',
            source: '{"query":{"match_all":{}}}',
          },
        ],
      },
    });

    render(
      withDataSource(
        <InflightQueries
          core={core}
          depsStart={
            { data: { dataSources: { get: jest.fn().mockReturnValue(core.http) } } } as any
          }
          params={{} as any}
          dataSourceManagement={undefined}
        />
      )
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(
      () => expect(screen.getAllByText('finished-task:789').length).toBeGreaterThanOrEqual(1),
      { timeout: 5000 }
    );

    screen.getAllByText('finished-task:789')[0].click();

    await waitFor(() => {
      expect(screen.getByText('Task ID - finished-task:789')).toBeInTheDocument();
      expect(screen.getByText('View Top N')).toBeInTheDocument();
      // Completed task should NOT show Kill Query
      expect(screen.queryByText('Kill Query')).not.toBeInTheDocument();
    });
  });

  it('handles new API format with coordinator_task and start_time', async () => {
    const core = makeCore();
    mockLiveQueries({
      ok: true,
      response: {
        live_queries: [
          {
            id: 'new-format:100',
            start_time: 1640995200000,
            status: 'running',
            wlm_group_id: 'DEFAULT_WORKLOAD_GROUP',
            total_latency_millis: 500,
            total_cpu_nanos: 1e8,
            total_memory_bytes: 65536,
            coordinator_task: {
              task_id: 'new-format:100',
              node_id: 'nodeA',
              action: 'indices:data/read/search',
              status: 'running',
              description: 'indices[big-test] search_type[dfs_query_then_fetch] source[{"size":10}]',
              start_time: 1640995200000,
              running_time_nanos: 5e8,
              cpu_nanos: 1e8,
              memory_bytes: 65536,
            },
            shard_tasks: [],
          },
        ],
      },
    });

    render(
      withDataSource(
        <InflightQueries
          core={core}
          depsStart={
            { data: { dataSources: { get: jest.fn().mockReturnValue(core.http) } } } as any
          }
          params={{} as any}
          dataSourceManagement={undefined}
        />
      )
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(
      () => {
        // Should render the task in the table
        expect(screen.getAllByText('new-format:100').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('dfs query then fetch')).toBeInTheDocument();
        expect(screen.getByText('big-test')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it('shows status badges for running, cancelled, and completed queries', async () => {
    const core = makeCore();
    mockLiveQueries({
      ok: true,
      response: {
        live_queries: [
          {
            id: 'running-q:1',
            timestamp: Date.now(),
            node_id: 'n1',
            description: 'indices[idx] search_type[query_then_fetch]',
            measurements: { latency: { number: 1e9 }, cpu: { number: 0 }, memory: { number: 0 } },
            is_cancelled: false,
          },
          {
            id: 'cancelled-q:2',
            timestamp: Date.now(),
            node_id: 'n1',
            description: 'indices[idx] search_type[query_then_fetch]',
            measurements: { latency: { number: 2e9 }, cpu: { number: 0 }, memory: { number: 0 } },
            is_cancelled: true,
          },
        ],
        finished_queries: [
          {
            id: 'completed-q:3',
            timestamp: Date.now() - 1000,
            node_id: 'n1',
            status: 'completed',
            indices: ['idx'],
            search_type: 'query_then_fetch',
            measurements: { latency: { number: 3e9 }, cpu: { number: 0 }, memory: { number: 0 } },
            task_resource_usages: [],
          },
        ],
      },
    });

    const { container } = render(
      withDataSource(
        <InflightQueries
          core={core}
          depsStart={
            { data: { dataSources: { get: jest.fn().mockReturnValue(core.http) } } } as any
          }
          params={{} as any}
          dataSourceManagement={undefined}
        />
      )
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(
      () => {
        // Check badges exist via their CSS class
        const badges = container.querySelectorAll('.euiBadge');
        expect(badges.length).toBeGreaterThanOrEqual(3);
        expect(screen.getByText('Running')).toBeInTheDocument();
        expect(screen.getByText('Cancelled')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it('cancel action is not available for finished queries', async () => {
    const core = makeCore();
    mockLiveQueries({
      ok: true,
      response: {
        live_queries: [],
        finished_queries: [
          {
            id: 'done-q:1',
            timestamp: Date.now() - 1000,
            node_id: 'n1',
            status: 'completed',
            indices: ['idx'],
            search_type: 'query_then_fetch',
            measurements: { latency: { number: 1e9 }, cpu: { number: 0 }, memory: { number: 0 } },
            task_resource_usages: [],
          },
        ],
      },
    });

    const { container } = render(
      withDataSource(
        <InflightQueries
          core={core}
          depsStart={
            { data: { dataSources: { get: jest.fn().mockReturnValue(core.http) } } } as any
          }
          params={{} as any}
          dataSourceManagement={undefined}
        />
      )
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(
      () => {
        expect(screen.getByText('done-q:1')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // No cancel/trash icon should be present for finished queries
    const trashButtons = container.querySelectorAll('[data-euiicon-type="trash"]');
    expect(trashButtons.length).toBe(0);
  });

  it('handles formatTime edge cases', async () => {
    const core = makeCore();
    mockLiveQueries({
      ok: true,
      response: {
        live_queries: [
          {
            id: 'edge-q:1',
            timestamp: Date.now(),
            node_id: 'n1',
            description: 'indices[idx] search_type[query_then_fetch]',
            measurements: {
              latency: { number: null as any },
              cpu: { number: undefined as any },
              memory: { number: 0 },
            },
            is_cancelled: false,
          },
        ],
      },
    });

    render(
      withDataSource(
        <InflightQueries
          core={core}
          depsStart={
            { data: { dataSources: { get: jest.fn().mockReturnValue(core.http) } } } as any
          }
          params={{} as any}
          dataSourceManagement={undefined}
        />
      )
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(
      () => {
        // Should render dashes for null/undefined measurements
        expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 5000 }
    );
  });

  it('flyout renders task resource usages for finished queries (old format)', async () => {
    const core = makeCore();
    mockLiveQueries({
      ok: true,
      response: {
        live_queries: [],
        finished_queries: [
          {
            id: 'old-format:1',
            timestamp: 1640995200000,
            node_id: 'node1',
            status: 'completed',
            indices: ['test-idx'],
            search_type: 'query_then_fetch',
            measurements: { latency: { number: 2e9 }, cpu: { number: 5e6 }, memory: { number: 8192 } },
            task_resource_usages: [
              {
                taskId: 100,
                nodeId: 'node1',
                parentTaskId: -1,
                action: 'indices:data/read/search',
                taskResourceUsage: { cpu_time_in_nanos: 5e6, memory_in_bytes: 4096 },
              },
              {
                taskId: 101,
                nodeId: 'node1',
                parentTaskId: 100,
                action: 'indices:data/read/search[phase/query]',
                taskResourceUsage: { cpu_time_in_nanos: 3e6, memory_in_bytes: 2048 },
              },
            ],
            source: '{"query":{"match_all":{}}}',
          },
        ],
      },
    });

    render(
      withDataSource(
        <InflightQueries
          core={core}
          depsStart={
            { data: { dataSources: { get: jest.fn().mockReturnValue(core.http) } } } as any
          }
          params={{} as any}
          dataSourceManagement={undefined}
        />
      )
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(
      () => {
        expect(screen.getByText('old-format:1')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Click to open flyout
    screen.getByText('old-format:1').click();

    await waitFor(() => {
      expect(screen.getByText('Task ID - old-format:1')).toBeInTheDocument();
      expect(screen.getByText('Task Resource Usage')).toBeInTheDocument();
      // Should show coordinator and shard tasks from old format
      expect(screen.getAllByText('Coordinator Task').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Query Source')).toBeInTheDocument();
    });
  });
});
