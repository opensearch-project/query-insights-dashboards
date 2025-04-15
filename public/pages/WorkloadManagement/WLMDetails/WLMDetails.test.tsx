/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WLMDetails } from './WLMDetails';
import { CoreStart } from 'opensearch-dashboards/public';
import { MemoryRouter, Route } from 'react-router-dom';
import '@testing-library/jest-dom';

const mockCore = ({
  http: {
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  notifications: {
    toasts: {
      addSuccess: jest.fn(),
      addDanger: jest.fn(),
    },
  },
  chrome: {
    setBreadcrumbs: jest.fn(),
  },
  application: {
    navigateToApp: jest.fn(),
    getUrlForApp: jest.fn(() => '/app/query-insights'),
  },
} as unknown) as CoreStart;

const mockDeps = {};

mockCore.http.get = jest.fn((path: string) => {
  if (path === '/api/_wlm/query_group') {
    return Promise.resolve({
      body: {
        query_groups: [{ name: 'test-group', _id: 'abc123' }],
      },
    });
  }

  if (path === '/api/_wlm/stats/abc123') {
    return Promise.resolve({
      body: {
        'node-1': {
          query_groups: {
            abc123: {
              cpu: { current_usage: 0.5 },
              memory: { current_usage: 0.3 },
            },
          },
        },
      },
    });
  }

  return Promise.resolve({ body: {} });
});

const renderComponent = (name = 'test-group') => {
  render(
    <MemoryRouter initialEntries={[`/wlm-details?name=${name}`]}>
      <Route path="/wlm-details">
        <WLMDetails core={mockCore as CoreStart} depsStart={mockDeps as any} />
      </Route>
    </MemoryRouter>
  );
};

jest.mock('../../../components/PageHeader', () => ({
  PageHeader: () => <div data-testid="mock-page-header" />,
}));

describe('WLMDetails Component', () => {
  beforeEach(() => {
    jest.resetAllMocks(); // Reset mock function calls
  });

  it('renders workload group name', () => {
    renderComponent();
    expect(screen.getByText(/test-group/i)).toBeInTheDocument();
  });

  it('renders query group information', () => {
    renderComponent();

    expect(screen.getByText(/Workload group name/i)).toBeInTheDocument();
    expect(screen.getByText(/Description/i)).toBeInTheDocument();
    expect(screen.getByText(/CPU usage limit/i)).toBeInTheDocument();
    expect(screen.getByText(/Memory usage limit/i)).toBeInTheDocument();

    expect(screen.getByText('test-group')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('renders tabs and switches to Settings tab', () => {
    renderComponent();

    const settingsTab = screen.getByText('Settings');
    const tabButton = settingsTab.closest('button');

    expect(tabButton).toBeInTheDocument();
    fireEvent.click(settingsTab);

    expect(tabButton).toHaveClass('euiTab-isSelected');
  });

  it('shows table when Resources tab is active', () => {
    renderComponent();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('handles no stats returned gracefully', async () => {
    // overwrite mock temporarily
    (mockCore.http.get as jest.Mock)
      .mockImplementationOnce(() =>
        Promise.resolve({ body: { query_groups: [{ name: 'test-group', _id: 'abc123' }] } })
      )
      .mockImplementationOnce(() => Promise.resolve({ body: {} }));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/No items found/i)).toBeInTheDocument();
    });
  });

  it('renders Resources tab by default with table', async () => {
    renderComponent();

    // Wait for async content to render
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    // Expect node ID and usage values to be displayed
    expect(screen.getByText((content) => content.includes('node-1'))).toBeInTheDocument();

    expect(screen.getByText((content) => content.includes('50'))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('30'))).toBeInTheDocument();
  });

  it('renders fallback if no query group found', async () => {
    mockCore.http.get = jest.fn((path: string) => {
      if (path === '/api/_wlm/query_group') {
        return Promise.resolve({ body: { query_groups: [] } });
      }
      return Promise.resolve({ body: {} });
    });

    renderComponent('non-existent-group');
    await waitFor(() => {
      expect(screen.getByText(/Workload group name/i)).toBeInTheDocument();
    });
  });

  it('does not crash if stats are missing', async () => {
    mockCore.http.get = jest.fn((path: string) => {
      if (path === '/api/_wlm/query_group') {
        return Promise.resolve({
          body: { query_groups: [{ name: 'test-group', _id: 'abc123' }] },
        });
      }
      if (path === '/api/_wlm/stats/abc123') {
        return Promise.resolve({ body: {} });
      }
      return Promise.resolve({ body: {} });
    });

    renderComponent();
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
    expect(screen.getByText(/No items found/i)).toBeInTheDocument();
  });
});
