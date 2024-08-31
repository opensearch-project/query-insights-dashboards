/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import { QueryInsightsDashboardsApp } from './app';

describe('<QueryInsightsDashboardsApp /> spec', () => {
  it('renders the component', () => {
    const mockHttpStart = {
      basePath: {
        serverBasePath: '/app/opensearch-dashboards',
      },
    };

    const { container } = render(
      <QueryInsightsDashboardsApp
        basename="/"
        http={mockHttpStart as any}
        navigation={
          {
            ui: { TopNavMenu: () => null },
          } as any
        }
        notifications={{} as any}
      />
    );
    expect(container).toMatchSnapshot();
  });
});
