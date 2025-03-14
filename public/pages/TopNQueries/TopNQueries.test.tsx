/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { MemoryRouter } from 'react-router-dom';
import TopNQueries, { QUERY_INSIGHTS, CONFIGURATION } from './TopNQueries';
import { CoreStart } from 'opensearch-dashboards/public';

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

const renderTopNQueries = (type: string) =>
  render(
    <MemoryRouter initialEntries={[type]}>
      <TopNQueries core={mockCore} depsStart={{ navigation: {} }} params={{} as any} />
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
          initialStart="now-1d"
          initialEnd="now"
          depsStart={{ navigation: {} }}
          params={{} as any}
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
          depsStart={{ navigation: {} }}
          params={{} as any}
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
});
