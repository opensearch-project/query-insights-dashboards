/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route } from 'react-router-dom';
import { QueryGroupDetails } from './QueryGroupDetails';
import { CoreStart } from 'opensearch-dashboards/public';
import React from 'react';
import { mockQueries } from '../../../test/mocks/mockQueries';
import '@testing-library/jest-dom/extend-expect';
import { retrieveQueryById } from '../../../common/utils/QueryUtils';
import { DataSourceContext } from '../TopNQueries/TopNQueries';

jest.mock('object-hash', () => jest.fn(() => '8c1e50c035663459d567fa11d8eb494d'));

jest.mock('plotly.js-dist', () => ({
  newPlot: jest.fn(),
  react: jest.fn(),
  relayout: jest.fn(),
}));

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

describe('QueryGroupDetails', () => {
  const coreMock = ({
    chrome: {
      setBreadcrumbs: jest.fn(),
    },
    uiSettings: {
      get: jest.fn().mockReturnValue(false),
    },
  } as unknown) as CoreStart;

  beforeEach(() => {
    jest.clearAllMocks();
    (retrieveQueryById as jest.Mock).mockResolvedValue(mockQuery);
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter
        initialEntries={[
          '/query-group-details?id=mockId&from=1632441600000&to=1632528000000&verbose=true',
        ]}
      >
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
      </MemoryRouter>
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

  it('renders latency bar chart', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText('Latency')).toHaveLength(1);
    });

    expect(document.getElementById('latency')).toBeInTheDocument();
  });

  it('displays query details', async () => {
    const { container } = renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Open in search comparision')).toBeInTheDocument();
    });

    const codeBlock = container.querySelector('.euiCodeBlock__pre');
    expect(codeBlock).toBeInTheDocument();

    expect(codeBlock?.textContent).toContain('"query"');
    expect(codeBlock?.textContent).toMatch(/{\s*"query":/);
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
