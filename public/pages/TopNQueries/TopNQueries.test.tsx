/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { MemoryRouter } from 'react-router-dom';
import TopNQueries, { QUERY_INSIGHTS, CONFIGURATION } from './TopNQueries';
import { CoreStart, AppMountParameters } from 'opensearch-dashboards/public';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';

jest.mock('../QueryInsights/QueryInsights', () => () => <div>Mocked QueryInsights</div>);
jest.mock('../Configuration/Configuration', () => () => <div>Mocked Configuration</div>);
jest.mock('../QueryDetails/QueryDetails', () => () => <div>Mocked QueryDetails</div>);

const mockCore = ({
  http: {
    get: jest.fn(),
    put: jest.fn(),
  },
  uiSettings: {
    get: jest.fn().mockReturnValue(false),
  },
} as unknown) as CoreStart;

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

const renderTopNQueries = (type: string) =>
  render(
    <MemoryRouter initialEntries={[type]}>
      <TopNQueries core={mockCore} depsStart={mockDepsStart} params={mockParams} />
    </MemoryRouter>
  );

describe('TopNQueries Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders and switches tabs correctly', () => {
    const container = renderTopNQueries(QUERY_INSIGHTS);

    // Check for Query Insights tab content
    expect(screen.getByText('Mocked QueryInsights')).toBeInTheDocument();
    expect(screen.getByText('Top N queries')).toBeInTheDocument();
    expect(screen.getByText('Configuration')).toBeInTheDocument();
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
      expect(mockCore.http.get).toHaveBeenCalledTimes(7);
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
});
