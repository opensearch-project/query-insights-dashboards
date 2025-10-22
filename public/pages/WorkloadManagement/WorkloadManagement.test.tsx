/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import { WorkloadManagement, WLM_MAIN, WLM_DETAILS, WLM_CREATE } from './WorkloadManagement';
import { CoreStart } from 'opensearch-dashboards/public';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';
import { DataSourceContext } from './WorkloadManagement';

const mockCore = ({
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
    client: {},
  },
} as unknown) as CoreStart;

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
});
