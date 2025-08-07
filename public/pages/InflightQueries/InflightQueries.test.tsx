/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CoreStart } from 'opensearch-dashboards/public';
import { render, screen, waitFor, act } from '@testing-library/react';
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
  const mockCore = ({
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
  } as unknown) as CoreStart;

  beforeEach(() => {
    jest.clearAllMocks();
    (retrieveLiveQueries as jest.Mock).mockResolvedValue(stubLiveQueries);
  });

  const renderInflightQueries = () => {
    return render(
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
});
