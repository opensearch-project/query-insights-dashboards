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
jest.mock('../../utils/version-utils', () => ({
  getVersionOnce: jest.fn(),
  isVersion33OrHigher: jest.fn(),
}));
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
  jest.clearAllMocks();
  cleanup();
  // Reset useLocation mock to default
  (useLocation as jest.Mock).mockReturnValue({ search: '' });
  // Mock version utilities - default to 3.3.0 for WLM support
  (getVersionOnce as jest.Mock).mockResolvedValue('3.3.0');
  (isVersion33OrHigher as jest.Mock).mockReturnValue(true);
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

    await waitFor(() => {
      expect(screen.getByText('Active queries')).toBeInTheDocument();
      expect(screen.getAllByText('0')).toHaveLength(5); // No WLM panels in older versions
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

    // Mock version functions to enable WLM
    (getVersionOnce as jest.Mock).mockResolvedValue('3.3.0');
    (isVersion33OrHigher as jest.Mock).mockReturnValue(true);

    // Mock WLM detection
    (core.http.get as jest.Mock).mockImplementation((url) => {
      if (url === '/api/_wlm/workload_group') {
        return Promise.resolve({ workload_groups: [] });
      }
      return Promise.resolve({});
    });

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

    // Wait for WLM components to render
    await waitFor(
      () => {
        expect(screen.getByText('Workload group')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
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

  it('displays ANALYTICS_WORKLOAD_GROUP and SEARCH_WORKLOAD_GROUP in rows', async () => {
    const core = makeCore();

    // Mock version functions to enable WLM
    (getVersionOnce as jest.Mock).mockResolvedValue('3.3.0');
    (isVersion33OrHigher as jest.Mock).mockReturnValue(true);

    (core.http.get as jest.Mock).mockImplementation((url) => {
      if (url === '/api/_wlm/workload_group') {
        return Promise.resolve({ workload_groups: [] });
      }
      return Promise.resolve({ response: { live_queries: [] } });
    });

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

    await waitFor(() => {
      expect(screen.getByText('Active queries')).toBeInTheDocument();
    });

    await waitFor(
      () => {
        expect(screen.getAllByText('ANALYTICS_WORKLOAD_GROUP').length).toBeGreaterThan(0);
        expect(screen.getAllByText('SEARCH_WORKLOAD_GROUP').length).toBeGreaterThan(0);
      },
      { timeout: 10000 }
    );
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

    await waitFor(() => {
      expect(retrieveLiveQueries).toHaveBeenCalledWith(
        expect.any(Object),
        'default',
        'SEARCH_WORKLOAD_GROUP'
      );
    });
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

    await waitFor(() => {
      expect(retrieveLiveQueries).toHaveBeenCalledWith(
        expect.any(Object),
        'default',
        'ANALYTICS_WORKLOAD_GROUP'
      );
    });
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

    await waitFor(() => {
      expect(screen.getByText('Active queries')).toBeInTheDocument();
    });

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

    // Mock version functions to enable WLM
    (getVersionOnce as jest.Mock).mockResolvedValue('3.3.0');
    (isVersion33OrHigher as jest.Mock).mockReturnValue(true);

    (core.http.get as jest.Mock).mockImplementation((url) => {
      if (url === '/api/_wlm/workload_group') {
        return Promise.resolve({ workload_groups: [] });
      }
      return Promise.resolve({ response: { live_queries: [] } });
    });

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
    });

    await waitFor(
      () => {
        expect(screen.getAllByText('0')).toHaveLength(8); // 5 base + 3 WLM panels
      },
      { timeout: 10000 }
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

    await waitFor(() => {
      expect(screen.getByText('Active queries')).toBeInTheDocument();
    });

    // Should not show WLM selector or panels
    expect(screen.queryByLabelText('Workload group selector')).not.toBeInTheDocument();
    expect(screen.queryByText('Total completions')).not.toBeInTheDocument();
  });
});
