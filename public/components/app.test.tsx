/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import { coreMock } from '../../../../src/core/public/mocks';
import { MemoryRouter as Router } from 'react-router-dom';
import { QueryInsightsDashboardsApp } from './app';

describe('<QueryInsightsDashboardsApp /> spec', () => {
  it('renders the component', () => {
    const mockHttpStart = {
      basePath: {
        serverBasePath: '/app/opensearch-dashboards',
      },
    };
    const coreStart = coreMock.createStart();

    const { container } = render(
      <Router>
        <QueryInsightsDashboardsApp
          basename="/"
          core={coreStart}
          http={mockHttpStart as any}
          navigation={
            {
              ui: { TopNavMenu: () => null },
            } as any
          }
          notifications={{} as any}
        />
      </Router>
    );
    expect(container).toMatchSnapshot();
  });
});
