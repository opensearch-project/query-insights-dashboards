/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';
import QueryDetails from './QueryDetails';
import Plotly from 'plotly.js-dist';
import { MockQueries } from '../../../test/testUtils';
import '@testing-library/jest-dom';
import { QUERY_DETAILS_CACHE_KEY } from '../../../common/constants';
// Mock the external dependencies
jest.mock('plotly.js-dist', () => ({
  newPlot: jest.fn(),
}));

const mockCoreStart = {
  chrome: {
    setBreadcrumbs: jest.fn(),
  },
};
const mockQuery = MockQueries()[0];
describe('QueryDetails component', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clear all mock calls and instances before each test
  });

  it('renders QueryDetails with query from location.state', () => {
    const history = createMemoryHistory();
    const state = { query: mockQuery };
    history.push('/query-details', state);
    render(
      <Router history={history}>
        <QueryDetails core={mockCoreStart} />
      </Router>
    );
    // Check if the query details are displayed correctly
    expect(screen.getByText('Query details')).toBeInTheDocument();
    expect(screen.getByText('Query')).toBeInTheDocument();

    // Verify that the Plotly chart is rendered
    expect(Plotly.newPlot).toHaveBeenCalledTimes(1);
    // Verify the breadcrumbs were set correctly
    expect(mockCoreStart.chrome.setBreadcrumbs).toHaveBeenCalled();
  });

  it('redirects to query insights if no query in state or sessionStorage', () => {
    const history = createMemoryHistory();
    sessionStorage.removeItem(QUERY_DETAILS_CACHE_KEY);
    const pushSpy = jest.spyOn(history, 'push');
    render(
      <Router history={history}>
        <QueryDetails core={mockCoreStart} />
      </Router>
    );
    // Verify the redirection to QUERY_INSIGHTS when no query is found
    expect(pushSpy).toHaveBeenCalledWith('/queryInsights');
  });

  it('retrieves query from sessionStorage if not in location.state', () => {
    const history = createMemoryHistory();
    // Set sessionStorage with the mock query
    sessionStorage.setItem(QUERY_DETAILS_CACHE_KEY, JSON.stringify(mockQuery));
    render(
      <Router history={history}>
        <QueryDetails core={mockCoreStart} />
      </Router>
    );
    // Check if the query details are displayed correctly from sessionStorage
    expect(screen.getByText('Query details')).toBeInTheDocument();
    expect(screen.getByText('Query')).toBeInTheDocument();
    // Verify that the Plotly chart is rendered
    expect(Plotly.newPlot).toHaveBeenCalledTimes(1);
  });

  it('handles sessionStorage parsing error gracefully', () => {
    const history = createMemoryHistory();
    // Set sessionStorage with invalid JSON to simulate parsing error
    sessionStorage.setItem(QUERY_DETAILS_CACHE_KEY, '{invalid json');
    render(
      <Router history={history}>
        <QueryDetails core={mockCoreStart} />
      </Router>
    );
    // Verify that the Plotly chart is not rendered due to lack of data
    expect(Plotly.newPlot).not.toHaveBeenCalled();
  });
});
