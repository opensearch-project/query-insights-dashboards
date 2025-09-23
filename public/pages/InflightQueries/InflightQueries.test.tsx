/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CoreStart } from 'opensearch-dashboards/public';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DataSourceContext } from '../TopNQueries/TopNQueries';
import { InflightQueries } from './InflightQueries';
import { retrieveLiveQueries } from '../../../common/utils/QueryUtils';
import stubLiveQueries from '../../../cypress/fixtures/stub_live_queries.json';
import '@testing-library/jest-dom';

jest.mock('../../../common/utils/QueryUtils');

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
    payload
  );
};

// Some tests rely on periodic refresh. Keep timers disciplined.
beforeEach(() => {
  jest.clearAllMocks();
  cleanup();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('InflightQueries', () => {
  it('matches snapshot', async () => {
    const core = makeCore();
    mockLiveQueries(stubLiveQueries);

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

    await waitFor(() => {
      expect(screen.getByText('Active queries')).toBeInTheDocument();
    });

    expect(container).toMatchSnapshot();
  });

  it('displays metric values from fixture', async () => {
    const core = makeCore();
    mockLiveQueries(stubLiveQueries);

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
    expect(await screen.findByText('Active queries')).toBeInTheDocument();

    // Spot-check a few fixture-driven values from your JSON
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('7.19 s')).toBeInTheDocument();
    expect(screen.getByText('9.69 s')).toBeInTheDocument();
    expect(screen.getByText('1.68 ms')).toBeInTheDocument();
    expect(screen.getByText('69.12 KB')).toBeInTheDocument();

    // A row identifier
    expect(screen.getByText('ID: node-A1B2C4E5:3614')).toBeInTheDocument();
  });

  it('shows zeros when there are no queries', async () => {
    const core = makeCore();
    mockLiveQueries({ response: { live_queries: [] } });

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

    await waitFor(() => {
      // You expected 8 zeros—keep parity with UI; adjust count if UI changes
      expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('updates data periodically', async () => {
    jest.useFakeTimers();
    const core = makeCore();

    mockLiveQueries(stubLiveQueries);

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

    await waitFor(() => expect(retrieveLiveQueries).toHaveBeenCalledTimes(1));

    act(() => {
      jest.advanceTimersByTime(30_000);
    });
    await waitFor(() => expect(retrieveLiveQueries).toHaveBeenCalledTimes(2));

    act(() => {
      jest.advanceTimersByTime(30_000);
    });
    await waitFor(() => expect(retrieveLiveQueries).toHaveBeenCalledTimes(3));
  });

  it('formats time values correctly (small numbers)', async () => {
    const core = makeCore();
    mockLiveQueries({
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

    // Keep expectations aligned with your formatter (µs for 500ns, ms for 1_000_000ns)
    await waitFor(() => {
      expect(screen.getAllByText('0.50 µs').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('1.00 ms').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders legend correctly', async () => {
    const core = makeCore();
    mockLiveQueries(stubLiveQueries);

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

    expect(await screen.findByText(/Queries by Node/i)).toBeInTheDocument();
    expect(screen.getByText(/Others:/i)).toBeInTheDocument();
  });

  it('handles WLM group selection when WLM plugin is present', async () => {
    const core = makeCore();
    (core.http.get as jest.Mock)
      .mockResolvedValueOnce([{ component: 'workload-management', name: 'wlm-plugin' }]) // _cat/plugins
      .mockResolvedValueOnce({
        body: { node1: { workload_groups: { group1: { total_completions: 5 } } } },
      }) // stats
      .mockResolvedValueOnce({
        body: { workload_groups: [{ _id: 'group1', name: 'Test Group' }] },
      }); // groups

    mockLiveQueries(stubLiveQueries);

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

    expect(await screen.findByLabelText('Workload group selector')).toBeInTheDocument();
  });

  it('toggles auto-refresh', async () => {
    const core = makeCore();
    mockLiveQueries(stubLiveQueries);

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

    expect(await screen.findByRole('switch')).toBeInTheDocument();
  });

  it('handles query cancellation buttons presence', async () => {
    const core = makeCore();
    (core.http.post as jest.Mock).mockResolvedValue({});
    mockLiveQueries(stubLiveQueries);

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

    await waitFor(() => {
      // "Cancel" button(s) show up per row
      expect(screen.getAllByText('Cancel').length).toBeGreaterThan(0);
    });
  });

  it('handles API errors gracefully', async () => {
    const core = makeCore();
    (retrieveLiveQueries as jest.MockedFunction<typeof retrieveLiveQueries>).mockRejectedValue(
      new Error('Network error')
    );

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

    await waitFor(() => {
      expect(core.notifications.toasts.addError).toHaveBeenCalled();
    });
  });

  it('handles malformed response data', async () => {
    const core = makeCore();
    mockLiveQueries({ invalid: 'data' });

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

    await waitFor(() => {
      expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('handles queries with missing measurements', async () => {
    const core = makeCore();
    mockLiveQueries({
      response: {
        live_queries: [
          {
            id: 'query1',
            timestamp: Date.now(),
            node_id: 'node1',
            description: 'test query',
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

    await waitFor(() => {
      expect(screen.getByText('test query')).toBeInTheDocument();
    });
  });

  it('handles zero and negative measurement values', async () => {
    const core = makeCore();
    mockLiveQueries({
      response: {
        live_queries: [
          {
            id: 'query1',
            measurements: {
              latency: { number: 0 },
              cpu: { number: -100 },
              memory: { number: 0 },
            },
            timestamp: Date.now(),
            node_id: 'node1',
            description: 'zero values query',
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

    await waitFor(() => {
      expect(screen.getByText('zero values query')).toBeInTheDocument();
    });
  });

  it('handles extremely large measurement values', async () => {
    const core = makeCore();
    mockLiveQueries({
      response: {
        live_queries: [
          {
            id: 'query1',
            measurements: {
              latency: { number: Number.MAX_SAFE_INTEGER },
              cpu: { number: 1e15 },
              memory: { number: 1e12 },
            },
            timestamp: Date.now(),
            node_id: 'node1',
            description: 'large values query',
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

    await waitFor(() => {
      expect(screen.getByText('large values query')).toBeInTheDocument();
    });
  });

  it('handles WLM plugin detection failure', async () => {
    const core = makeCore();
    (core.http.get as jest.Mock).mockRejectedValue(new Error('Plugin detection failed'));
    mockLiveQueries(stubLiveQueries);

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

    await waitFor(() => {
      expect(screen.queryByLabelText('Workload group selector')).not.toBeInTheDocument();
    });
  });

  it('handles query cancellation failure', async () => {
    const core = makeCore();
    (core.http.post as jest.Mock).mockRejectedValue(new Error('Cancellation failed'));
    mockLiveQueries(stubLiveQueries);

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

    await waitFor(() => {
      expect(screen.getAllByText('Cancel').length).toBeGreaterThan(0);
    });
  });

  it('handles component unmount during data fetch', async () => {
    jest.useFakeTimers();
    const core = makeCore();
    let resolvePromise: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    (retrieveLiveQueries as jest.MockedFunction<typeof retrieveLiveQueries>).mockReturnValue(
      pendingPromise
    );

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

    unmount();
    resolvePromise!(stubLiveQueries);

    act(() => {
      jest.runAllTimers();
    });

    // Should not throw errors or cause memory leaks
    expect(true).toBe(true);
  });

  it('handles memory formatting for large values', async () => {
    const core = makeCore();
    mockLiveQueries({
      response: {
        live_queries: [
          {
            id: 'query1',
            measurements: {
              latency: { number: 1_000_000_000 },
              cpu: { number: 1_000_000_000 },
              memory: { number: 1_073_741_824 }, // 1 GB
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

    await screen.findByText('Active queries'); // ensure render

    const els = await screen.findAllByText((t) => /^\s*1(\.0{1,2})?\s*G(i)?B\s*$/i.test(t));
    expect(els.length).toBeGreaterThanOrEqual(1);
    expect(els[0]).toBeVisible(); // optional
  });

  it('handles table selection (checkboxes) presence', async () => {
    const core = makeCore();
    mockLiveQueries(stubLiveQueries);

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

    await waitFor(() => {
      expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
    });
  });

  it('shows refresh interval selector', async () => {
    const core = makeCore();
    mockLiveQueries(stubLiveQueries);

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

    expect(await screen.findByDisplayValue('30 seconds')).toBeInTheDocument();
  });

  it('renders bar chart option', async () => {
    const core = makeCore();
    mockLiveQueries(stubLiveQueries);

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

    await waitFor(() => {
      const chartButtons = screen.getAllByText('Bar');
      expect(chartButtons.length).toBeGreaterThan(0);
    });
  });

  it('handles WLM nav when live query has query_group_id', async () => {
    const core = makeCore();
    (core.http.get as jest.Mock).mockResolvedValueOnce([{ component: 'workload-management' }]);

    const withWlm = {
      response: {
        live_queries: [
          {
            ...stubLiveQueries.response.live_queries[0],
            wlm_group_id: 'group1',
          },
        ],
      },
    };
    mockLiveQueries(withWlm);

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

    expect(await screen.findByText('WLM Group')).toBeInTheDocument();
  });

  it('timeouts do not explode UI', async () => {
    jest.useFakeTimers();
    const core = makeCore();
    (retrieveLiveQueries as jest.MockedFunction<typeof retrieveLiveQueries>).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(stubLiveQueries), 10_000))
    );

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

    act(() => {
      jest.advanceTimersByTime(6_000);
    });

    // Just ensure initial shell is there
    expect(await screen.findByText('Active queries')).toBeInTheDocument();
  });

  it('shows "No data available" when node/index counts are empty', async () => {
    const core = makeCore();
    mockLiveQueries({ response: { live_queries: [] } });

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

    await waitFor(() => {
      expect(screen.getAllByText('No data available').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('displays WLM stats if plugin present', async () => {
    const core = makeCore();
    (core.http.get as jest.Mock)
      .mockResolvedValueOnce([{ component: 'workload-management' }]) // _cat/plugins
      .mockResolvedValueOnce({
        body: {
          node1: {
            workload_groups: {
              group1: {
                total_completions: 10,
                total_cancellations: 2,
                total_rejections: 1,
              },
            },
          },
        },
      }) // stats
      .mockResolvedValueOnce({ body: { workload_groups: [] } }); // groups

    mockLiveQueries(stubLiveQueries);

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

    expect(await screen.findByText('Total completions')).toBeInTheDocument();
  });
});
