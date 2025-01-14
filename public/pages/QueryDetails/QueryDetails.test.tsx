/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import QueryDetails from './QueryDetails';
import Plotly from 'plotly.js-dist';
import { MockQueries } from '../../../test/testUtils';
import '@testing-library/jest-dom';
import { MemoryRouter, Route } from 'react-router-dom';
import hash from 'object-hash';
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
const mockParams = { hashedQuery: hash(mockQuery) };

describe('QueryDetails component', () => {
  beforeAll(() => {
    jest.spyOn(Date.prototype, 'toLocaleTimeString').mockImplementation(() => '12:00:00 AM');
    jest.spyOn(Date.prototype, 'toDateString').mockImplementation(() => 'Mon Jan 13 2025');
  });

  afterAll(() => {
    jest.resetAllMocks(); // Reset all mocks after all tests
  });

  beforeEach(() => {
    jest.clearAllMocks(); // Clear all mock calls and instances before each test
  });

  const renderComponent = () =>
    render(
      <MemoryRouter initialEntries={[`/query-details/${mockParams.hashedQuery}`]}>
        <Route path="/query-details/:hashedQuery">
          <QueryDetails queries={MockQueries()} core={mockCoreStart} />
        </Route>
      </MemoryRouter>
    );

  it('renders the QueryDetails page', () => {
    const { container } = renderComponent();
    // Check if the query details are displayed correctly
    expect(screen.getByText('Query details')).toBeInTheDocument();
    expect(screen.getByText('Query')).toBeInTheDocument();

    // Verify that the Plotly chart is rendered
    expect(Plotly.newPlot).toHaveBeenCalledTimes(1);
    // Verify the breadcrumbs were set correctly
    expect(mockCoreStart.chrome.setBreadcrumbs).toHaveBeenCalled();

    expect(container).toMatchSnapshot();
  });
});
