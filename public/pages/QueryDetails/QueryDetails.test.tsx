/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import QueryDetails from './QueryDetails';
import { MockQueries } from '../../../test/testUtils';
import '@testing-library/jest-dom';
import { Route, Router } from 'react-router-dom';
import { createMemoryHistory, MemoryHistory } from 'history';
import hash from 'object-hash';
import { retrieveQueryById } from '../../../common/utils/QueryUtils';
import { DataSourceContext } from '../TopNQueries/TopNQueries';

jest.mock('echarts-for-react', () => () => <div data-testid="echarts-mock" />);

jest.mock('../../../common/utils/QueryUtils', () => ({
  retrieveQueryById: jest.fn(),
}));

jest.mock('../../utils/version-utils', () => ({
  getVersionOnce: jest.fn().mockResolvedValue('3.6.0'),
  isVersion33OrHigher: jest.fn().mockReturnValue(true),
  isVersion35OrHigher: jest.fn().mockReturnValue(true),
  isVersion36OrHigher: jest.fn().mockReturnValue(true),
}));

const mockCoreStart = {
  chrome: {
    setBreadcrumbs: jest.fn(),
  },
  uiSettings: {
    get: jest.fn().mockReturnValue(false),
  },
};

const dataSourceMenuMock = jest.fn(() => <div>Mock DataSourceMenu</div>);

const dataSourceManagementMock = {
  ui: {
    getDataSourceMenu: jest.fn().mockReturnValue(dataSourceMenuMock),
  },
};
const mockDataSourceContext = {
  dataSource: { id: 'test', label: 'Test' },
  setDataSource: jest.fn(),
};

const mockQuery = MockQueries()[0];
const queryDetailsPath = (id: string) =>
  `/query-details/?id=${id}&from=2025-01-21T22:30:33.347Z&to=2025-01-22T22:30:33.347Z&verbose=true`;

const createDeferred = <T,>() => {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
};

describe('QueryDetails component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (retrieveQueryById as jest.Mock).mockResolvedValue(mockQuery);
  });

  const renderQueryDetails = (
    history: MemoryHistory = createMemoryHistory({
      initialEntries: [queryDetailsPath(hash(mockQuery.id))],
    })
  ) => {
    return render(
      <Router history={history}>
        <DataSourceContext.Provider value={mockDataSourceContext}>
          <Route path="/query-details">
            <QueryDetails
              core={mockCoreStart}
              depsStart={{ navigation: {} }}
              params={{} as any}
              dataSourceManagement={dataSourceManagementMock}
            />
          </Route>
        </DataSourceContext.Provider>
      </Router>
    );
  };

  it('renders the main components', async () => {
    renderQueryDetails();

    await waitFor(() => {
      expect(screen.getByText('Query details')).toBeInTheDocument();
      expect(screen.getByText('Query')).toBeInTheDocument();
      expect(screen.getByText('Latency')).toBeInTheDocument();
    });
  });

  const getByTestSubj = (container: HTMLElement, id: string) =>
    container.querySelector(`[data-test-subj="${id}"]`);

  it('fetches and displays query data', async () => {
    const { container } = renderQueryDetails();

    await waitFor(() => {
      expect(retrieveQueryById).toHaveBeenCalled();
    });

    const sourceSection = getByTestSubj(container, 'query-details-source-section');
    const latencyChart = getByTestSubj(container, 'query-details-latency-chart');

    expect(sourceSection).toBeInTheDocument();
    expect(latencyChart).toBeInTheDocument();
  });

  it('shows an access-denied message instead of query details for a forbidden response', async () => {
    (retrieveQueryById as jest.Mock).mockRejectedValue({
      statusCode: 403,
      body: { message: '[security_exception] no permissions for top queries' },
    });

    const { container } = renderQueryDetails();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          level: 2,
          name: "You don't have permission to view Query Insights data.",
        })
      ).toBeInTheDocument();
    });
    expect(getByTestSubj(container, 'query-details-source-section')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Latency' })).not.toBeInTheDocument();
  });

  it('ignores a stale forbidden response after navigating to another query', async () => {
    const firstRequest = createDeferred<typeof mockQuery>();
    const secondRequest = createDeferred<typeof mockQuery>();
    (retrieveQueryById as jest.Mock).mockImplementation(
      (_core, _dataSourceId, _from, _to, queryId) =>
        queryId === 'query-a' ? firstRequest.promise : secondRequest.promise
    );
    const history = createMemoryHistory({ initialEntries: [queryDetailsPath('query-a')] });

    renderQueryDetails(history);
    await waitFor(() =>
      expect(retrieveQueryById).toHaveBeenCalledWith(
        mockCoreStart,
        undefined,
        '2025-01-21T22:30:33.347Z',
        '2025-01-22T22:30:33.347Z',
        'query-a',
        true
      )
    );

    act(() => history.push(queryDetailsPath('query-b')));
    await waitFor(() =>
      expect(retrieveQueryById).toHaveBeenCalledWith(
        mockCoreStart,
        undefined,
        '2025-01-21T22:30:33.347Z',
        '2025-01-22T22:30:33.347Z',
        'query-b',
        true
      )
    );

    await act(async () => {
      secondRequest.resolve({ ...mockQuery, id: 'query-b' });
      await Promise.resolve();
    });
    await act(async () => {
      firstRequest.reject({ statusCode: 403 });
      await Promise.resolve();
    });

    expect(
      screen.queryByText("You don't have permission to view Query Insights data.")
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Latency' }).length).toBeGreaterThan(0);
  });

  it('renders the ECharts latency chart', async () => {
    renderQueryDetails();

    await waitFor(() => {
      expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
    });
  });

  it('sets breadcrumbs correctly', async () => {
    renderQueryDetails();

    await waitFor(() => {
      expect(mockCoreStart.chrome.setBreadcrumbs).toHaveBeenCalled();
      const breadcrumbs = mockCoreStart.chrome.setBreadcrumbs.mock.calls[0][0];
      expect(breadcrumbs[0].text).toBe('Query insights');
      expect(breadcrumbs[1].text).toContain('Query details:');
    });
  });

  it('matches snapshot', async () => {
    const { container } = renderQueryDetails();

    await waitFor(() => {
      expect(retrieveQueryById).toHaveBeenCalled();
    });

    const dateElements = container.getElementsByClassName('euiDescriptionList__description');
    Array.from(dateElements).forEach((element) => {
      if (element.textContent?.includes('@')) {
        element.textContent = 'Sep 24, 2021 @ 12:00:00 AM';
      }
    });

    expect(container).toMatchSnapshot();
  });
});
