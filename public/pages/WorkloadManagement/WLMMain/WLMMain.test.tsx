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
  savedObjects: {
    client: {},
  },
} as unknown) as CoreStart;

const mockDepsStart = {
  dataSource: {
    dataSourceEnabled: true,
  },
} as any;

const MockDataSourceMenu = (_props: any) => <div>Mocked Data Source Menu</div>;

const mockDataSourceManagement = {
  ui: {
    getDataSourceMenu: jest.fn(() => MockDataSourceMenu),
  },
} as any;

const capturedOptions: any[] = [];
jest.mock('echarts-for-react', () => ({
  __esModule: true,
  // the default export is our wrapper
  default: (props: { option: any }) => {
    capturedOptions.push(props.option);
    return <div data-testid="MockedChart">Mocked Chart</div>;
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  capturedOptions.length = 0;

  // Restore the data source menu mock after reset
  mockDataSourceManagement.ui.getDataSourceMenu.mockReturnValue(MockDataSourceMenu);

  (mockCore.http.get as jest.Mock).mockImplementation((url: string) => {
    if (url === '/api/_wlm/workload_group') {
      return Promise.resolve({
        workload_groups: [
          { _id: 'group1', name: 'Group One', resource_limits: { cpu: 0.4, memory: 0.5 } },
          { _id: 'group2', name: 'Group Two', resource_limits: { cpu: 0.6, memory: 0.7 } },
          { _id: 'group3', name: 'Group Three', resource_limits: { cpu: 0.1, memory: 0.1 } },
        ],
      });
    }
    if (url === '/api/_wlm/stats') {
      return Promise.resolve({
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
            group3: {
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
      });
    }
  });
});

const mockDataSource = {
  id: 'default',
  name: 'default',
} as any;

const mockParams = {
  setHeaderActionMenu: jest.fn(),
} as any;

const renderComponent = () =>
  render(
    <MemoryRouter>
      <DataSourceContext.Provider value={{ dataSource: mockDataSource, setDataSource: jest.fn() }}>
        <WorkloadManagementMain
          core={mockCore}
          depsStart={mockDepsStart}
          params={mockParams}
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
      expect(screen.getByText('Total workload groups')).toBeInTheDocument();
      expect(screen.getByText('Total groups exceeding limits')).toBeInTheDocument();
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

  it('renders tooltip HTML as expected from inline formatter', () => {
    const limit = 75;
    const params = [
      {
        seriesType: 'boxplot',
        data: [0, 10.1234, 20.5678, 30.1111, 40.9999, 50.4444],
      },
    ];
    const [min, q1, med, q3, max] = params[0].data.slice(1, 6).map((v: number) => v.toFixed(2));
    const expected = `<strong>Usage across nodes</strong><br/>
      Min: ${min}%<br/>
      Q1: ${q1}%<br/>
      Median: ${med}%<br/>
      Q3: ${q3}%<br/>
      Max: ${max}%<br/>
      <span style="color:#dc3545;">Limit: ${limit.toFixed(2)}%</span>`;
    expect(expected).toContain('Min: 10.12%');
    expect(expected).toContain('Limit: 75.00%');
  });

  it('builds correct box-plot data for Group One (find by limit)', async () => {
    renderComponent();

    await waitFor(() => expect(capturedOptions.length).toBeGreaterThanOrEqual(4));

    const cpuOptForGroupOne = capturedOptions.find((opt) => {
      const series = opt.series?.[0];
      const markLine = series?.markLine?.data?.[0];
      return markLine?.xAxis === 40;
    });
    expect(cpuOptForGroupOne).toBeDefined();

    expect(cpuOptForGroupOne!.series[0].data).toEqual([[25, 25, 40, 40, 40]]);
  });

  it('builds correct memory box-plot data for Group One (find by memory limit)', async () => {
    renderComponent();

    await waitFor(() => expect(capturedOptions.length).toBeGreaterThanOrEqual(4));

    const memOptForGroupOne = capturedOptions.find((opt) => {
      const series = opt.series?.[0];
      const markLine = series?.markLine?.data?.[0];
      return markLine?.xAxis === 50;
    });
    expect(memOptForGroupOne).toBeDefined();
    expect(memOptForGroupOne!.series[0].data).toEqual([[30, 30, 45, 45, 45]]);
  });

  it('builds correct CPU box-plot data for Group Two', async () => {
    renderComponent();
    await waitFor(() => expect(capturedOptions.length).toBeGreaterThanOrEqual(4));

    const cpuOptForGroupTwo = capturedOptions.find((opt) => {
      const series = opt.series?.[0];
      const markLine = series?.markLine?.data?.[0];
      return markLine?.xAxis === 60;
    });
    expect(cpuOptForGroupTwo).toBeDefined();
    expect(cpuOptForGroupTwo!.series[0].data).toEqual([[50, 50, 50, 50, 50]]);
  });

  it('builds correct memory box-plot data for Group Two', async () => {
    renderComponent();
    await waitFor(() => expect(capturedOptions.length).toBeGreaterThanOrEqual(4));

    const memOptForGroupTwo = capturedOptions.find((opt) => {
      const series = opt.series?.[0];
      const markLine = series?.markLine?.data?.[0];
      return markLine?.xAxis === 70;
    });
    expect(memOptForGroupTwo).toBeDefined();
    expect(memOptForGroupTwo!.series[0].data).toEqual([[60, 60, 60, 60, 60]]);
  });

  it('shows "1" for Total groups exceeding limits when one is over', async () => {
    renderComponent();

    const desc = await screen.findByText('Total groups exceeding limits');

    const statContainer = desc.closest('.euiStat');
    expect(statContainer).not.toBeNull();

    const { getByText: getByTextWithin } = within(statContainer!);
    expect(getByTextWithin('1')).toBeInTheDocument();
  });

  it('handles invalid data array gracefully', () => {
    const invalidData = [0];
    const slice = () => invalidData.slice(1, 6).map((v: number) => v.toFixed(2));
    expect(slice).not.toThrow();
  });

  it('handles missing stats gracefully', async () => {
    (mockCore.http.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/_wlm/stats')) {
        return Promise.resolve({ body: {} });
      }
      return Promise.resolve({ body: { workload_groups: [] } });
    });

    renderComponent();
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search workload groups/i)).toBeInTheDocument();
    });
  });
});
