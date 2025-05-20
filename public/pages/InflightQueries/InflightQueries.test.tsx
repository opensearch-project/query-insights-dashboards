/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import InflightQueries from './InflightQueries';
import { retrieveLiveQueries } from '../../../common/utils/QueryUtils';
jest.mock('vega-embed', () => {
  return {
    __esModule: true,
    default: jest.fn().mockResolvedValue({}),
  };
});
import '@testing-library/jest-dom';

jest.mock('../../../common/utils/QueryUtils');

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

  const mockLiveQueriesResponse = {
    ok: true,
    response: {
      live_queries: [
        {
          timestamp: 1746147037494,
          id: 'a23fvIkHTVuE3LkB_001',
          node_id: 'node_1',
          description:
            'indices[customers], search_type[QUERY_THEN_FETCH], source[{"size":0,"aggregations":{"heavy_terms":{"terms":{"field":"title.keyword","size":1000000}}}}]',
          measurements: {
            cpu: { number: 657000, count: 1, aggregationType: 'NONE' },
            memory: { number: 9256, count: 1, aggregationType: 'NONE' },
            latency: { number: 5174478333, count: 1, aggregationType: 'NONE' },
          },
        },
        {
          timestamp: 1746147037494,
          id: 'b45fvIkHTVuE3LkB_002',
          node_id: 'node_2',
          description:
            'indices[orders], search_type[QUERY_THEN_FETCH], source[{"size":0,"aggregations":{"heavy_terms":{"terms":{"field":"title.keyword","size":500000}}}}]',
          measurements: {
            cpu: { number: 957000, count: 1, aggregationType: 'NONE' },
            memory: { number: 13256, count: 1, aggregationType: 'NONE' },
            latency: { number: 8174478333, count: 1, aggregationType: 'NONE' },
          },
        },
        {
          timestamp: 1746147037494,
          id: 'c67fvIkHTVuE3LkB_003',
          node_id: 'node_3',
          description:
            'indices[products], search_type[QUERY_THEN_FETCH], source[{"size":0,"aggregations":{"heavy_terms":{"terms":{"field":"title.keyword","size":750000}}}}]',
          measurements: {
            cpu: { number: 757000, count: 1, aggregationType: 'NONE' },
            memory: { number: 15256, count: 1, aggregationType: 'NONE' },
            latency: { number: 6174478333, count: 1, aggregationType: 'NONE' },
          },
        },
        {
          timestamp: 1746147037494,
          id: 'd89fvIkHTVuE3LkB_004',
          node_id: 'node_4',
          description:
            'indices[inventory], search_type[QUERY_THEN_FETCH], source[{"size":0,"aggregations":{"heavy_terms":{"terms":{"field":"title.keyword","size":600000}}}}]',
          measurements: {
            cpu: { number: 857000, count: 1, aggregationType: 'NONE' },
            memory: { number: 11256, count: 1, aggregationType: 'NONE' },
            latency: { number: 7174478333, count: 1, aggregationType: 'NONE' },
          },
        },
        {
          timestamp: 1746147037494,
          id: 'e01fvIkHTVuE3LkB_005',
          node_id: 'node_5',
          description:
            'indices[users], search_type[QUERY_THEN_FETCH], source[{"size":0,"aggregations":{"heavy_terms":{"terms":{"field":"title.keyword","size":800000}}}}]',
          measurements: {
            cpu: { number: 557000, count: 1, aggregationType: 'NONE' },
            memory: { number: 17256, count: 1, aggregationType: 'NONE' },
            latency: { number: 4174478333, count: 1, aggregationType: 'NONE' },
          },
        },
        {
          timestamp: 1746147037494,
          id: 'f12fvIkHTVuE3LkB_006',
          node_id: 'node_1',
          description:
            'indices[sales], search_type[QUERY_THEN_FETCH], source[{"size":0,"aggregations":{"heavy_terms":{"terms":{"field":"title.keyword","size":900000}}}}]',
          measurements: {
            cpu: { number: 457000, count: 1, aggregationType: 'NONE' },
            memory: { number: 19256, count: 1, aggregationType: 'NONE' },
            latency: { number: 3174478333, count: 1, aggregationType: 'NONE' },
          },
        },
        {
          timestamp: 1746147037494,
          id: 'g23fvIkHTVuE3LkB_007',
          node_id: 'node_2',
          description:
            'indices[reports], search_type[QUERY_THEN_FETCH], source[{"size":0,"aggregations":{"heavy_terms":{"terms":{"field":"title.keyword","size":550000}}}}]',
          measurements: {
            cpu: { number: 357000, count: 1, aggregationType: 'NONE' },
            memory: { number: 21256, count: 1, aggregationType: 'NONE' },
            latency: { number: 2174478333, count: 1, aggregationType: 'NONE' },
          },
        },
        {
          timestamp: 1746147037494,
          id: 'h34fvIkHTVuE3LkB_008',
          node_id: 'node_3',
          description:
            'indices[analytics], search_type[QUERY_THEN_FETCH], source[{"size":0,"aggregations":{"heavy_terms":{"terms":{"field":"title.keyword","size":650000}}}}]',
          measurements: {
            cpu: { number: 257000, count: 1, aggregationType: 'NONE' },
            memory: { number: 23256, count: 1, aggregationType: 'NONE' },
            latency: { number: 1174478333, count: 1, aggregationType: 'NONE' },
          },
        },
        {
          timestamp: 1746147037494,
          id: 'i45fvIkHTVuE3LkB_009',
          node_id: 'node_4',
          description:
            'indices[logs], search_type[QUERY_THEN_FETCH], source[{"size":0,"aggregations":{"heavy_terms":{"terms":{"field":"title.keyword","size":450000}}}}]',
          measurements: {
            cpu: { number: 157000, count: 1, aggregationType: 'NONE' },
            memory: { number: 25256, count: 1, aggregationType: 'NONE' },
            latency: { number: 9174478333, count: 1, aggregationType: 'NONE' },
          },
        },
        {
          timestamp: 1746147037494,
          id: 'j56fvIkHTVuE3LkB_010',
          node_id: 'node_5',
          description:
            'indices[metrics], search_type[QUERY_THEN_FETCH], source[{"size":0,"aggregations":{"heavy_terms":{"terms":{"field":"title.keyword","size":350000}}}}]',
          measurements: {
            cpu: { number: 757000, count: 1, aggregationType: 'NONE' },
            memory: { number: 27256, count: 1, aggregationType: 'NONE' },
            latency: { number: 5574478333, count: 1, aggregationType: 'NONE' },
          },
        },
        {
          timestamp: 1746147037494,
          id: 'k67fvIkHTVuE3LkB_011',
          node_id: 'node_1',
          description:
            'indices[events], search_type[QUERY_THEN_FETCH], source[{"size":0,"aggregations":{"heavy_terms":{"terms":{"field":"title.keyword","size":250000}}}}]',
          measurements: {
            cpu: { number: 857000, count: 1, aggregationType: 'NONE' },
            memory: { number: 29256, count: 1, aggregationType: 'NONE' },
            latency: { number: 6574478333, count: 1, aggregationType: 'NONE' },
          },
        },
        {
          timestamp: 1746147037494,
          id: 'l78fvIkHTVuE3LkB_012',
          node_id: 'node_2',
          description:
            'indices[audit], search_type[QUERY_THEN_FETCH], source[{"size":0,"aggregations":{"heavy_terms":{"terms":{"field":"title.keyword","size":150000}}}}]',
          measurements: {
            cpu: { number: 957000, count: 1, aggregationType: 'NONE' },
            memory: { number: 31256, count: 1, aggregationType: 'NONE' },
            latency: { number: 7574478333, count: 1, aggregationType: 'NONE' },
          },
        },
        {
          timestamp: 1746147037494,
          id: 'm89fvIkHTVuE3LkB_013',
          node_id: 'node_3',
          description:
            'indices[cache], search_type[QUERY_THEN_FETCH], source[{"size":0,"aggregations":{"heavy_terms":{"terms":{"field":"title.keyword","size":950000}}}}]',
          measurements: {
            cpu: { number: 657000, count: 1, aggregationType: 'NONE' },
            memory: { number: 33256, count: 1, aggregationType: 'NONE' },
            latency: { number: 8574478333, count: 1, aggregationType: 'NONE' },
          },
        },
        {
          timestamp: 1746147037494,
          id: 'n90fvIkHTVuE3LkB_014',
          node_id: 'node_4',
          description:
            'indices[queue], search_type[QUERY_THEN_FETCH], source[{"size":0,"aggregations":{"heavy_terms":{"terms":{"field":"title.keyword","size":850000}}}}]',
          measurements: {
            cpu: { number: 557000, count: 1, aggregationType: 'NONE' },
            memory: { number: 35256, count: 1, aggregationType: 'NONE' },
            latency: { number: 9574478333, count: 1, aggregationType: 'NONE' },
          },
        },
        {
          timestamp: 1746147037494,
          id: 'o01fvIkHTVuE3LkB_015',
          node_id: 'node_5',
          description:
            'indices[tasks], search_type[QUERY_THEN_FETCH], source[{"size":0,"aggregations":{"heavy_terms":{"terms":{"field":"title.keyword","size":750000}}}}]',
          measurements: {
            cpu: { number: 457000, count: 1, aggregationType: 'NONE' },
            memory: { number: 37256, count: 1, aggregationType: 'NONE' },
            latency: { number: 4574478333, count: 1, aggregationType: 'NONE' },
          },
        },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (retrieveLiveQueries as jest.Mock).mockResolvedValue(mockLiveQueriesResponse);
  });

  const renderInflightQueries = () => {
    return render(<InflightQueries core={mockCoreStart} />);
  };

  it('renders the component with initial metrics', async () => {
    const { container } = renderInflightQueries();

    await waitFor(() => {
      expect(screen.getByText('Active queries')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('5.93 s')).toBeInTheDocument();
      expect(screen.getByText('9.57 s')).toBeInTheDocument();
      expect(screen.getByText('9.25 ms')).toBeInTheDocument();
      expect(screen.getByText('340.66 KB')).toBeInTheDocument();
    });
    expect(container).toMatchSnapshot();
  });

  it('shows 0 when there are no queries', async () => {
    (retrieveLiveQueries as jest.Mock).mockResolvedValue({
      response: { live_queries: [] },
    });

    const { container } = renderInflightQueries();

    await waitFor(() => {
      expect(screen.getAllByText('0')).toHaveLength(5);
    });
    expect(container).toMatchSnapshot();
  });

  it('updates data periodically', async () => {
    jest.useFakeTimers();

    renderInflightQueries();

    await waitFor(() => {
      expect(retrieveLiveQueries).toHaveBeenCalledTimes(1);
    });

    act(() => {
      jest.advanceTimersByTime(2000);
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
              latency: { number: 500 },
              cpu: { number: 1000000 },
              memory: { number: 500 },
            },
          },
        ],
      },
    };

    (retrieveLiveQueries as jest.Mock).mockResolvedValue(mockSmallLatency);

    renderInflightQueries();

    await waitFor(() => {
      expect(screen.getAllByText('0.50 µs')).toHaveLength(2);
      expect(screen.getByText('1.00 ms')).toBeInTheDocument();
    });
  });

  it('formats memory values correctly', async () => {
    const mockMemoryValues = {
      response: {
        live_queries: [
          {
            timestamp: 1746147037494,
            id: 'o01fvIkHTVuE3LkB_015',
            node_id: 'node_5',
            description:
              'indices[tasks], search_type[QUERY_THEN_FETCH], source[{"size":0,"aggregations":{"heavy_terms":{"terms":{"field":"title.keyword","size":750000}}}}]',
            measurements: {
              latency: { number: 1000000 },
              cpu: { number: 1000000 },
              memory: { number: 2 * 1024 * 1024 * 1024 },
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
