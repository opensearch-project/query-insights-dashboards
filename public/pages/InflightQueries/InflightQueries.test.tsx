/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CoreStart } from 'opensearch-dashboards/public';
import { render, screen, waitFor, within, act } from '@testing-library/react';

import {InflightQueries} from './InflightQueries';
import { retrieveLiveQueries } from '../../../common/utils/QueryUtils';
jest.mock('vega-embed', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({}),
}));
import stubLiveQueries from '../../../cypress/fixtures/stub_live_queries.json';
import '@testing-library/jest-dom';

jest.mock('../../../common/utils/QueryUtils');

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
    return render(<InflightQueries core={mockCore} />);
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
      jest.advanceTimersByTime(6000);
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
      expect(screen.getAllByText('0.50 µs')).toHaveLength(3);
      expect(screen.getAllByText('1.00 ms')).toHaveLength(2);
    });
  });

  it('renders correct table headers and row content', async () => {
    (retrieveLiveQueries as jest.Mock).mockResolvedValue({
      response: {
        live_queries: [
          {
            timestamp: 1749187466964, // Jun 05, 2025 @ 10:24:26 PM
            id: 'node-A1B2C3D4E5:3600',
            description: 'indices[top_queries-2025.06.06-11009], search_type[QUERY_THEN_FETCH]',
            node_id: 'node-A1B2C3D4E5',
            measurements: {
              latency: { number: 7990852130, count: 1, aggregationType: 'NONE' },
              cpu: { number: 89951, count: 1, aggregationType: 'NONE' },
              memory: { number: 3818, count: 1, aggregationType: 'NONE' },
              is_cancelled: true,
            },
          },
        ],
      },
    });

    render(<InflightQueries core={mockCore} />);
    const row = await screen.findByRole('row', { name: /node-A1B2C3D4E5:3600/i });

    // Get all cells in the row
    const cells = within(row).getAllByRole('cell');

    const expectedValues = [
      'Jun 05, 2025 @ 10:24:26 PM',
      'node-A1B2C3D4E5:3600',
      'top_queries-2025.06.06-11009',
      'Node 1',
      'Time elapsed7.99 s',
      '89.95 µs',
      '3.73 KB',
      'QUERY_THEN_FETCH',
      'node-A1B2C3D4E5',
      'Cancelled',
    ];

    expectedValues.forEach((expected, i) => {
      expect(cells[i + 1].textContent).toContain(expected); // +1 to skip checkbox column
    });
  });
});
