/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import TopNQueries, { QUERY_INSIGHTS, CONFIGURATION, LIVE_QUERIES } from './TopNQueries';
import { CoreStart, AppMountParameters } from 'opensearch-dashboards/public';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';
import { getVersionOnce } from '../../utils/version-utils';

interface MockQueryInsightsProps {
  accessDenied?: boolean;
  loading: boolean;
  queries: Array<{ id?: string }>;
  retrieveQueries: (start: string, end: string) => Promise<void>;
  onDataSourceChange: () => Promise<void> | void;
  onTimeChange: ({ start, end }: { start: string; end: string }) => void;
}

let mockQueryInsightsProps: MockQueryInsightsProps | undefined;

interface MockConfigurationProps {
  configurationLoadState: 'loading' | 'ready' | 'accessDenied' | 'error';
  configInfo: (...args: any[]) => Promise<any>;
  onDataSourceChange: () => Promise<void> | void;
  latencySettings: {
    currTopN: string;
  };
}

let mockConfigurationProps: MockConfigurationProps | undefined;

interface MockInflightQueriesProps {
  onDataSourceChange?: () => Promise<void> | void;
}

let mockInflightQueriesProps: MockInflightQueriesProps | undefined;

jest.mock('../QueryInsights/QueryInsights', () => (props: MockQueryInsightsProps) => {
  mockQueryInsightsProps = props;
  return (
    <div>
      Mocked QueryInsights
      {props.accessDenied && <span>Mocked access denied</span>}
    </div>
  );
});
jest.mock('../Configuration/Configuration', () => (props: MockConfigurationProps) => {
  mockConfigurationProps = props;
  return (
    <div>
      Mocked Configuration
      {props.configurationLoadState === 'accessDenied' && (
        <span>Mocked settings access denied</span>
      )}
    </div>
  );
});
jest.mock('../InflightQueries/InflightQueries', () => ({
  InflightQueries: (props: MockInflightQueriesProps) => {
    mockInflightQueriesProps = props;
    return <div>Mocked InflightQueries</div>;
  },
}));
jest.mock('../QueryDetails/QueryDetails', () => () => <div>Mocked QueryDetails</div>);
jest.mock('../../utils/version-utils');

const mockCore = {
  http: {
    get: jest.fn(),
    put: jest.fn(),
  },
  uiSettings: {
    get: jest.fn().mockReturnValue(false),
  },
  notifications: {
    toasts: {
      addDanger: jest.fn(),
      addSuccess: jest.fn(),
      addWarning: jest.fn(),
      addError: jest.fn(),
    },
  },
} as unknown as CoreStart;

const setUpDefaultEnabledSettings = () => {
  const mockLatencyResponse = { response: { top_queries: [{ id: '1' }, { id: '2' }] } };
  const mockCpuResponse = { response: { top_queries: [{ id: '2' }, { id: '3' }] } };
  const mockMemoryResponse = { response: { top_queries: [{ id: '1' }] } };
  // Mock API responses for each metric
  (mockCore.http.get as jest.Mock).mockImplementation((endpoint) => {
    if (endpoint === '/api/top_queries/latency') return Promise.resolve(mockLatencyResponse);
    if (endpoint === '/api/top_queries/cpu') return Promise.resolve(mockCpuResponse);
    if (endpoint === '/api/top_queries/memory') return Promise.resolve(mockMemoryResponse);
    return Promise.resolve({ response: { top_queries: [] } });
  });
  // Mock API response for all metrics enabled
  const mockSettingsResponse = {
    response: {
      persistent: {
        search: {
          insights: {
            top_queries: {
              latency: { enabled: 'true', top_n_size: '10', window_size: '1h' },
              cpu: { enabled: 'true', top_n_size: '10', window_size: '1h' },
              memory: { enabled: 'true', top_n_size: '5', window_size: '30m' },
            },
          },
        },
      },
    },
  };
  (mockCore.http.get as jest.Mock).mockResolvedValueOnce(mockSettingsResponse);
};

const mockDepsStart = {} as QueryInsightsDashboardsPluginStartDependencies;
const mockParams = {} as AppMountParameters;

const createDeferred = <T,>() => {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
};

const renderTopNQueries = (type: string) =>
  render(
    <MemoryRouter initialEntries={[type]}>
      <TopNQueries core={mockCore} depsStart={mockDepsStart} params={mockParams} />
    </MemoryRouter>
  );

