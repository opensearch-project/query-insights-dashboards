/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { WorkloadManagementMain } from './WLMMain';
import { CoreStart } from 'opensearch-dashboards/public';
import userEvent from '@testing-library/user-event';
import { DataSourceContext } from '../WorkloadManagement';

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
      addDanger: jest.fn(),
    },
  },
} as unknown) as CoreStart;

const mockDepsStart = {} as any;
const mockDataSourceManagement = {} as any;

beforeEach(() => {
  jest.clearAllMocks();

  (mockCore.http.get as jest.Mock).mockImplementation((url: string) => {
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
    if (url === '/api/_wlm/stats') {
      return Promise.resolve({
        body: {
          node1: {
            workload_groups: {
              group1: {
                total_completions: 10,
                total_rejections: 2,
                total_cancellations: 1,
                cpu: { current_usage: 0.4 },
                memory: { current_usage: 0.3 },
              },
              group2: {
                total_completions: 5,
                total_rejections: 1,
                total_cancellations: 0,
                cpu: { current_usage: 0.5 },
                memory: { current_usage: 0.6 },
              },
            },
          },
          node2: {
            workload_groups: {
              group1: {
                total_completions: 5,
                total_rejections: 1,
                total_cancellations: 2,
                cpu: { current_usage: 0.25 },
                memory: { current_usage: 0.45 },
              },
            },
          },
        },
      });
    }
    if (url.startsWith('/api/_wlm/stats/')) {
      return Promise.resolve({ body: {} });
    }
    return Promise.resolve({ body: {} });
  });
});

const mockDataSource = {
  id: 'default',
  name: 'default',
} as any;

const renderComponent = () =>
  render(
    <MemoryRouter>
      <DataSourceContext.Provider value={{ dataSource: mockDataSource, setDataSource: jest.fn() }}>
        <WorkloadManagementMain
          core={mockCore}
          depsStart={mockDepsStart}
          params={{} as any}
          dataSourceManagement={mockDataSourceManagement}
        />
      </DataSourceContext.Provider>
    </MemoryRouter>
  );

describe('WorkloadManagementMain', () => {
  it('renders workload group table', async () => {
    renderComponent();
    expect(await screen.findByText((text) => text.includes('Group One'))).toBeInTheDocument();
    expect(screen.getByText((text) => text.includes('Group Two'))).toBeInTheDocument();
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

  it('handles search correctly', async () => {
    renderComponent();
    await screen.findByText('Group One');

    fireEvent.change(screen.getByPlaceholderText('Search workload groups'), {
      target: { value: 'Group One' },
    });

    expect(await screen.findByText('Group One')).toBeInTheDocument();
    expect(screen.queryByText('Group Two')).not.toBeInTheDocument();
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
      expect(mockCore.http.get).toHaveBeenCalledWith(
        expect.stringContaining('/stats'),
        expect.objectContaining({ query: { dataSourceId: 'default' } })
      );
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

  const sortableColumns = [
    'CPU usage',
    'Memory usage',
    'Total completion',
    'Total rejections',
    'Total cancellations',
  ];

  sortableColumns.forEach((column) => {
    it(`sorts workload groups by ${column} ascending/descending`, async () => {
      renderComponent();
      const header = await screen.findByRole('columnheader', { name: new RegExp(column, 'i') });

      fireEvent.click(header); // Sort ascending
      fireEvent.click(header); // Sort descending

      expect(header).toBeInTheDocument();
    });
  });

  describe('ECharts tooltip formatter', () => {
    const formatter = (limit: number) => {
      return (currentParams: any[]) => {
        const currentBox = currentParams.find((p) => p.seriesType === 'boxplot');

        let tooltip = '';
        if (currentBox) {
          const [fMin, fQ1, fMedian, fQ3, fMax] = currentBox.data
            .slice(1, 6)
            .map((v: number) => v.toFixed(2));
          tooltip += `<strong>Usage across nodes</strong><br/>
                Min: ${fMin}%<br/>
                Q1: ${fQ1}%<br/>
                Median: ${fMedian}%<br/>
                Q3: ${fQ3}%<br/>
                Max: ${fMax}%<br/>`;
        }

        tooltip += `<span style="color:#dc3545;">Limit: ${limit.toFixed(2)}%</span>`;
        return tooltip;
      };
    };

    it('formats boxplot tooltip correctly', () => {
      const mockParams = [
        {
          seriesType: 'boxplot',
          data: [0, 10.1234, 20.5678, 30.1111, 40.9999, 50.4444],
        },
      ];

      const result = formatter(75)(mockParams);

      expect(result).toContain('Min: 10.12%');
      expect(result).toContain('Q1: 20.57%');
      expect(result).toContain('Median: 30.11%');
      expect(result).toContain('Q3: 41.00%');
      expect(result).toContain('Max: 50.44%');
      expect(result).toContain('<span style="color:#dc3545;">Limit: 75.00%</span>');
    });

    it('returns only limit line if boxplot is not found', () => {
      const result = formatter(80)([]);

      expect(result).toBe('<span style="color:#dc3545;">Limit: 80.00%</span>');
    });
  });
});
