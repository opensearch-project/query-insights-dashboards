/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route } from 'react-router-dom';
import '@testing-library/jest-dom';
import { WorkloadManagement, WLM_MAIN, WLM_DETAILS, WLM_CREATE } from './WorkloadManagement';
import { CoreStart } from 'opensearch-dashboards/public';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';
import { DataSourceContext } from './WorkloadManagement';
import { sharedDataSourceState } from '../../shared-state';

const mockCore = {
  http: {
    get: jest.fn(),
    put: jest.fn(),
  },
  uiSettings: {
    get: jest.fn().mockReturnValue(false),
  },
  chrome: {
    setBreadcrumbs: jest.fn(),
  },
  notifications: {
    toasts: {
      addSuccess: jest.fn(),
      addDanger: jest.fn(),
    },
  },
  savedObjects: {
    client: {
      get: jest.fn(),
    },
  },
} as unknown as CoreStart;

const mockDepsStart = {
  dataSource: {
    dataSourceEnabled: true,
  },
} as QueryInsightsDashboardsPluginStartDependencies;

const mockDataSource = {
  id: 'default',
  name: 'default',
} as any;

const mockParams = {
  setHeaderActionMenu: jest.fn(),
} as any;

const MockDataSourceMenu = (_props: any) => <div>Mocked Data Source Menu</div>;

const mockDataSourceManagement = {
  ui: {
    getDataSourceMenu: jest.fn(() => MockDataSourceMenu),
  },
} as any;

const deferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
};

const dataSourceSavedObject = (version: string) => ({
  attributes: {
    installedPlugins: ['query-insights'],
    dataSourceVersion: version,
    title: '',
    endpoint: '',
    auth: { type: '', credentials: undefined },
  },
  id: '',
  type: 'data-source',
  references: [],
});

jest.mock('../../components/PageHeader', () => ({
  PageHeader: () => <div data-testid="mock-page-header">Mocked PageHeader</div>,
}));

const renderWithRoute = (initialRoute: string) => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Route path="*">
        <DataSourceContext.Provider
          value={{ dataSource: mockDataSource, setDataSource: jest.fn() }}
        >
          <WorkloadManagement
            core={mockCore}
            depsStart={mockDepsStart}
            params={mockParams}
            dataSourceManagement={mockDataSourceManagement}
          />
        </DataSourceContext.Provider>
      </Route>
    </MemoryRouter>
  );
};

describe('WorkloadManagement Routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockCore.savedObjects.client.get as jest.Mock).mockReset();
    sharedDataSourceState.setDataSource({ id: '', label: 'Local cluster' });

    // Restore the data source menu mock after reset
    mockDataSourceManagement.ui.getDataSourceMenu.mockReturnValue(MockDataSourceMenu);
  });

  it('renders WLMMain component at WLM_MAIN route', () => {
    renderWithRoute(WLM_MAIN);
    expect(screen.getByRole('heading', { name: /Workload groups/i })).toBeInTheDocument();
  });

  it('renders WLMDetails component at WLM_DETAILS route', async () => {
    renderWithRoute(`${WLM_DETAILS}?name=DEFAULT_WORKLOAD_GROUP`);
    expect(
      await screen.findByRole('heading', { name: /DEFAULT_WORKLOAD_GROUP/i })
    ).toBeInTheDocument();
  });

  it('redirects to WLM_MAIN for unknown routes', () => {
    renderWithRoute('/invalid/route');
    expect(screen.getByRole('heading', { name: /Workload groups/i })).toBeInTheDocument();
  });

  it('renders WLMCreate component at WLM_CREATE route', () => {
    renderWithRoute(WLM_CREATE);
    expect(screen.getByRole('heading', { name: /Create workload group/i })).toBeInTheDocument();
  });

  it('ignores an older compatibility result after the data source changes', async () => {
    const olderRequest = deferred<ReturnType<typeof dataSourceSavedObject>>();
    const currentRequest = deferred<ReturnType<typeof dataSourceSavedObject>>();
    (mockCore.savedObjects.client.get as jest.Mock).mockImplementation(
      (_type: string, id: string) => {
        if (id === 'older-source') {
          return olderRequest.promise;
        }
        if (id === 'current-source') {
          return currentRequest.promise;
        }
        throw new Error(`Unexpected data source: ${id}`);
      }
    );

    renderWithRoute(WLM_MAIN);
    expect(screen.getByRole('heading', { name: /Workload groups/i })).toBeInTheDocument();

    act(() => {
      sharedDataSourceState.setDataSource({ id: 'older-source', label: 'Older source' });
    });
    await waitFor(() => {
      expect(mockCore.savedObjects.client.get).toHaveBeenCalledWith('data-source', 'older-source');
    });

    act(() => {
      sharedDataSourceState.setDataSource({ id: 'current-source', label: 'Current source' });
    });
    await waitFor(() => {
      expect(mockCore.savedObjects.client.get).toHaveBeenCalledWith(
        'data-source',
        'current-source'
      );
    });
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await act(async () => {
      currentRequest.resolve(dataSourceSavedObject('3.0.0'));
      await currentRequest.promise;
    });
    expect(
      await screen.findByText(/WLM is not available for this data source/i)
    ).toBeInTheDocument();

    await act(async () => {
      olderRequest.resolve(dataSourceSavedObject('3.3.0'));
      await olderRequest.promise;
    });
    await waitFor(() => {
      expect(screen.getByText(/WLM is not available for this data source/i)).toBeInTheDocument();
    });
  });
});