describe('TopNQueries Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState({}, '', '/');
    mockQueryInsightsProps = undefined;
    mockConfigurationProps = undefined;
    mockInflightQueriesProps = undefined;
    (getVersionOnce as jest.Mock).mockResolvedValue('3.1.0');
  });

  it('renders and switches tabs correctly', () => {
    const container = renderTopNQueries(QUERY_INSIGHTS);

    // Check for Query Insights tab content
    expect(screen.getByText('Mocked QueryInsights')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Live queries' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Top N queries' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Configuration' })).toBeInTheDocument();
    expect(container).toMatchSnapshot();

    // Switch to Configuration tab
    fireEvent.click(screen.getByText('Configuration'));
    expect(screen.getByText('Mocked Configuration')).toBeInTheDocument();
  });

  it('updates settings in retrieveConfigInfo based on API response', async () => {
    const mockSettingsResponse = {
      response: {
        persistent: {
          search: {
            insights: {
              top_queries: {
                latency: { enabled: 'true', top_n_size: '10', window_size: '1h' },
                cpu: { enabled: 'false' },
                memory: { enabled: 'true', top_n_size: '5', window_size: '30m' },
              },
            },
          },
        },
      },
    };
    (mockCore.http.get as jest.Mock).mockResolvedValueOnce(mockSettingsResponse);
    const container = renderTopNQueries(CONFIGURATION);
    await waitFor(() => {
      expect(mockCore.http.get).toHaveBeenCalledWith('/api/settings', {
        query: { dataSourceId: undefined },
      });
      expect(screen.getByText('Mocked Configuration')).toBeInTheDocument();
      expect(container).toMatchSnapshot();
    });
  });

  it('marks Configuration access denied when the settings request returns 403', async () => {
    const forbiddenError = {
      statusCode: 403,
      body: {
        message: '[security_exception] no permissions for cluster settings',
      },
    };
    (mockCore.http.get as jest.Mock).mockImplementation((endpoint) => {
      if (endpoint === '/api/settings') {
        return Promise.reject(forbiddenError);
      }
      return Promise.resolve({ response: { top_queries: [] } });
    });

    renderTopNQueries(CONFIGURATION);

    await waitFor(() => {
      expect(screen.getByText('Mocked settings access denied')).toBeInTheDocument();
    });
    expect(mockConfigurationProps?.configurationLoadState).toBe('accessDenied');
  });

  it('does not update configuration state until the settings PUT succeeds', async () => {
    const settingsResponse = {
      response: {
        persistent: {
          search: {
            insights: {
              top_queries: {
                latency: { enabled: 'true', top_n_size: '10', window_size: '1h' },
                cpu: { enabled: 'false' },
                memory: { enabled: 'false' },
              },
            },
          },
        },
      },
    };
    const updateRequest = createDeferred<{ ok: boolean }>();
    (mockCore.http.get as jest.Mock).mockImplementation((endpoint) =>
      Promise.resolve(
        endpoint === '/api/settings' ? settingsResponse : { response: { top_queries: [] } }
      )
    );
    (mockCore.http.put as jest.Mock).mockReturnValue(updateRequest.promise);

    renderTopNQueries(CONFIGURATION);
    await waitFor(() => expect(mockConfigurationProps?.configurationLoadState).toBe('ready'));
    expect(mockConfigurationProps?.latencySettings.currTopN).toBe('10');

    let savePromise: Promise<void>;
    await act(async () => {
      savePromise = mockConfigurationProps!.configInfo(
        false,
        true,
        'latency',
        '7',
        '10',
        'MINUTES',
        'local_index',
        'SIMILARITY',
        '179',
        false,
        '',
        'query-insights'
      );
      await Promise.resolve();
    });

    expect(mockConfigurationProps?.latencySettings.currTopN).toBe('10');

    await act(async () => {
      updateRequest.resolve({ ok: true });
      await savePromise!;
    });

    await waitFor(() => expect(mockConfigurationProps?.latencySettings.currTopN).toBe('7'));
  });

  it('does not apply a completed settings update to a newly selected data source', async () => {
    const settingsResponse = (topNSize: string) => ({
      response: {
        persistent: {
          search: {
            insights: {
              top_queries: {
                latency: { enabled: 'true', top_n_size: topNSize, window_size: '1h' },
                cpu: { enabled: 'false' },
                memory: { enabled: 'false' },
              },
            },
          },
        },
      },
    });
    const updateRequest = createDeferred<{ ok: boolean }>();
    (mockCore.http.get as jest.Mock).mockImplementation((endpoint, options) => {
      if (endpoint === '/api/settings') {
        return Promise.resolve(
          settingsResponse(options.query.dataSourceId === 'source-b' ? '20' : '10')
        );
      }
      return Promise.resolve({ response: { top_queries: [] } });
    });
    (mockCore.http.put as jest.Mock).mockReturnValue(updateRequest.promise);
    window.history.replaceState(
      {},
      '',
      `/?dataSource=${encodeURIComponent(JSON.stringify({ id: 'source-a', label: 'Source A' }))}`
    );

    renderTopNQueries(CONFIGURATION);
    await waitFor(() => expect(mockConfigurationProps?.latencySettings.currTopN).toBe('10'));

    let savePromise: Promise<void>;
    await act(async () => {
      savePromise = mockConfigurationProps!.configInfo(
        false,
        true,
        'latency',
        '7',
        '10',
        'MINUTES'
      );
      await Promise.resolve();
    });

    window.history.replaceState(
      {},
      '',
      `/?dataSource=${encodeURIComponent(JSON.stringify({ id: 'source-b', label: 'Source B' }))}`
    );
    await act(async () => {
      await mockConfigurationProps!.configInfo(true);
    });
    await waitFor(() => expect(mockConfigurationProps?.latencySettings.currTopN).toBe('20'));

    await act(async () => {
      updateRequest.resolve({ ok: true });
      await savePromise!;
    });

    expect(mockConfigurationProps?.latencySettings.currTopN).toBe('20');
  });

  it('reloads settings for the selected data source', async () => {
    const mockSettingsResponse = {
      response: {
        persistent: {
          search: {
            insights: {
              top_queries: {
                latency: { enabled: 'true', top_n_size: '10', window_size: '1h' },
                cpu: { enabled: 'true', top_n_size: '10', window_size: '1h' },
                memory: { enabled: 'true', top_n_size: '10', window_size: '1h' },
              },
            },
          },
        },
      },
    };
    (mockCore.http.get as jest.Mock).mockImplementation((endpoint) =>
      Promise.resolve(
        endpoint === '/api/settings' ? mockSettingsResponse : { response: { top_queries: [] } }
      )
    );

    renderTopNQueries(QUERY_INSIGHTS);
    expect(mockQueryInsightsProps).toBeDefined();

    const dataSource = { id: 'next-source', label: 'Next source' };
    window.history.replaceState(
      {},
      '',
      `/?dataSource=${encodeURIComponent(JSON.stringify(dataSource))}`
    );

    await act(async () => {
      await mockQueryInsightsProps!.onDataSourceChange();
    });

    expect(mockCore.http.get).toHaveBeenCalledWith('/api/settings', {
      query: { dataSourceId: 'next-source' },
    });
    expect(getVersionOnce).toHaveBeenCalledWith('next-source');
  });

  it('waits for the selected data source settings before fetching its enabled metrics', async () => {
    const settingsResponse = (enabledMetric: 'latency' | 'cpu') => ({
      response: {
        persistent: {
          search: {
            insights: {
              top_queries: {
                latency: { enabled: String(enabledMetric === 'latency'), window_size: '1h' },
                cpu: { enabled: String(enabledMetric === 'cpu'), window_size: '1h' },
                memory: { enabled: 'false' },
              },
            },
          },
        },
      },
    });
    const sourceBSettings = createDeferred<ReturnType<typeof settingsResponse>>();

    (mockCore.http.get as jest.Mock).mockImplementation((endpoint, options) => {
      if (endpoint === '/api/settings') {
        return options.query.dataSourceId === 'source-b'
          ? sourceBSettings.promise
          : Promise.resolve(settingsResponse('latency'));
      }
      return Promise.resolve({ response: { top_queries: [] } });
    });
    window.history.replaceState(
      {},
      '',
      `/?dataSource=${encodeURIComponent(JSON.stringify({ id: 'source-a', label: 'Source A' }))}`
    );

    renderTopNQueries(QUERY_INSIGHTS);
    await waitFor(() => {
      expect(mockCore.http.get).toHaveBeenCalledWith(
        '/api/top_queries/latency',
        expect.objectContaining({
          query: expect.objectContaining({ dataSourceId: 'source-a' }),
        })
      );
    });
    (mockCore.http.get as jest.Mock).mockClear();

    window.history.replaceState(
      {},
      '',
      `/?dataSource=${encodeURIComponent(JSON.stringify({ id: 'source-b', label: 'Source B' }))}`
    );
    let sourceChangePromise: Promise<void>;
    act(() => {
      sourceChangePromise = Promise.resolve(mockQueryInsightsProps!.onDataSourceChange());
    });

    await waitFor(() => {
      expect(mockCore.http.get).toHaveBeenCalledWith('/api/settings', {
        query: { dataSourceId: 'source-b' },
      });
    });
    expect(mockCore.http.get).not.toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/top_queries\//),
      expect.anything()
    );

    await act(async () => {
      sourceBSettings.resolve(settingsResponse('cpu'));
      await sourceChangePromise!;
    });

    expect(mockCore.http.get).toHaveBeenCalledWith(
      '/api/top_queries/cpu',
      expect.objectContaining({
        query: expect.objectContaining({ dataSourceId: 'source-b' }),
      })
    );
    expect(mockCore.http.get).not.toHaveBeenCalledWith(
      '/api/top_queries/latency',
      expect.anything()
    );
    expect(mockCore.http.get).not.toHaveBeenCalledWith(
      '/api/top_queries/memory',
      expect.anything()
    );
  });

  it('does not clear loading when a newer refresh supersedes a data source settings request', async () => {
    const settingsResponse = {
      response: {
        persistent: {
          search: {
            insights: {
              top_queries: {
                latency: { enabled: 'true', window_size: '1h' },
                cpu: { enabled: 'false' },
                memory: { enabled: 'false' },
              },
            },
          },
        },
      },
    };
    const sourceChangeSettings = createDeferred<typeof settingsResponse>();
    const pendingTopQueries = createDeferred<{ response: { top_queries: [] } }>();
    let sourceChangeStarted = false;
    let pendingTopQueryRequests = 0;

    (mockCore.http.get as jest.Mock).mockImplementation((endpoint) => {
      if (endpoint === '/api/settings') {
        if (sourceChangeStarted) {
          sourceChangeStarted = false;
          return sourceChangeSettings.promise;
        }
        return Promise.resolve(settingsResponse);
      }
      if (endpoint.startsWith('/api/top_queries/')) {
        if (window.location.search.includes('source-b')) {
          pendingTopQueryRequests += 1;
          return pendingTopQueries.promise;
        }
        return Promise.resolve({ response: { top_queries: [] } });
      }
      return Promise.resolve({ response: { top_queries: [] } });
    });

    renderTopNQueries(QUERY_INSIGHTS);
    await waitFor(() => expect(mockQueryInsightsProps?.loading).toBe(false));

    window.history.replaceState(
      {},
      '',
      `/?dataSource=${encodeURIComponent(JSON.stringify({ id: 'source-b', label: 'Source B' }))}`
    );
    sourceChangeStarted = true;
    let sourceChangePromise: Promise<void>;
    act(() => {
      sourceChangePromise = Promise.resolve(mockQueryInsightsProps!.onDataSourceChange());
    });
    await waitFor(() =>
      expect(mockCore.http.get).toHaveBeenCalledWith('/api/settings', {
        query: { dataSourceId: 'source-b' },
      })
    );

    act(() => {
      mockQueryInsightsProps!.onTimeChange({ start: 'now-2h', end: 'now' });
    });
    await waitFor(() => {
      expect(pendingTopQueryRequests).toBeGreaterThan(0);
      expect(mockQueryInsightsProps?.loading).toBe(true);
    });

    await act(async () => {
      sourceChangeSettings.resolve(settingsResponse);
      await sourceChangePromise!;
    });

    expect(mockQueryInsightsProps?.loading).toBe(true);

    await act(async () => {
      pendingTopQueries.resolve({ response: { top_queries: [] } });
      await pendingTopQueries.promise;
    });
    await waitFor(() => expect(mockQueryInsightsProps?.loading).toBe(false));
  });

  it('keeps fetching all metrics when selected source settings cannot be read', async () => {
    const sourceASettings = {
      response: {
        persistent: {
          search: {
            insights: {
              top_queries: {
                latency: { enabled: 'true', window_size: '1h' },
                cpu: { enabled: 'false' },
                memory: { enabled: 'false' },
              },
            },
          },
        },
      },
    };
    const forbiddenError = {
      statusCode: 403,
      body: { message: '[security_exception] no permissions for cluster settings' },
    };
    (mockCore.http.get as jest.Mock).mockImplementation((endpoint, options) => {
      if (endpoint === '/api/settings') {
        return options.query.dataSourceId === 'source-b'
          ? Promise.reject(forbiddenError)
          : Promise.resolve(sourceASettings);
      }
      return Promise.resolve({ response: { top_queries: [] } });
    });
    window.history.replaceState(
      {},
      '',
      `/?dataSource=${encodeURIComponent(JSON.stringify({ id: 'source-a', label: 'Source A' }))}`
    );

    renderTopNQueries(QUERY_INSIGHTS);
    await waitFor(() => {
      expect(mockCore.http.get).toHaveBeenCalledWith(
        '/api/top_queries/latency',
        expect.any(Object)
      );
    });
    (mockCore.http.get as jest.Mock).mockClear();

    window.history.replaceState(
      {},
      '',
      `/?dataSource=${encodeURIComponent(JSON.stringify({ id: 'source-b', label: 'Source B' }))}`
    );
    await act(async () => {
      await mockQueryInsightsProps!.onDataSourceChange();
    });

    for (const metric of ['latency', 'cpu', 'memory']) {
      expect(mockCore.http.get).toHaveBeenCalledWith(
        `/api/top_queries/${metric}`,
        expect.objectContaining({
          query: expect.objectContaining({ dataSourceId: 'source-b' }),
        })
      );
    }
    (mockCore.http.get as jest.Mock).mockClear();

    act(() => {
      mockQueryInsightsProps!.onTimeChange({ start: 'now-2h', end: 'now' });
    });

    await waitFor(() => {
      for (const metric of ['latency', 'cpu', 'memory']) {
        expect(mockCore.http.get).toHaveBeenCalledWith(
          `/api/top_queries/${metric}`,
          expect.objectContaining({
            query: expect.objectContaining({ dataSourceId: 'source-b' }),
          })
        );
      }
    });
  });

  it('reloads settings after a data source change from Live Queries', async () => {
    const mockSettingsResponse = {
      response: {
        persistent: {
          search: {
            insights: {
              top_queries: {
                latency: { enabled: 'true', top_n_size: '10', window_size: '1h' },
                cpu: { enabled: 'false' },
                memory: { enabled: 'false' },
              },
            },
          },
        },
      },
    };
    (mockCore.http.get as jest.Mock).mockImplementation((endpoint) =>
      Promise.resolve(
        endpoint === '/api/settings' ? mockSettingsResponse : { response: { top_queries: [] } }
      )
    );
    window.history.replaceState(
      {},
      '',
      `/?dataSource=${encodeURIComponent(JSON.stringify({ id: 'source-a', label: 'Source A' }))}`
    );

    renderTopNQueries(LIVE_QUERIES);
    await waitFor(() => expect(mockInflightQueriesProps?.onDataSourceChange).toBeDefined());

    window.history.replaceState(
      {},
      '',
      `/?dataSource=${encodeURIComponent(JSON.stringify({ id: 'source-b', label: 'Source B' }))}`
    );
    await act(async () => {
      await mockInflightQueriesProps!.onDataSourceChange!();
    });

    expect(mockCore.http.get).toHaveBeenCalledWith('/api/settings', {
      query: { dataSourceId: 'source-b' },
    });
  });

  it('uses the full parent refresh after a data source change from Configuration', async () => {
    const mockSettingsResponse = {
      response: {
        persistent: {
          search: {
            insights: {
              top_queries: {
                latency: { enabled: 'false' },
                cpu: { enabled: 'true', window_size: '1h' },
                memory: { enabled: 'false' },
              },
            },
          },
        },
      },
    };
    (mockCore.http.get as jest.Mock).mockImplementation((endpoint) =>
      Promise.resolve(
        endpoint === '/api/settings' ? mockSettingsResponse : { response: { top_queries: [] } }
      )
    );

    renderTopNQueries(CONFIGURATION);
    await waitFor(() => expect(mockConfigurationProps?.onDataSourceChange).toBeDefined());
    (mockCore.http.get as jest.Mock).mockClear();
    window.history.replaceState(
      {},
      '',
      `/?dataSource=${encodeURIComponent(JSON.stringify({ id: 'source-b', label: 'Source B' }))}`
    );

    await act(async () => {
      await mockConfigurationProps!.onDataSourceChange();
    });

    expect(mockCore.http.get).toHaveBeenCalledWith('/api/settings', {
      query: { dataSourceId: 'source-b' },
    });
    expect(mockCore.http.get).toHaveBeenCalledWith(
      '/api/top_queries/cpu',
      expect.objectContaining({
        query: expect.objectContaining({ dataSourceId: 'source-b' }),
      })
    );
  });

  it('fetches queries for all metrics in retrieveQueries', async () => {
    setUpDefaultEnabledSettings();
    const container = renderTopNQueries(QUERY_INSIGHTS);
    await waitFor(() => {
      // Verify each endpoint is called
      expect(mockCore.http.get).toHaveBeenCalledWith('/api/settings', expect.any(Object));
      expect(mockCore.http.get).toHaveBeenCalledWith(
        '/api/top_queries/latency',
        expect.any(Object)
      );
      expect(mockCore.http.get).toHaveBeenCalledWith('/api/top_queries/cpu', expect.any(Object));
      expect(mockCore.http.get).toHaveBeenCalledWith('/api/top_queries/memory', expect.any(Object));
      // Check that deduplicated queries would be displayed in QueryInsights
      expect(screen.getByText('Mocked QueryInsights')).toBeInTheDocument();

      expect(container).toMatchSnapshot();
    });
  });

  it('fetches queries for only enabled metrics in retrieveQueries', async () => {
    const mockResponse = { response: { top_queries: [{ id: '1' }, { id: '2' }] } };
    // Mock API responses for each metric
    (mockCore.http.get as jest.Mock).mockImplementation((endpoint) => {
      if (endpoint === '/api/top_queries/latency') return Promise.resolve(mockResponse);
      if (endpoint === '/api/top_queries/cpu') return Promise.resolve(mockResponse);
      if (endpoint === '/api/top_queries/memory') return Promise.resolve(mockResponse);
      return Promise.resolve({ response: { top_queries: [] } });
    });
    // Mock API response for only one metrics enabled
    const mockSettingsResponse = {
      response: {
        persistent: {
          search: {
            insights: {
              top_queries: {
                latency: { enabled: 'true', top_n_size: '10', window_size: '1h' },
                cpu: { enabled: 'false' },
                memory: { enabled: 'false' },
              },
            },
          },
        },
      },
    };
    (mockCore.http.get as jest.Mock).mockResolvedValueOnce(mockSettingsResponse);
    const container = renderTopNQueries(QUERY_INSIGHTS);
    await waitFor(() => {
      // Verify each endpoint is called
      expect(mockCore.http.get).toHaveBeenCalledWith('/api/settings', expect.any(Object));
      expect(mockCore.http.get).toHaveBeenCalledWith(
        '/api/top_queries/latency',
        expect.any(Object)
      );
      expect(mockCore.http.get).not.toHaveBeenCalledWith(
        '/api/top_queries/cpu',
        expect.any(Object)
      );
      expect(mockCore.http.get).not.toHaveBeenCalledWith(
        '/api/top_queries/memory',
        expect.any(Object)
      );
      // Check that deduplicated queries would be displayed in QueryInsights
      expect(screen.getByText('Mocked QueryInsights')).toBeInTheDocument();

      expect(container).toMatchSnapshot();
    });
  });

  it('updates time range and fetches data when time range changes', async () => {
    setUpDefaultEnabledSettings();
    (mockCore.http.get as jest.Mock).mockResolvedValueOnce({ response: { top_queries: [] } });
    // Render with initial time range
    const { rerender } = render(
      <MemoryRouter initialEntries={[QUERY_INSIGHTS]}>
        <TopNQueries
          core={mockCore}
          initialStart="now-1h"
          initialEnd="now"
          depsStart={mockDepsStart}
          params={mockParams}
        />
      </MemoryRouter>
    );
    // Mock a new response for the time range update
    (mockCore.http.get as jest.Mock).mockResolvedValueOnce({
      response: { top_queries: [{ id: 'newQuery' }] },
    });

    // Re-render with updated time range to simulate a change
    rerender(
      <MemoryRouter initialEntries={[QUERY_INSIGHTS]}>
        <TopNQueries
          core={mockCore}
          initialStart="now-7d"
          initialEnd="now"
          depsStart={mockDepsStart}
          params={mockParams}
        />
      </MemoryRouter>
    );
    // Verify that the component re-fetches data for the new time range
    await waitFor(() => {
      expect(mockCore.http.get).toHaveBeenCalledWith('/api/settings', expect.any(Object));
      expect(mockCore.http.get).toHaveBeenCalledWith(
        '/api/top_queries/latency',
        expect.any(Object)
      );
      expect(mockCore.http.get).toHaveBeenCalledWith('/api/top_queries/cpu', expect.any(Object));
      expect(mockCore.http.get).toHaveBeenCalledWith('/api/top_queries/memory', expect.any(Object));
    });
  });

  describe('Group by settings extraction', () => {
    it('should extract group_by from persistent settings', async () => {
      const mockSettingsResponse = {
        response: {
          persistent: {
            search: {
              insights: {
                top_queries: {
                  latency: { enabled: 'true', top_n_size: '10', window_size: '1h' },
                  grouping: { group_by: 'similarity' },
                },
              },
            },
          },
        },
      };
      (mockCore.http.get as jest.Mock).mockResolvedValueOnce(mockSettingsResponse);

      renderTopNQueries(CONFIGURATION);

      await waitFor(() => {
        expect(mockCore.http.get).toHaveBeenCalledWith('/api/settings', {
          query: { dataSourceId: undefined },
        });
      });
    });

    it('should extract group_by from transient settings when both exist', async () => {
      const mockSettingsResponse = {
        response: {
          persistent: {
            search: {
              insights: {
                top_queries: {
                  latency: { enabled: 'true', top_n_size: '10', window_size: '1h' },
                  grouping: { group_by: 'similarity' },
                },
              },
            },
          },
          transient: {
            search: {
              insights: {
                top_queries: {
                  grouping: { group_by: 'none' },
                },
              },
            },
          },
        },
      };
      (mockCore.http.get as jest.Mock).mockResolvedValueOnce(mockSettingsResponse);

      renderTopNQueries(CONFIGURATION);

      await waitFor(() => {
        expect(mockCore.http.get).toHaveBeenCalledWith('/api/settings', {
          query: { dataSourceId: undefined },
        });
      });
    });

    it('should use default group_by when neither persistent nor transient settings exist', async () => {
      const mockSettingsResponse = {
        response: {
          persistent: {
            search: {
              insights: {
                top_queries: {
                  latency: { enabled: 'true', top_n_size: '10', window_size: '1h' },
                },
              },
            },
          },
        },
      };
      (mockCore.http.get as jest.Mock).mockResolvedValueOnce(mockSettingsResponse);

      renderTopNQueries(CONFIGURATION);

      await waitFor(() => {
        expect(mockCore.http.get).toHaveBeenCalledWith('/api/settings', {
          query: { dataSourceId: undefined },
        });
      });
    });

    it('should handle missing grouping object gracefully', async () => {
      const mockSettingsResponse = {
        response: {
          persistent: {
            search: {
              insights: {
                top_queries: {
                  latency: { enabled: 'true', top_n_size: '10', window_size: '1h' },
                  // No grouping object
                },
              },
            },
          },
        },
      };
      (mockCore.http.get as jest.Mock).mockResolvedValueOnce(mockSettingsResponse);

      renderTopNQueries(CONFIGURATION);

      await waitFor(() => {
        expect(mockCore.http.get).toHaveBeenCalledWith('/api/settings', {
          query: { dataSourceId: undefined },
        });
      });
    });
  });

  describe('Query deduplication', () => {
    it('should deduplicate queries by ID from multiple metric endpoints', async () => {
      // Setup: Create queries with duplicate IDs but different measurements
      const mockLatencyResponse = {
        response: {
          top_queries: [
            {
              id: 'query1',
              timestamp: 1000,
              measurements: { latency: { number: 100, count: 1, aggregationType: 'NONE' } },
              total_shards: 1,
              node_id: 'node1',
              search_type: 'query_then_fetch',
              indices: ['index1'],
              group_by: 'NONE',
            },
            {
              id: 'query2',
              timestamp: 2000,
              measurements: { latency: { number: 200, count: 1, aggregationType: 'NONE' } },
              total_shards: 1,
              node_id: 'node1',
              search_type: 'query_then_fetch',
              indices: ['index1'],
              group_by: 'NONE',
            },
          ],
        },
      };

      const mockCpuResponse = {
        response: {
          top_queries: [
            {
              id: 'query1', // Duplicate ID with different measurements
              timestamp: 1000,
              measurements: { cpu: { number: 5000000, count: 1, aggregationType: 'NONE' } },
              total_shards: 1,
              node_id: 'node1',
              search_type: 'query_then_fetch',
              indices: ['index1'],
              group_by: 'NONE',
            },
            {
              id: 'query3',
              timestamp: 3000,
              measurements: { cpu: { number: 3000000, count: 1, aggregationType: 'NONE' } },
              total_shards: 1,
              node_id: 'node1',
              search_type: 'query_then_fetch',
              indices: ['index1'],
              group_by: 'NONE',
            },
          ],
        },
      };

      const mockMemoryResponse = {
        response: {
          top_queries: [
            {
              id: 'query2', // Duplicate ID with different measurements
              timestamp: 2000,
              measurements: { memory: { number: 1024, count: 1, aggregationType: 'NONE' } },
              total_shards: 1,
              node_id: 'node1',
              search_type: 'query_then_fetch',
              indices: ['index1'],
              group_by: 'NONE',
            },
          ],
        },
      };

      // Mock settings response - all metrics enabled
      const mockSettingsResponse = {
        response: {
          persistent: {
            search: {
              insights: {
                top_queries: {
                  latency: { enabled: 'true', top_n_size: '10', window_size: '1h' },
                  cpu: { enabled: 'true', top_n_size: '10', window_size: '1h' },
                  memory: { enabled: 'true', top_n_size: '10', window_size: '1h' },
                },
              },
            },
          },
        },
      };

      (mockCore.http.get as jest.Mock).mockImplementation((endpoint) => {
        if (endpoint === '/api/settings') return Promise.resolve(mockSettingsResponse);
        if (endpoint === '/api/top_queries/latency') return Promise.resolve(mockLatencyResponse);
        if (endpoint === '/api/top_queries/cpu') return Promise.resolve(mockCpuResponse);
        if (endpoint === '/api/top_queries/memory') return Promise.resolve(mockMemoryResponse);
        return Promise.resolve({ response: { top_queries: [] } });
      });

      const container = renderTopNQueries(QUERY_INSIGHTS);

      // Verify that all endpoints are called
      await waitFor(() => {
        expect(mockCore.http.get).toHaveBeenCalledWith(
          '/api/top_queries/latency',
          expect.any(Object)
        );
        expect(mockCore.http.get).toHaveBeenCalledWith('/api/top_queries/cpu', expect.any(Object));
        expect(mockCore.http.get).toHaveBeenCalledWith(
          '/api/top_queries/memory',
          expect.any(Object)
        );
      });

      // Verify that the component renders without errors
      // The actual deduplication logic is tested at the unit level
      expect(screen.getByText('Mocked QueryInsights')).toBeInTheDocument();
      expect(container).toMatchSnapshot();
    });

    it('should handle empty responses without errors', async () => {
      const mockEmptyResponse = { response: { top_queries: [] } };
      const mockSettingsResponse = {
        response: {
          persistent: {
            search: {
              insights: {
                top_queries: {
                  latency: { enabled: 'true', top_n_size: '10', window_size: '1h' },
                  cpu: { enabled: 'true', top_n_size: '10', window_size: '1h' },
                  memory: { enabled: 'true', top_n_size: '10', window_size: '1h' },
                },
              },
            },
          },
        },
      };

      (mockCore.http.get as jest.Mock).mockImplementation((endpoint) => {
        if (endpoint === '/api/settings') return Promise.resolve(mockSettingsResponse);
        return Promise.resolve(mockEmptyResponse);
      });

      const container = renderTopNQueries(QUERY_INSIGHTS);

      await waitFor(() => {
        expect(mockCore.http.get).toHaveBeenCalledWith(
          '/api/top_queries/latency',
          expect.any(Object)
        );
        expect(mockCore.http.get).toHaveBeenCalledWith('/api/top_queries/cpu', expect.any(Object));
        expect(mockCore.http.get).toHaveBeenCalledWith(
          '/api/top_queries/memory',
          expect.any(Object)
        );
      });

      // Should handle empty results gracefully and render without error
      expect(screen.getByText('Mocked QueryInsights')).toBeInTheDocument();
      expect(container).toMatchSnapshot();
    });

    it('should preserve first occurrence when deduplicating by ID', async () => {
      // Test that the first occurrence of a duplicate ID is preserved
      const mockLatencyResponse = {
        response: {
          top_queries: [
            {
              id: 'duplicateQuery',
              timestamp: 1000,
              measurements: { latency: { number: 100, count: 1, aggregationType: 'NONE' } },
              total_shards: 5,
              node_id: 'node1',
              search_type: 'query_then_fetch',
              indices: ['index1'],
              group_by: 'NONE',
            },
          ],
        },
      };

      const mockCpuResponse = {
        response: {
          top_queries: [
            {
              id: 'duplicateQuery', // Same ID but different properties
              timestamp: 2000, // Different timestamp
              measurements: { cpu: { number: 5000000, count: 1, aggregationType: 'NONE' } },
              total_shards: 10, // Different shard count
              node_id: 'node2', // Different node
              search_type: 'dfs_query_then_fetch', // Different search type
              indices: ['index2'], // Different indices
              group_by: 'NONE',
            },
          ],
        },
      };

      const mockSettingsResponse = {
        response: {
          persistent: {
            search: {
              insights: {
                top_queries: {
                  latency: { enabled: 'true', top_n_size: '10', window_size: '1h' },
                  cpu: { enabled: 'true', top_n_size: '10', window_size: '1h' },
                  memory: { enabled: 'false' },
                },
              },
            },
          },
        },
      };

      (mockCore.http.get as jest.Mock).mockImplementation((endpoint) => {
        if (endpoint === '/api/settings') return Promise.resolve(mockSettingsResponse);
        if (endpoint === '/api/top_queries/latency') return Promise.resolve(mockLatencyResponse);
        if (endpoint === '/api/top_queries/cpu') return Promise.resolve(mockCpuResponse);
        return Promise.resolve({ response: { top_queries: [] } });
      });

      const container = renderTopNQueries(QUERY_INSIGHTS);

      // Verify API calls are made
      await waitFor(() => {
        expect(mockCore.http.get).toHaveBeenCalledWith(
          '/api/top_queries/latency',
          expect.any(Object)
        );
        expect(mockCore.http.get).toHaveBeenCalledWith('/api/top_queries/cpu', expect.any(Object));
      });

      // Verify the component renders successfully
      expect(screen.getByText('Mocked QueryInsights')).toBeInTheDocument();
      expect(container).toMatchSnapshot();
    });
  });

  describe('Error handling', () => {
    it('shows an access-denied state without a toast for an HTTP 403', async () => {
      const forbiddenError = {
        response: { status: 403 },
        body: {
          message:
            '[security_exception] no permissions for top queries and User [name=arn:aws:iam::123456789012:role/example]',
        },
      };
      (mockCore.http.get as jest.Mock).mockImplementation((endpoint) => {
        if (endpoint === '/api/top_queries/latency') return Promise.reject(forbiddenError);
        return Promise.resolve({ response: { top_queries: [] } });
      });

      renderTopNQueries(QUERY_INSIGHTS);

      await waitFor(() => {
        expect(screen.getByText('Mocked access denied')).toBeInTheDocument();
      });
      expect(mockCore.notifications.toasts.addDanger).not.toHaveBeenCalled();
    });

    it('supports the legacy resolved security-exception response', async () => {
      (mockCore.http.get as jest.Mock).mockImplementation((endpoint) => {
        if (endpoint === '/api/top_queries/latency') {
          return Promise.resolve({
            ok: false,
            response:
              'Data Source Error: [security_exception] no permissions for top queries and User [name=example]',
          });
        }
        return Promise.resolve({ response: { top_queries: [] } });
      });

      renderTopNQueries(QUERY_INSIGHTS);

      await waitFor(() => {
        expect(screen.getByText('Mocked access denied')).toBeInTheDocument();
      });
      expect(mockCore.notifications.toasts.addDanger).not.toHaveBeenCalled();
    });

    it('does not show access denied for an explicit authentication status', async () => {
      const authenticationError = {
        response: { status: 401 },
        body: {
          error: {
            type: 'security_exception',
          },
          message: 'Authentication required',
        },
      };
      (mockCore.http.get as jest.Mock).mockImplementation((endpoint) => {
        if (endpoint === '/api/top_queries/latency') {
          return Promise.reject(authenticationError);
        }
        return Promise.resolve({ response: { top_queries: [] } });
      });

      renderTopNQueries(QUERY_INSIGHTS);

      await waitFor(() => {
        expect(mockCore.notifications.toasts.addDanger).toHaveBeenCalled();
      });
      expect(screen.queryByText('Mocked access denied')).not.toBeInTheDocument();
    });

    it('ignores a stale forbidden response after a newer request succeeds', async () => {
      const firstLatencyRequest = createDeferred<{
        response: { top_queries: Array<{ id: string }> };
      }>();
      const forbiddenError = {
        response: { status: 403 },
        body: {
          message: '[security_exception] no permissions for top queries',
        },
      };
      let latencyRequestCount = 0;

      (mockCore.http.get as jest.Mock).mockImplementation((endpoint) => {
        if (endpoint === '/api/settings') {
          return new Promise(() => undefined);
        }
        if (endpoint === '/api/top_queries/latency') {
          latencyRequestCount += 1;
          return latencyRequestCount === 1
            ? firstLatencyRequest.promise
            : Promise.resolve({ response: { top_queries: [{ id: 'new-result' }] } });
        }
        return Promise.resolve({ response: { top_queries: [] } });
      });

      renderTopNQueries(QUERY_INSIGHTS);

      await waitFor(() => {
        expect(latencyRequestCount).toBe(1);
        expect(mockQueryInsightsProps).toBeDefined();
      });

      await act(async () => {
        await mockQueryInsightsProps!.retrieveQueries('now-30m', 'now');
      });

      await waitFor(() => {
        expect(mockQueryInsightsProps?.queries.map(({ id }) => id)).toContain('new-result');
      });

      await act(async () => {
        firstLatencyRequest.reject(forbiddenError);
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(mockQueryInsightsProps?.accessDenied).toBe(false);
        expect(mockQueryInsightsProps?.queries.map(({ id }) => id)).toContain('new-result');
      });
    });

    it('show a danger toast when a top queries fails', async () => {
      const mockSettingsResponse = {
        response: {
          persistent: {
            search: {
              insights: {
                top_queries: {
                  latency: { enabled: 'true', top_n_size: '10', window_size: '1h' },
                  cpu: { enabled: 'false' },
                  memory: { enabled: 'false' },
                },
              },
            },
          },
        },
      };

      const fetchError = {
        body: { message: 'no handler found for uri [/_insights/top_queries] and method [GET]' },
      };
      (mockCore.http.get as jest.Mock).mockImplementation((endpoint) => {
        if (endpoint === '/api/settings') return Promise.resolve(mockSettingsResponse);
        if (endpoint === '/api/top_queries/latency') return Promise.reject(fetchError);
        return Promise.resolve({ response: { top_queries: [] } });
      });

      renderTopNQueries(QUERY_INSIGHTS);

      await waitFor(() => {
        expect(mockCore.notifications.toasts.addDanger).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Failed to retrieve top queries',
            text: expect.stringContaining('no handler found'),
          })
        );
      });
    });

    it('use error.message when error.body.message is absent', async () => {
      const mockSettingsResponse = {
        response: {
          persistent: {
            search: {
              insights: {
                top_queries: {
                  latency: { enabled: 'true', top_n_size: '10', window_size: '1h' },
                  cpu: { enabled: 'false' },
                  memory: { enabled: 'false' },
                },
              },
            },
          },
        },
      };
      const plainError = new Error('network down');
      (mockCore.http.get as jest.Mock).mockImplementation((endpoint) => {
        if (endpoint === '/api/settings') return Promise.resolve(mockSettingsResponse);
        if (endpoint === '/api/top_queries/latency') return Promise.reject(plainError);
        return Promise.resolve({ response: { top_queries: [] } });
      });

      renderTopNQueries(QUERY_INSIGHTS);

      await waitFor(() => {
        expect(mockCore.notifications.toasts.addDanger).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Failed to retrieve top queries',
            text: 'network down',
          })
        );
      });
    });
  });
});
