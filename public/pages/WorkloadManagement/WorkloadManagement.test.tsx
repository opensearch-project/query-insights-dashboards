/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import { WorkloadManagement, WLM_MAIN, WLM_DETAILS } from './WorkloadManagement';
import { CoreStart } from 'opensearch-dashboards/public';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';

// Mock the subcomponents
jest.mock('./WLMMain/WLMMain', () => () => <div>Mocked WLM Main</div>);
jest.mock('./WLMDetails/WLMDetails', () => () => <div>Mocked WLM Details</div>);

const mockCore = ({
  http: {
    get: jest.fn(),
    put: jest.fn(),
  },
  uiSettings: {
    get: jest.fn().mockReturnValue(false),
  },
} as unknown) as CoreStart;

const mockDepsStart: QueryInsightsDashboardsPluginStartDependencies = {};

const renderWithRoute = (initialRoute: string) =>
  render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Route path="*">
        <WorkloadManagement core={mockCore} depsStart={mockDepsStart} />
      </Route>
    </MemoryRouter>
  );

describe('WorkloadManagement Routing', () => {
  it('renders WLMMain component at WLM_MAIN route', () => {
    renderWithRoute(WLM_MAIN);
    expect(screen.getByText('Mocked WLM Main')).toBeInTheDocument();
  });

  it('renders WLMDetails component at WLM_DETAILS route', () => {
    renderWithRoute(WLM_DETAILS);
    expect(screen.getByText('Mocked WLM Details')).toBeInTheDocument();
  });

  it('redirects to WLM_MAIN for unknown routes', () => {
    renderWithRoute('/some/invalid/route');
    expect(screen.getByText('Mocked WLM Main')).toBeInTheDocument();
  });
});
