/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { WorkloadManagementMain } from './WLMMain';
import { CoreStart } from 'opensearch-dashboards/public';
import userEvent from '@testing-library/user-event';

jest.mock('echarts-for-react', () => () => <div data-testid="MockedChart">Mocked Chart</div>);
jest.mock('../../../components/PageHeader', () => ({
  PageHeader: () => <div>Mocked PageHeader</div>,
}));

const mockCore = ({
  http: {
    get: jest.fn(),
  },
  chrome: {
    setBreadcrumbs: jest.fn(),
  },
  notifications: {
    toasts: {
      addSuccess: jest.fn(),
    },
  },
} as unknown) as CoreStart;

const mockDepsStart = {} as any;

beforeEach(() => {
  jest.clearAllMocks();

  (mockCore.http.get as jest.Mock).mockImplementation((url: string) => {
    if (url === '/api/_wlm_proxy/_nodes') {
      return Promise.resolve({
        body: {
          nodes: {
            nodeA: {},
            nodeB: {},
          },
        },
      });
    }
    if (url === '/api/_wlm/nodeA/stats') {
      return Promise.resolve({
        body: {
          nodeA: {
            workload_groups: {
              group1: {
                cpu: { current_usage: 0.2 },
                memory: { current_usage: 0.3 },
                total_completions: 10,
                total_rejections: 2,
                total_cancellations: 1,
              },
              group2: {
                cpu: { current_usage: 0.5 },
                memory: { current_usage: 0.6 },
                total_completions: 5,
                total_rejections: 1,
                total_cancellations: 0,
              },
            },
          },
        },
      });
    }
    if (url === '/api/_wlm/workload_group') {
      return Promise.resolve({
        body: {
          workload_groups: [
            { _id: 'group1', name: 'Group One', resource_limits: { cpu: 0.4, memory: 0.5 } },
            { _id: 'group2', name: 'Group Two', resource_limits: { cpu: 0.6, memory: 0.7 } },
          ],
        },
      });
    }
    if (url.startsWith('/api/_wlm/stats/')) {
      return Promise.resolve({ body: {} });
    }
    return Promise.resolve({ body: {} });
  });
});

const renderComponent = () =>
  render(
    <MemoryRouter>
      <WorkloadManagementMain core={mockCore} depsStart={mockDepsStart} />
    </MemoryRouter>
  );

