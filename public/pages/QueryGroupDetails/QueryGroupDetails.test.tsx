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
import hash from 'object-hash';

jest.mock('object-hash', () => jest.fn(() => '8c1e50c035663459d567fa11d8eb494d'));

jest.mock('plotly.js-dist', () => ({
  newPlot: jest.fn(),
  react: jest.fn(),
  relayout: jest.fn(),
}));

jest.mock('react-ace', () => ({
  __esModule: true,
  default: () => <div>Mocked Ace Editor</div>,
}));

describe('QueryGroupDetails', () => {
  const coreMock = ({
    chrome: {
      setBreadcrumbs: jest.fn(),
    },
  } as unknown) as CoreStart;

  const expectedHash = '8c1e50c035663459d567fa11d8eb494d';

  it('renders the QueryGroupDetails component', async () => {
    render(
      <MemoryRouter initialEntries={[`/query-group-details/${expectedHash}`]}>
        <Route exact path="/query-group-details/:hashedQuery">
          <QueryGroupDetails queries={mockQueries} core={coreMock} />
        </Route>
      </MemoryRouter>
    );

    expect(screen.getByText('Query group details')).toBeInTheDocument();
    expect(screen.getByText('Sample query details')).toBeInTheDocument();

    await waitFor(() => {
      expect(coreMock.chrome.setBreadcrumbs).toHaveBeenCalledWith([
        {
          text: 'Query insights',
          href: '/queryInsights',
          onClick: expect.any(Function),
        },
        {
          text: expect.stringMatching(/^Query group details: .+ @ .+$/), // Matches dynamic date/time format
        },
      ]);
    });
  });

  it('renders latency bar chart', async () => {
    render(
      <MemoryRouter initialEntries={[`/query-group-details/${expectedHash}`]}>
        <Route exact path="/query-group-details/:hashedQuery">
          <QueryGroupDetails queries={mockQueries} core={coreMock} />
        </Route>
      </MemoryRouter>
    );
    const latencyElements = await screen.findAllByText(/Latency/i);

    expect(latencyElements.length).toBe(2);
  });

  it('displays query details', () => {
    render(
      <MemoryRouter initialEntries={[`/query-group-details/${expectedHash}`]}>
        <Route exact path="/query-group-details/:hashedQuery">
          <QueryGroupDetails queries={mockQueries} core={coreMock} />
        </Route>
      </MemoryRouter>
    );

    expect(screen.getByText('Open in search comparision')).toBeInTheDocument();
  });

  it('should find the query based on hash', () => {
    const expectedQuery = mockQueries.find((q: any) => hash(q) === expectedHash);

    if (!expectedQuery) {
      throw new Error(`Query with hash ${expectedHash} was not found in mockQueries`);
    }
    expect(expectedQuery.id).toBe(expectedHash);
  });

  it('renders correct breadcrumb based on query hash', async () => {
    render(
      <MemoryRouter initialEntries={[`/query-group-details/${expectedHash}`]}>
        <Route exact path="/query-group-details/:hashedQuery">
          <QueryGroupDetails queries={mockQueries} core={coreMock} />
        </Route>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(coreMock.chrome.setBreadcrumbs).toHaveBeenCalledWith(
        expect.arrayContaining([
          { text: 'Query insights', href: '/queryInsights', onClick: expect.any(Function) },
          expect.objectContaining({
            text: expect.stringMatching(/^Query group details: .+/),
          }),
        ])
      );
    });
  });
});
