/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { render, screen } from '@testing-library/react';
import { QueryGroupAggregateSummary } from './QueryGroupAggregateSummary';
import React from 'react';
import { mockQueries } from '../../../../test/mocks/mockQueries';
import '@testing-library/jest-dom/extend-expect';
import { MemoryRouter, Route } from 'react-router-dom';

describe('QueryGroupAggregateSummary', () => {
  const expectedHash = '8c1e50c035663459d567fa11d8eb494d';

  it('renders aggregate summary correctly', () => {
    render(
      <MemoryRouter initialEntries={[`/query-group-details/${expectedHash}`]}>
        <Route exact path="/query-group-details/:hashedQuery">
          <QueryGroupAggregateSummary query={mockQueries[0]} />
        </Route>
      </MemoryRouter>
    );

    expect(screen.getByText('Aggregate summary for 8 queries')).toBeInTheDocument();
    expect(screen.getByText('Id')).toBeInTheDocument();
    expect(screen.getByText('Average Latency')).toBeInTheDocument();
    expect(screen.getByText('Average CPU Time')).toBeInTheDocument();
    expect(screen.getByText('Average Memory Usage')).toBeInTheDocument();
    expect(screen.getByText('Group by')).toBeInTheDocument();
  });

  it('calculates and displays correct latency', () => {
    render(
      <MemoryRouter initialEntries={[`/query-group-details/${expectedHash}`]}>
        <Route exact path="/query-group-details/:hashedQuery">
          <QueryGroupAggregateSummary query={mockQueries[0]} />
        </Route>
      </MemoryRouter>
    );

    const latency = '2.50 ms';
    expect(screen.getByText(latency)).toBeInTheDocument();
  });

  it('calculates and displays correct CPU time', () => {
    render(
      <MemoryRouter initialEntries={[`/query-group-details/${expectedHash}`]}>
        <Route exact path="/query-group-details/:hashedQuery">
          <QueryGroupAggregateSummary query={mockQueries[0]} />
        </Route>
      </MemoryRouter>
    );

    const cpuTime = '1.42 ms';
    expect(screen.getByText(cpuTime)).toBeInTheDocument();
  });

  it('calculates and displays correct memory usage', () => {
    render(
      <MemoryRouter initialEntries={[`/query-group-details/${expectedHash}`]}>
        <Route exact path="/query-group-details/:hashedQuery">
          <QueryGroupAggregateSummary query={mockQueries[0]} />
        </Route>
      </MemoryRouter>
    );

    const memoryUsage = '16528.00 B';
    expect(screen.getByText(memoryUsage)).toBeInTheDocument();
  });

  it('displays correct query id', () => {
    render(
      <MemoryRouter initialEntries={[`/query-group-details/${expectedHash}`]}>
        <Route exact path="/query-group-details/:hashedQuery">
          <QueryGroupAggregateSummary query={mockQueries[0]} />
        </Route>
      </MemoryRouter>
    );

    const id = mockQueries[0].id;
    expect(screen.getByText(id)).toBeInTheDocument();
  });

  it('displays correct group_by value when SIMILARITY', () => {
    const queryWithSimilarity = {
      ...mockQueries[0],
      group_by: 'SIMILARITY',
    };

    render(
      <MemoryRouter initialEntries={[`/query-group-details/${expectedHash}`]}>
        <Route exact path="/query-group-details/:hashedQuery">
          <QueryGroupAggregateSummary query={queryWithSimilarity} />
        </Route>
      </MemoryRouter>
    );

    expect(screen.getByText('Group by')).toBeInTheDocument();
    expect(screen.getByText('SIMILARITY')).toBeInTheDocument(); // Verifies the "group_by" value is rendered
  });
});