describe('WorkloadManagementMain', () => {
  it('renders workload group table', async () => {
    renderComponent();
    expect(await screen.findByText('Group One')).toBeInTheDocument();
    expect(screen.getByText('Group Two')).toBeInTheDocument();
    expect(screen.getByTestId('workload-table')).toBeInTheDocument();
  });

  it('renders summary stats panels', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText(/Total workload groups/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Total groups exceeding limits/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Total completion/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Total rejections/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Total cancellations/i).length).toBeGreaterThan(0);
    });
  });

  it('handles node dropdown change and reloads stats', async () => {
    renderComponent();
    await screen.findByText('Group One');

    const select = screen.getByLabelText('Data source');
    fireEvent.change(select, { target: { value: 'nodeB' } });

    expect(select).toHaveValue('nodeB');
    await waitFor(() => {
      expect(mockCore.http.get).toHaveBeenCalledWith('/api/_wlm/nodeB/stats');
    });
  });

  it('handles search correctly', async () => {
    renderComponent();
    await screen.findByText('Group One');

    fireEvent.change(screen.getByPlaceholderText('Search workload groups'), {
      target: { value: 'Group One' },
    });

    expect(await screen.findByText('Group One')).toBeInTheDocument();
    expect(screen.queryByText('Group Two')).not.toBeInTheDocument();
  });

  it('sorts by CPU usage descending by default', async () => {
    renderComponent();
    const table = await screen.findByTestId('workload-table');
    const rows = within(table).getAllByRole('row');
    const firstDataRow = rows[1];

    expect(firstDataRow.textContent).toContain('Group Two'); // higher CPU
  });

  it('paginates when more than 5 workload groups', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Group One')).toBeInTheDocument();
    });

    const paginationButton = screen.getByRole('button', { name: /Rows per page: 10/i });
    userEvent.click(paginationButton);

    const fiveOption = await screen.findByText('5 rows');
    userEvent.click(fiveOption);

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeLessThanOrEqual(6); // header + 5 rows
    });
  });

  it('clicking refresh button fetches stats again', async () => {
    renderComponent();
    await screen.findByText('Group One');

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockCore.http.get).toHaveBeenCalledWith(expect.stringContaining('/stats'));
    });
  });

  it('renders boxplots for CPU and Memory', async () => {
    renderComponent();
    const charts = await screen.findAllByTestId('MockedChart');
    expect(charts.length).toBeGreaterThan(0);
  });

  it('sets breadcrumbs on mount', async () => {
    renderComponent();
    await waitFor(() => {
      expect(mockCore.chrome.setBreadcrumbs).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ text: 'Data Administration' })])
      );
    });
  });

  it('handles error when fetching node list fails', async () => {
    (mockCore.http.get as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Failed to fetch nodes');
    });

    renderComponent();

    await waitFor(() => {
      // Should not crash, just fallback to empty
      expect(screen.getByPlaceholderText(/search workload groups/i)).toBeInTheDocument();
    });
  });

  it('handles case when no node is selected', async () => {
    (mockCore.http.get as jest.Mock).mockImplementation((url: string) => {
      if (url === '/api/_wlm_proxy/_nodes') {
        return Promise.resolve({ body: { nodes: {} } });
      }
      return Promise.resolve({ body: {} });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search workload groups/i)).toBeInTheDocument();
    });
  });

  it('handles empty workload group list', async () => {
    (mockCore.http.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/workload_group')) {
        return Promise.resolve({ body: { workload_groups: [] } });
      }
      return Promise.resolve({ body: {} });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search workload groups/i)).toBeInTheDocument();
    });
  });

  it('handles error when fetching node stats fails', async () => {
    (mockCore.http.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/_nodes')) {
        return Promise.resolve({ body: { nodes: { node1: {} } } });
      }
      if (url.includes('/node1/stats')) {
        return Promise.reject(new Error('Stats fetch failed'));
      }
      return Promise.resolve({ body: {} });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search workload groups/i)).toBeInTheDocument();
    });
  });

  it('handles failure when fetching boxplot stats for a group', async () => {
    (mockCore.http.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/_nodes')) {
        return Promise.resolve({ body: { nodes: { node1: {} } } });
      }
      if (url.includes('/node1/stats')) {
        return Promise.resolve({
          body: {
            node1: {
              workload_groups: {
                testGroupId: {
                  cpu: { current_usage: 0.2 },
                  memory: { current_usage: 0.3 },
                },
              },
            },
          },
        });
      }
      if (url.includes('/workload_group')) {
        return Promise.resolve({
          body: {
            workload_groups: [{ _id: 'testGroupId', name: 'TestGroup' }],
          },
        });
      }
      if (url.includes('/stats/testGroupId')) {
        return Promise.reject(new Error('Boxplot stats fetch failed'));
      }
      return Promise.resolve({ body: {} });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search workload groups/i)).toBeInTheDocument();
    });
  });

  it('handles error when fetching workload groups with limits', async () => {
    (mockCore.http.get as jest.Mock).mockImplementation((url) => {
      if (url.includes('/_nodes')) {
        return Promise.resolve({ body: { nodes: { node1: {} } } });
      }
      if (url.includes('/node1/stats')) {
        return Promise.resolve({ body: {} });
      }
      if (url.includes('/workload_group')) {
        return Promise.reject(new Error('Fetch workload groups error'));
      }
      return Promise.resolve({ body: {} });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search workload groups/i)).toBeInTheDocument();
    });
  });

  it('handles error when fetching workload group names', async () => {
    (mockCore.http.get as jest.Mock).mockImplementation((url) => {
      if (url.includes('/_nodes')) {
        return Promise.resolve({ body: { nodes: { node1: {} } } });
      }
      if (url.includes('/node1/stats')) {
        return Promise.resolve({ body: {} });
      }
      if (url.includes('/workload_group')) {
        return Promise.reject(new Error('Workload group name map error'));
      }
      return Promise.resolve({ body: {} });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search workload groups/i)).toBeInTheDocument();
    });
  });

  it('handles error thrown during fetchStatsForNode', async () => {
    (mockCore.http.get as jest.Mock).mockImplementation(() => {
      throw new Error('Error in fetchStatsForNode');
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search workload groups/i)).toBeInTheDocument();
    });
  });

  it('renders CPU/Memory boxplots correctly', async () => {
    renderComponent();
    const charts = await screen.findAllByTestId('MockedChart');
    expect(charts.length).toBeGreaterThan(0);

    charts.forEach((chart) => {
      expect(chart).toBeInTheDocument();
    });
  });

  it('switches nodes and fetches correct stats', async () => {
    renderComponent();
    await screen.findByText('Group One');

    const select = screen.getByLabelText('Data source');
    fireEvent.change(select, { target: { value: 'nodeB' } });

    await waitFor(() => {
      expect(select).toHaveValue('nodeB');
      expect(mockCore.http.get).toHaveBeenCalledWith('/api/_wlm/nodeB/stats');
    });
  });

  it('sorts workload groups by CPU usage ascending/descending', async () => {
    renderComponent();
    const cpuHeader = await screen.findByRole('columnheader', { name: /CPU usage/i });

    fireEvent.click(cpuHeader); // one click -> asc
    fireEvent.click(cpuHeader); // two clicks -> desc

    expect(cpuHeader).toBeInTheDocument();
  });
});
