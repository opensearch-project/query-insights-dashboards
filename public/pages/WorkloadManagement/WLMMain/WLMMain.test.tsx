/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { WorkloadManagementMain } from './WLMMain';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/react';
import { CoreStart } from 'opensearch-dashboards/public';

jest.mock('echarts-for-react', () => () => <div data-testid="MockedChart">Mocked Chart</div>);
jest.mock('../../../components/PageHeader', () => ({
  PageHeader: () => <div>Mocked PageHeader</div>,
}));

const mockCore = ({
  http: {
    get: jest.fn(),
  },
  notifications: {
    toasts: {
      addSuccess: jest.fn(),
    },
  },
  chrome: {
    setBreadcrumbs: jest.fn(),
  },
} as unknown) as CoreStart;

const mockDepsStart = {} as any;

const mockNodeStats = {
  nodeA: {
    query_groups: {
      group1: {
        total_completions: 5,
        total_rejections: 2,
        total_cancellations: 1,
        cpu: { current_usage: 0.2 },
        memory: { current_usage: 0.3 },
      },
      group2: {
        total_completions: 10,
        total_rejections: 4,
        total_cancellations: 3,
        cpu: { current_usage: 0.5 },
        memory: { current_usage: 0.6 },
      },
      group3: {
        total_completions: 10,
        total_rejections: 4,
        total_cancellations: 3,
        cpu: { current_usage: 0.5 },
        memory: { current_usage: 0.6 },
      },
      group4: {
        total_completions: 10,
        total_rejections: 4,
        total_cancellations: 3,
        cpu: { current_usage: 0.5 },
        memory: { current_usage: 0.6 },
      },
      group5: {
        total_completions: 10,
        total_rejections: 4,
        total_cancellations: 3,
        cpu: { current_usage: 0.5 },
        memory: { current_usage: 0.6 },
      },
      group6: {
        total_completions: 10,
        total_rejections: 4,
        total_cancellations: 3,
        cpu: { current_usage: 0.5 },
        memory: { current_usage: 0.6 },
      },
    },
  },
  nodeB: {
    query_groups: {
      group1: {
        cpu: { current_usage: 0.25 },
        memory: { current_usage: 0.35 },
      },
    },
  },
};

const mockQueryGroups = {
  query_groups: [
    { _id: 'group1', name: 'Group One' },
    { _id: 'group2', name: 'Group Two' },
    { _id: 'group3', name: 'Group Three' },
    { _id: 'group4', name: 'Group Four' },
    { _id: 'group5', name: 'Group Five' },
    { _id: 'group6', name: 'Group Six' },
  ],
};

const mockGroupDetails = {
  query_groups: [{ resource_limits: { cpu: 0.5, memory: 0.5 } }],
};

beforeEach(() => {
  jest.clearAllMocks();

  (mockCore.http.get as jest.Mock).mockImplementation((url) => {
    if (url === '/api/_wlm/stats') return Promise.resolve(mockNodeStats);
    if (url === '/api/_wlm/query_group') return Promise.resolve(mockQueryGroups);
    if (url === '/api/_wlm/nodeA/stats') return Promise.resolve(mockNodeStats);
    if (url === '/api/_wlm/query_group/Group One') return Promise.resolve(mockGroupDetails);
    if (url === '/api/_wlm/query_group/Group Two') return Promise.resolve(mockGroupDetails);
    return Promise.resolve({});
  });
});

const renderComponent = () =>
  render(
    <MemoryRouter>
      <WorkloadManagementMain core={mockCore} depsStart={mockDepsStart} />
    </MemoryRouter>
  );

describe('WorkloadManagement Component - Extended Tests', () => {
  it('renders multiple workload groups from backend', async () => {
    renderComponent();
    expect(await screen.findByText('Group One')).toBeInTheDocument();
    expect(screen.getByText('Group Two')).toBeInTheDocument();
  });

  it('renders chart placeholders for each group', async () => {
    renderComponent();
    await waitFor(() => {
      const charts = screen.getAllByTestId('MockedChart');
      expect(charts.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('renders workload groups sorted by cpuUsage descending by default', async () => {
    renderComponent();
    await screen.findByText('Group One');

    const table = screen.getByTestId('workload-table');
    const rows = within(table).getAllByRole('row');
    const firstDataRow = rows[1];

    expect(firstDataRow.textContent).toContain('Group Two');
  });

  it('paginates correctly when more than 5 rows', async () => {
    renderComponent();

    // Confirm multiple groups are loaded
    await waitFor(() => {
      expect(screen.getByText('Group One')).toBeInTheDocument();
      expect(screen.getByText('Group Six')).toBeInTheDocument();
    });

    // Open the page size dropdown
    const pageSizeButton = screen.getByRole('button', { name: /Rows per page: 10/i });
    await userEvent.click(pageSizeButton);

    // Choose 5 rows
    const fiveRowsOption = await screen.findByText('5 rows');
    await userEvent.click(fiveRowsOption);

    // Wait and verify first page has 5 rows (1 header + 5 data)
    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(6);
    });
  });

  it('refresh button refetches data', async () => {
    renderComponent();
    await screen.findByText('Group One');

    const refreshBtn = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(mockCore.http.get).toHaveBeenCalledWith('/api/_wlm/stats');
    });
  });
});
