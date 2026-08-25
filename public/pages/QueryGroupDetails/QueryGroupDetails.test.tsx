/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import { Route, Router } from 'react-router-dom';
import { createMemoryHistory, MemoryHistory } from 'history';
import { QueryGroupDetails } from './QueryGroupDetails';
import { CoreStart } from 'opensearch-dashboards/public';
import React from 'react';
import { mockQueries } from '../../../test/mocks/mockQueries';
import '@testing-library/jest-dom';
import { retrieveQueryById } from '../../../common/utils/QueryUtils';
import { DataSourceContext } from '../TopNQueries/TopNQueries';

jest.mock('object-hash', () => jest.fn(() => '8c1e50c035663459d567fa11d8eb494d'));

jest.mock('echarts-for-react', () => () => <div data-testid="echarts-mock" />);

jest.mock('../../../common/utils/QueryUtils', () => ({
  retrieveQueryById: jest.fn(),
}));

jest.mock('react-ace', () => ({
  __esModule: true,
  default: () => <div>Mocked Ace Editor</div>,
}));

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

const mockQuery = mockQueries[0];
const queryGroupDetailsPath = (id: string) =>
  `/query-group-details?id=${id}&from=1632441600000&to=1632528000000&verbose=true`;

const createDeferred = <T,>() => {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
};

describe('QueryGroupDetails', () => {
  const coreMock = {
    chrome: {
      setBreadcrumbs: jest.fn(),
    },
    uiSettings: {
      get: jest.fn().mockReturnValue(false),
    },
  } as unknown as CoreStart;

  beforeEach(() => {
    jest.clearAllMocks();
    (retrieveQueryById as jest.Mock).mockResolvedValue(mockQuery);
  });

  const renderComponent = (
    history: MemoryHistory = createMemoryHistory({
      initialEntries: [queryGroupDetailsPath('mockId')],
    })
  ) => {
    return render(
      <Router history={history}>
        <DataSourceContext.Provider value={mockDataSourceContext}>
          <Route path="/query-group-details">
            <QueryGroupDetails
              core={coreMock}
              depsStart={{ navigation: {} }}
              params={{} as any}
              dataSourceManagement={dataSourceManagementMock}
            />
          </Route>
        </DataSourceContext.Provider>
      </Router>
    );
  };

  it('renders the QueryGroupDetails component', async () => {
    renderComponent();

    expect(screen.getByText('Query group details')).toBeInTheDocument();
    expect(screen.getByText('Sample query details')).toBeInTheDocument();

    await waitFor(() => {
      expect(coreMock.chrome.setBreadcrumbs).toHaveBeenCalledWith([
        expect.objectContaining({ text: 'Query insights' }),
        expect.objectContaining({ text: expect.stringMatching(/^Query group details: .+/) }),
      ]);
    });
  });

  it('fetches and displays query group data', async () => {
    renderComponent();

    await waitFor(() => {
      expect(retrieveQueryById).toHaveBeenCalledWith(
        coreMock,
        undefined,
        '1632441600000',
        '1632528000000',
        'mockId',
        true
      );
    });

    expect(screen.getByText('Query')).toBeInTheDocument();
    expect(screen.getByText('Latency')).toBeInTheDocument();
  });

  it('shows an access-denied message instead of query group details for a forbidden response', async () => {
    (retrieveQueryById as jest.Mock).mockRejectedValue({
      statusCode: 403,
      body: { message: '[security_exception] no permissions for top queries' },
    });

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          level: 2,
          name: "You don't have permission to view Query Insights data.",
        })
      ).toBeInTheDocument();
    });
    expect(screen.queryByText('Sample query details')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Latency' })).not.toBeInTheDocument();
  });

  it('ignores a stale forbidden response after navigating to another query group', async () => {
    const firstRequest = createDeferred<typeof mockQuery>();
    const secondRequest = createDeferred<typeof mockQuery>();
    (retrieveQueryById as jest.Mock).mockImplementation(
      (_core, _dataSourceId, _from, _to, queryId) =>
        queryId === 'group-a' ? firstRequest.promise : secondRequest.promise
    );
    const history = createMemoryHistory({
      initialEntries: [queryGroupDetailsPath('group-a')],
    });

    renderComponent(history);
    await waitFor(() =>
      expect(retrieveQueryById).toHaveBeenCalledWith(
        coreMock,
        undefined,
        '1632441600000',
        '1632528000000',
        'group-a',
        true
      )
    );

    act(() => history.push(queryGroupDetailsPath('group-b')));
    await waitFor(() =>
      expect(retrieveQueryById).toHaveBeenCalledWith(
        coreMock,
        undefined,
        '1632441600000',
        '1632528000000',
        'group-b',
        true
      )
    );

    await act(async () => {
      secondRequest.resolve({ ...mockQuery, id: 'group-b' });
      await Promise.resolve();
    });
    await act(async () => {
      firstRequest.reject({ statusCode: 403 });
      await Promise.resolve();
    });

    expect(
      screen.queryByText("You don't have permission to view Query Insights data.")
    ).not.toBeInTheDocument();
    expect(screen.getByText('Sample query details')).toBeInTheDocument();
  });

  it('renders latency bar chart', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText('Latency')).toHaveLength(1);
    });

    expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
  });

  it('renders tooltips', () => {
    renderComponent();

    const tooltips = screen.getAllByLabelText('Details tooltip');
    expect(tooltips).toHaveLength(2);
  });

  it('renders correct breadcrumb based on query timestamp', async () => {
    jest.spyOn(Date.prototype, 'toDateString').mockReturnValue('Mon Sep 24 2021');
    jest.spyOn(Date.prototype, 'toLocaleTimeString').mockReturnValue('12:00:00 AM');

    renderComponent();

    await waitFor(() => {
      expect(coreMock.chrome.setBreadcrumbs).toHaveBeenCalledWith([
        {
          text: 'Query insights',
          href: '/queryInsights',
          onClick: expect.any(Function),
        },
        {
          text: 'Query group details: Sep 24, 2021 @ 12:00:00 AM',
        },
      ]);
    });
  });

  it('matches snapshot', async () => {
    const { container } = renderComponent();

    await waitFor(() => {
      expect(retrieveQueryById).toHaveBeenCalled();
    });

    const dateElements = container.getElementsByClassName('euiText euiText--extraSmall');
    Array.from(dateElements).forEach((element) => {
      if (element.textContent?.includes('@')) {
        element.textContent = 'Sep 24, 2021 @ 12:00:00 AM';
      }
    });

    expect(container).toMatchSnapshot();
  });
});
