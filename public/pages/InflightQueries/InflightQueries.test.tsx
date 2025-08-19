/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CoreStart } from 'opensearch-dashboards/public';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DataSourceContext } from '../TopNQueries/TopNQueries';

import { InflightQueries } from './InflightQueries';
import { retrieveLiveQueries } from '../../../common/utils/QueryUtils';
import stubLiveQueries from '../../../cypress/fixtures/stub_live_queries.json';
import '@testing-library/jest-dom';

jest.mock('../../../common/utils/QueryUtils');

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

describe('InflightQueries', () => {
  const mockHttpGet = jest.fn();
  const mockHttpPost = jest.fn();
  
  const mockCore = ({
    http: {
      get: mockHttpGet,
      post: mockHttpPost,
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
  } as unknown) as CoreStart;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHttpGet.mockResolvedValue({});
    mockHttpPost.mockResolvedValue({});
    (retrieveLiveQueries as jest.Mock).mockResolvedValue(stubLiveQueries);
  });

  const renderInflightQueries = () => {
    return render(
      <MemoryRouter>
        <DataSourceContext.Provider
          value={{
            dataSource: { id: 'default' },
            setDataSource: jest.fn(),
          }}
        >
          <InflightQueries
            core={mockCore}
            depsStart={
              {
                data: {
                  dataSources: {
                    get: jest.fn().mockReturnValue(mockCore.http),
                  },
                },
              } as any
            }
            params={{} as any}
            dataSourceManagement={undefined}
          />
        </DataSourceContext.Provider>
      </MemoryRouter>
    );
  };

  it('displays metric values from fixture', async () => {
    renderInflightQueries();

    await waitFor(() => {
      expect(screen.getByText('Active queries')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.getByText('7.19 s')).toBeInTheDocument();
      expect(screen.getByText('9.69 s')).toBeInTheDocument();
      expect(screen.getByText('1.68 ms')).toBeInTheDocument();
      expect(screen.getByText('69.12 KB')).toBeInTheDocument();
      expect(screen.getByText('ID: node-A1B2C4E5:3614')).toBeInTheDocument();
    });
  });

  it('shows 0 when there are no queries', async () => {
    (retrieveLiveQueries as jest.Mock).mockResolvedValue({
      response: { live_queries: [] },
    });

    renderInflightQueries();

    await waitFor(() => {
      expect(screen.getAllByText('0')).toHaveLength(8);
    });
  });

  it('updates data periodically', async () => {
    jest.useFakeTimers();

    renderInflightQueries();

    await waitFor(() => {
      expect(retrieveLiveQueries).toHaveBeenCalledTimes(1);
    });

    act(() => {
      jest.advanceTimersByTime(30000);
    });

    await waitFor(() => {
      expect(retrieveLiveQueries).toHaveBeenCalledTimes(2);
    });

    act(() => {
      jest.advanceTimersByTime(30000);
    });

    await waitFor(() => {
      expect(retrieveLiveQueries).toHaveBeenCalledTimes(3);
    });

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
            timestamp: Date.now(),
            node_id: 'node1',
            description: 'indices[index1] search_type[dfs_query_then_fetch]',
          },
        ],
      },
    };

    (retrieveLiveQueries as jest.Mock).mockResolvedValue(mockSmallLatency);

    renderInflightQueries();

    await waitFor(() => {
      expect(screen.getAllByText('0.50 µs')).toHaveLength(3);
      expect(screen.getAllByText('1.00 ms')).toHaveLength(2);
    });
  });

  it('renders legend correctly', async () => {
    renderInflightQueries();

    await waitFor(() => {
      expect(screen.getByText(/Queries by Node/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Others:/i)).toBeInTheDocument();
  });

  it('handles WLM group selection', async () => {
    mockHttpGet.mockResolvedValueOnce([
      { component: 'workload-management', name: 'wlm-plugin' }
    ]);
    mockHttpGet.mockResolvedValueOnce({
      body: { node1: { workload_groups: { group1: { total_completions: 5 } } } }
    });
    mockHttpGet.mockResolvedValueOnce({
      body: { workload_groups: [{ _id: 'group1', name: 'Test Group' }] }
    });

    renderInflightQueries();

    await waitFor(() => {
      expect(screen.getByLabelText('Workload group selector')).toBeInTheDocument();
    });
  });

  it('toggles auto-refresh', async () => {
    renderInflightQueries();
    
    const autoRefreshSwitch = await screen.findByRole('switch');
    expect(autoRefreshSwitch).toBeInTheDocument();
  });

  it('handles chart type changes', async () => {
    renderInflightQueries();

    await waitFor(() => {
      expect(screen.getByTestId('chart-node-donut')).toBeInTheDocument();
    });
  });

  it('handles query cancellation', async () => {
    mockHttpPost.mockResolvedValue({});
    
    renderInflightQueries();

    await waitFor(() => {
      expect(screen.getAllByText('Cancel')).toHaveLength(4);
    });
  });

  it('handles memory formatting', async () => {
    const mockLargeMemory = {
      response: {
        live_queries: [{
          id: 'query1',
          measurements: {
            latency: { number: 1000000000 },
            cpu: { number: 1000000000 },
            memory: { number: 1073741824 }
          },
          timestamp: Date.now(),
          node_id: 'node1',
          description: 'indices[index1] search_type[dfs_query_then_fetch]'
        }]
      }
    };

    (retrieveLiveQueries as jest.Mock).mockResolvedValue(mockLargeMemory);
    renderInflightQueries();

    await waitFor(() => {
      expect(screen.getByText('1.00 GB')).toBeInTheDocument();
    });
  });

  it('handles error states gracefully', async () => {
    (retrieveLiveQueries as jest.Mock).mockRejectedValue(new Error('API Error'));
    
    renderInflightQueries();

    await waitFor(() => {
      expect(screen.getByText('Active queries')).toBeInTheDocument();
    });
  });

  it('handles table selection and bulk cancel', async () => {
    mockHttpPost.mockResolvedValue({});
    renderInflightQueries();

    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });
  });

  it('handles refresh interval changes', async () => {
    renderInflightQueries();
    
    await waitFor(() => {
      const select = screen.getByDisplayValue('5 seconds');
      expect(select).toBeInTheDocument();
    });
  });

  it('handles bar chart rendering', async () => {
    renderInflightQueries();

    await waitFor(() => {
      const chartButtons = screen.getAllByText('Bar');
      expect(chartButtons.length).toBe(4);
    });
  });

  it('handles WLM navigation', async () => {

    mockHttpGet.mockResolvedValueOnce([{ component: 'workload-management' }]);
    
    const mockWithWlm = {
      response: {
        live_queries: [{
          ...stubLiveQueries.response.live_queries[0],
          query_group_id: 'group1'
        }]
      }
    };
    
    (retrieveLiveQueries as jest.Mock).mockResolvedValue(mockWithWlm);
    renderInflightQueries();

    await waitFor(() => {
      expect(screen.getByText('WLM Group')).toBeInTheDocument();
    });
  });

  it('handles timeout scenarios', async () => {
    jest.useFakeTimers();
    const slowPromise = new Promise(resolve => setTimeout(resolve, 10000));
    (retrieveLiveQueries as jest.Mock).mockReturnValue(slowPromise);
    
    renderInflightQueries();
    
    act(() => {
      jest.advanceTimersByTime(6000);
    });
    
    jest.useRealTimers();
  });

  it('handles empty node and index counts', async () => {
    (retrieveLiveQueries as jest.Mock).mockResolvedValue({
      response: { live_queries: [] }
    });
    
    renderInflightQueries();

    await waitFor(() => {
      expect(screen.getAllByText('No data available')).toHaveLength(2);
    });
  });

  it('handles WLM stats display', async () => {
    mockHttpGet.mockResolvedValueOnce([{ component: 'workload-management' }]);
    mockHttpGet.mockResolvedValueOnce({
      body: { node1: { workload_groups: { group1: { total_completions: 10, total_cancellations: 2, total_rejections: 1 } } } }
    });
    mockHttpGet.mockResolvedValueOnce({ body: { workload_groups: [] } });
    
    renderInflightQueries();

    await waitFor(() => {
      expect(screen.getByText('Total completions')).toBeInTheDocument();
    });
  });
});
