/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import QueryDetails from './QueryDetails';
import { MockQueries } from '../../../test/testUtils';
import '@testing-library/jest-dom';
// @ts-ignore
import plotly from 'plotly.js-dist';
import { MemoryRouter, Route } from 'react-router-dom';
import hash from 'object-hash';
import { retrieveQueryById } from '../../../common/utils/QueryUtils';
import { DataSourceContext } from '../TopNQueries/TopNQueries';

jest.mock('plotly.js-dist', () => ({
  newPlot: jest.fn(),
}));

jest.mock('../../../common/utils/QueryUtils', () => ({
  retrieveQueryById: jest.fn(),
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

describe('QueryDetails component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (retrieveQueryById as jest.Mock).mockResolvedValue(mockQuery);
  });

  const renderQueryDetails = () => {
    return render(
      <MemoryRouter
        initialEntries={[
          `/query-details/?id=${hash(
            mockQuery.id
          )}&from=2025-01-21T22:30:33.347Z&to=2025-01-22T22:30:33.347Z&verbose=true`,
        ]}
      >
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
      </MemoryRouter>
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

  it('initializes the Plotly chart', async () => {
    renderQueryDetails();

    await waitFor(() => {
      expect(plotly.newPlot).toHaveBeenCalled();
      expect(plotly.newPlot.mock.calls[0][0]).toBe('latency');
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
