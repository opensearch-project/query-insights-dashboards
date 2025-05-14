/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InflightQueries from './InflightQueries';
import { retrieveLiveQueries } from '../../../common/utils/QueryUtils';
import * as vegaEmbed from 'vega-embed';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('../../../common/utils/QueryUtils');
jest.mock('vega-embed', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('InflightQueries', () => {
  const mockCoreStart = {
    chrome: {
      setBreadcrumbs: jest.fn(),
      navControls: jest.fn(),
      getBreadcrumbs: jest.fn(),
      getIsVisible: jest.fn(),
      setIsVisible: jest.fn(),
      recentlyAccessed: {
        add: jest.fn(),
        get: jest.fn(),
      },
      docTitle: {
        change: jest.fn(),
        reset: jest.fn(),
      },
    },
    uiSettings: {
      get: jest.fn().mockReturnValue(false),
      set: jest.fn(),
      remove: jest.fn(),
      overrideLocalDefault: jest.fn(),
      isOverridden: jest.fn(),
    },
    http: {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      fetch: jest.fn(),
      addLoadingCountListener: jest.fn(),
      getLoadingCount: jest.fn(),
    },
    notifications: {
      toasts: {
        addSuccess: jest.fn(),
        addError: jest.fn(),
        add: jest.fn(),
        remove: jest.fn(),
        get: jest.fn(),
      },
    },
    application: {
      capabilities: {},
      navigateToApp: jest.fn(),
      currentAppId$: jest.fn(),
      getUrlForApp: jest.fn(),
      registerMountContext: jest.fn(),
    },
    docLinks: {
      links: {},
    },
    i18n: {
      translate: jest.fn((key) => key),
    },
    savedObjects: {
      client: {
        create: jest.fn(),
        bulkCreate: jest.fn(),
        delete: jest.fn(),
        find: jest.fn(),
        get: jest.fn(),
        update: jest.fn(),
        bulk: jest.fn(),
      },
    },
    overlays: {
      openFlyout: jest.fn(),
      openModal: jest.fn(),
      banners: {
        add: jest.fn(),
        remove: jest.fn(),
        get: jest.fn(),
      },
    },
  };

  const dataSourceMenuMock = jest.fn(() => <div>Mock DataSourceMenu</div>);

  const dataSourceManagementMock = {
    ui: {
      getDataSourceMenu: jest.fn().mockReturnValue(dataSourceMenuMock),
    },
  };

  const mockParams = {};
  const mockDepsStart = {};

  const mockLiveQueriesResponse = {
    response: {
      live_queries: [
        {
          id: 'query1',
          node_id: 'node1',
          description: 'indices[index1]',
          measurements: {
            latency: { number: 1000000000 }, // 1 second
            cpu: { number: 2000000000 }, // 2 seconds
            memory: { number: 1024 * 1024 }, // 1 MB
          },
        },
        {
          id: 'query2',
          node_id: 'node1',
          description: 'indices[index2]',
          measurements: {
            latency: { number: 2000000000 },
            cpu: { number: 1000000000 },
            memory: { number: 2 * 1024 * 1024 },
          },
        },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (retrieveLiveQueries as jest.Mock).mockResolvedValue(mockLiveQueriesResponse);
    (vegaEmbed.default as jest.Mock).mockResolvedValue({});
  });

  const renderInflightQueries = () => {
    return render(
      <InflightQueries
        core={mockCoreStart}
        params={mockParams}
        depsStart={mockDepsStart}
        dataSourceManagement={dataSourceManagementMock}
      />
    );
  };

  it('renders the component with initial metrics', async () => {
    renderInflightQueries();

    await waitFor(() => {
      expect(screen.getByText('Active queries')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Active queries count
      expect(screen.getByText('1.50 s')).toBeInTheDocument(); // Avg elapsed time
      expect(screen.getByText('2.00 s')).toBeInTheDocument(); // Longest running query
      expect(screen.getByText('3.00 s')).toBeInTheDocument(); // Total CPU usage
      expect(screen.getByText('3.00 MB')).toBeInTheDocument(); // Total memory usage
    });
  });

  it('updates charts when switching between donut and bar views', async () => {
    renderInflightQueries();

    const barButtons = screen.getAllByLabelText('Bar');
    await act(async () => {
      userEvent.click(barButtons[0]); // Click first bar button (Queries by Node)
    });

    expect(vegaEmbed.default).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        mark: { type: 'bar' },
      }),
      expect.any(Object)
    );
  });

  it('shows "No data available" when there are no queries', async () => {
    (retrieveLiveQueries as jest.Mock).mockResolvedValue({
      response: { live_queries: [] },
    });

    renderInflightQueries();

    await waitFor(() => {
      expect(screen.getAllByText('No data available')).toHaveLength(2);
    });
  });

  it('handles error when fetching queries', async () => {
    const error = new Error('Failed to fetch queries');
    (retrieveLiveQueries as jest.Mock).mockRejectedValue(error);

    renderInflightQueries();

    await waitFor(() => {
      expect(mockCoreStart.notifications.toasts.addError).toHaveBeenCalledWith(
        error,
        { title: 'Error fetching live queries' }
      );
    });
  });

  it('updates data periodically', async () => {
    jest.useFakeTimers();

    renderInflightQueries();

    await waitFor(() => {
      expect(retrieveLiveQueries).toHaveBeenCalledTimes(1);
    });

    act(() => {
      jest.advanceTimersByTime(2000); // Advance time by polling interval
    });

    expect(retrieveLiveQueries).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  it('formats time values correctly', async () => {
    const mockSmallLatency = {
      response: {
        live_queries: [
          {
            id: 'query1',
            measurements: {
              latency: { number: 500 }, // 500 nanoseconds
              cpu: { number: 1000000 }, // 1 millisecond
              memory: { number: 500 },
            },
          },
        ],
      },
    };

    (retrieveLiveQueries as jest.Mock).mockResolvedValue(mockSmallLatency);

    renderInflightQueries();

    await waitFor(() => {
      expect(screen.getByText('0.50 µs')).toBeInTheDocument();
      expect(screen.getByText('1.00 ms')).toBeInTheDocument();
    });
  });

  it('formats memory values correctly', async () => {
    const mockMemoryValues = {
      response: {
        live_queries: [
          {
            id: 'query1',
            measurements: {
              latency: { number: 1000000 },
              cpu: { number: 1000000 },
              memory: { number: 2 * 1024 * 1024 * 1024 }, // 2 GB
            },
          },
        ],
      },
    };

    (retrieveLiveQueries as jest.Mock).mockResolvedValue(mockMemoryValues);

    renderInflightQueries();

    await waitFor(() => {
      expect(screen.getByText('2.00 GB')).toBeInTheDocument();
    });
  });
});
