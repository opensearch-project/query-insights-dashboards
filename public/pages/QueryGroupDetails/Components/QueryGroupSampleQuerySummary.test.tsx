/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { mockQueries } from '../../../../test/mocks/mockQueries';
import { MemoryRouter, Route } from 'react-router-dom';
import { QueryGroupSampleQuerySummary } from './QueryGroupSampleQuerySummary';
import '@testing-library/jest-dom/extend-expect';

describe('QueryGroupSampleQuerySummary', () => {
  const expectedHash = '8c1e50c035663459d567fa11d8eb494d';

  it('renders sample query summary correctly', () => {
    render(
      <MemoryRouter initialEntries={[`/query-group-details/${expectedHash}`]}>
        <Route exact path="/query-group-details/:hashedQuery">
          <QueryGroupSampleQuerySummary query={mockQueries[0]} />
        </Route>
      </MemoryRouter>
    );

    expect(screen.getByText('Sample query summary')).toBeInTheDocument();
    expect(screen.getByText('Timestamp')).toBeInTheDocument();
    expect(screen.getByText('Indices')).toBeInTheDocument();
    expect(screen.getByText('Search type')).toBeInTheDocument();
    expect(screen.getByText('Coordinator node ID')).toBeInTheDocument();
    expect(screen.getByText('Total shards')).toBeInTheDocument();
  });

  it('displays correct indices value', () => {
    render(
      <MemoryRouter initialEntries={[`/query-group-details/${expectedHash}`]}>
        <Route exact path="/query-group-details/:hashedQuery">
          <QueryGroupSampleQuerySummary query={mockQueries[0]} />
        </Route>
      </MemoryRouter>
    );

    const indices = mockQueries[0].indices.join(', ');
    expect(screen.getByText(indices)).toBeInTheDocument();
  });

  it('displays correct search type', () => {
    render(
      <MemoryRouter initialEntries={[`/query-group-details/${expectedHash}`]}>
        <Route exact path="/query-group-details/:hashedQuery">
          <QueryGroupSampleQuerySummary query={mockQueries[0]} />
        </Route>
      </MemoryRouter>
    );

    expect(screen.getByText('query then fetch')).toBeInTheDocument();
  });

  it('displays correct node ID', () => {
    render(
      <MemoryRouter initialEntries={[`/query-group-details/${expectedHash}`]}>
        <Route exact path="/query-group-details/:hashedQuery">
          <QueryGroupSampleQuerySummary query={mockQueries[0]} />
        </Route>
      </MemoryRouter>
    );

    expect(screen.getByText(mockQueries[0].node_id)).toBeInTheDocument();
  });

  it('displays correct total shards', () => {
    render(
      <MemoryRouter initialEntries={[`/query-group-details/${expectedHash}`]}>
        <Route exact path="/query-group-details/:hashedQuery">
          <QueryGroupSampleQuerySummary query={mockQueries[0]} />
        </Route>
      </MemoryRouter>
    );

    expect(screen.getByText(mockQueries[0].total_shards)).toBeInTheDocument();
  });
});
