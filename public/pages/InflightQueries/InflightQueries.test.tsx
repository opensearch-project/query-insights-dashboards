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
  jest.clearAllMocks();
  cleanup();
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

    await waitFor(() => {
      expect(screen.getByText('Active queries')).toBeInTheDocument();
    });

    // Neutralize timezone-dependent timestamps before snapshot
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
    mockLiveQueries({ ok: true, response: { live_queries: [] } });

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
      expect(screen.getByText('Active queries')).toBeInTheDocument();
      expect(screen.getAllByText('0')).toHaveLength(8);
    });
  });

  it('updates data periodically', async () => {
    jest.useFakeTimers();
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

    // Keep expectations aligned with your formatter (µs for 500ns, ms for 1_000_000ns)
    await waitFor(() => {
      expect(screen.getAllByText('0.50 µs').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('1.00 ms').length).toBeGreaterThanOrEqual(1);
    });
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

    expect(await screen.findByLabelText('Workload group selector')).toBeInTheDocument();
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

    expect(await screen.findByRole('switch')).toBeInTheDocument();
  });
});
