/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render } from '@testing-library/react';
import { coreMock } from '../../../../src/core/public/mocks';
import { MemoryRouter as Router } from 'react-router-dom';
import { QueryInsightsDashboardsApp } from './app';
import { createMemoryHistory } from 'history';

describe('<QueryInsightsDashboardsApp /> spec', () => {
  it('renders the component', () => {
    const coreStart = coreMock.createStart();
    // Mock AppMountParameters
    const params = {
      appBasePath: '/',
      history: createMemoryHistory(),
      setHeaderActionMenu: jest.fn(),
      element: document.createElement('div'),
    };
    // Mock plugin dependencies
    const depsStart = {
      navigation: {
        ui: { TopNavMenu: () => null },
      },
      data: {
        dataSources: {
          dataSourceService: jest.fn(),
        },
      },
    };
    const { container } = render(
      <Router>
        <QueryInsightsDashboardsApp
          core={coreStart}
          depsStart={depsStart}
          params={params}
          dataSourceManagement={{
            ui: {
              getDataSourceMenu: jest.fn(),
              getDataSourceSelector: jest.fn(),
            },
          }}
        />
      </Router>
    );
    expect(container).toMatchSnapshot();
  });
});
