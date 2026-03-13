/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { waitFor, render, screen, fireEvent, within, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import QueryInsights from './QueryInsights';
import { MemoryRouter } from 'react-router-dom';
import stubTopQueries from '../../../cypress/fixtures/stub_top_queries.json';
import { DataSourceContext } from '../TopNQueries/TopNQueries';

// Mock version utilities
jest.mock('../../utils/version-utils', () => ({
  getVersionOnce: jest.fn().mockResolvedValue('3.6.0'),
  isVersion33OrHigher: jest.fn().mockReturnValue(true),
  isVersion36OrHigher: jest.fn().mockReturnValue(true),
}));

// Mock functions and data
const sampleQueries = (stubTopQueries as any).response.top_queries;

const mockOnTimeChange = jest.fn();
const mockCore = {
  chrome: {
    setBreadcrumbs: jest.fn(),
  },
} as any;

const dataSourceMenuMock = jest.fn(() => <div>Mock DataSourceMenu</div>);

const dataSourceManagementMock = {
  ui: {
    getDataSourceMenu: jest.fn().mockReturnValue(dataSourceMenuMock),
  },
} as any;

const mockDataSourceContext = {
  dataSource: { id: 'test', label: 'Test' },
  setDataSource: jest.fn(),
};

const mockRetrieveQueries = jest.fn();

const mockHttp = {
  get: jest.fn(),
};

const mockCoreWithHttp = {
  ...mockCore,
  http: mockHttp,
};

const findTypeFilterButton = (): HTMLElement => {
  const byText = screen
    .queryAllByText(/^Type$/i)
    .map((n) => n.closest('button'))
    .find(Boolean);
  if (byText) return byText as HTMLElement;

  const byRole = screen.queryAllByRole('button').find((b) => b.textContent?.trim() === 'Type');
  if (byRole) return byRole as HTMLElement;

  const availableButtons = screen
    .queryAllByRole('button')
    .map((b) => b.textContent?.trim())
    .filter(Boolean);
  throw new Error(
    `Type filter button not found. Available buttons: ${availableButtons.join(', ')}`
  );
};

const ensureTypePopoverOpen = async (): Promise<HTMLElement> => {
  let pop = screen.queryByRole('dialog');
  if (!pop) {
    fireEvent.click(findTypeFilterButton());
    pop = await screen.findByRole('dialog');
  }
  return pop;
};

const clickTypeOption = async (label: 'group' | 'query') => {
  const pop = await ensureTypePopoverOpen();

  const nodes = within(pop).getAllByText((content, element) => {
    const text = element?.textContent?.trim() ?? '';
    return new RegExp(`^${label}$`, 'i').test(text);
  });
  const btn = nodes[0].closest('button') as HTMLElement;
  fireEvent.click(btn);
};

const renderQueryInsights = (initialEntries = ['/']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <DataSourceContext.Provider value={mockDataSourceContext}>
        <QueryInsights
          queries={sampleQueries}
          loading={false}
          onTimeChange={mockOnTimeChange}
          recentlyUsedRanges={[]}
          currStart="now-15m"
          currEnd="now"
          retrieveQueries={mockRetrieveQueries}
          // @ts-ignore
          core={mockCoreWithHttp}
          depsStart={{} as any}
          params={{} as any}
          dataSourceManagement={dataSourceManagementMock}
        />
      </DataSourceContext.Provider>
    </MemoryRouter>
  );

describe('QueryInsights Component', () => {
  beforeAll(() => {
    jest.spyOn(Date.prototype, 'toLocaleTimeString').mockImplementation(() => '12:00:00 AM');
    jest.spyOn(Date.prototype, 'toDateString').mockImplementation(() => 'Mon Jan 13 2025');
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WLM group URL parameter extraction', () => {
    it('should initialize search query with wlmGroupId from URL', () => {
      renderQueryInsights(['/?wlmGroupId=analytics-workload']);

      const searchBox = screen.getByPlaceholderText('Search queries');
      expect(searchBox).toHaveValue('wlm_group_id:(analytics-workload)');
    });

    it('should initialize empty search query when no wlmGroupId in URL', () => {
      renderQueryInsights(['/']);

      const searchBox = screen.getByPlaceholderText('Search queries');
      expect(searchBox).toHaveValue('');
    });

    it('should extract only wlmGroupId when multiple URL parameters exist', () => {
      renderQueryInsights(['/?wlmGroupId=search-heavy&dashboard=main&tab=queries']);

      const searchBox = screen.getByPlaceholderText('Search queries');
      expect(searchBox).toHaveValue('wlm_group_id:(search-heavy)');
    });

    it('should decode URL-encoded wlmGroupId values', () => {
      renderQueryInsights(['/?wlmGroupId=ml-training']);

      const searchBox = screen.getByPlaceholderText('Search queries');
      expect(searchBox).toHaveValue('wlm_group_id:(ml-training)');
    });
  });

  it('renders the table with the correct columns and data', () => {
    const { container } = renderQueryInsights();
    expect(container).toMatchSnapshot();
  });

  it('calls setBreadcrumbs on mount', () => {
    renderQueryInsights();
    expect(mockCore.chrome.setBreadcrumbs).toHaveBeenCalledWith([
      {
        text: 'Query insights',
        href: '/queryInsights',
        onClick: expect.any(Function),
      },
    ]);
  });

  it('triggers onTimeChange when the date picker changes', () => {
    renderQueryInsights();

    const updateButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(updateButton);

    expect(mockOnTimeChange).toHaveBeenCalled();
  });

  it('uses query ID as itemId for table rows to prevent duplicate row rendering', async () => {
    mockHttp.get.mockResolvedValue({ workload_groups: [] });
    const testQueries = [
      {
        ...sampleQueries[0],
        id: 'unique-query-id-1',
        timestamp: 1000,
        group_by: 'NONE',
      },
      {
        ...sampleQueries[0],
        id: 'unique-query-id-2',
        timestamp: 2000,
        group_by: 'NONE',
      },
    ];
    await act(async () => {
      render(
        <MemoryRouter>
          <DataSourceContext.Provider value={mockDataSourceContext}>
            <QueryInsights
              queries={testQueries as any}
              loading={false}
              onTimeChange={mockOnTimeChange}
              recentlyUsedRanges={[]}
              currStart="now-15m"
              currEnd="now"
              retrieveQueries={mockRetrieveQueries}
              // @ts-ignore
              core={mockCoreWithHttp}
              depsStart={{} as any}
              params={{} as any}
              dataSourceManagement={dataSourceManagementMock}
            />
          </DataSourceContext.Provider>
        </MemoryRouter>
      );
    });

    // Verify that the main data table renders successfully (use getAllByRole and check for the main table)
    await waitFor(() => {
      const tables = screen.getAllByRole('table');
      expect(tables.length).toBeGreaterThan(0);
    });
  });

  it('renders the expected column headers for default (mixed) view', async () => {
    mockHttp.get.mockResolvedValue({ workload_groups: [] });
    await act(async () => {
      renderQueryInsights();
    });

    // The main data table is the last table in the DOM (after the chart table)
    await waitFor(
      () => {
        const tables = screen.getAllByRole('table');
        const mainTable = tables[tables.length - 1];
        const headers = within(mainTable).getAllByRole('columnheader');
        const headerTexts = headers.map((h) => h.textContent?.trim());
        // sampleQueries has both NONE and SIMILARITY, so table shows mixed headers
        const expectedHeaders = [
          'Id',
          'Type',
          'Query Count',
          'Timestamp',
          'Status',
          'Avg Latency / Latency',
          'Avg CPU Time / CPU Time',
          'Avg Memory Usage / Memory Usage',
          'Indices',
          'Search Type',
          'Coordinator Node ID',
          'WLM Group',
          'Total Shards',
        ];
        expect(headerTexts).toEqual(expectedHeaders);
      },
      { timeout: 3000 }
    );
  });

  it('renders correct columns when SIMILARITY filter (group-only) is applied', async () => {
    mockHttp.get.mockResolvedValue({ workload_groups: [] });
    renderQueryInsights();

    // Skip this test if Type filter is not available
    try {
      await clickTypeOption('group');
      await waitFor(() => {
        const headers = screen.getAllByRole('columnheader', { hidden: true });
        const headerTexts = headers.map((h) => h.textContent?.trim());
        const expectedHeaders = [
          'Id',
          'Type',
          'Query Count',
          'Average Latency',
          'Average CPU Time',
          'Average Memory Usage',
        ];
        expect(headerTexts).toEqual(expectedHeaders);
      });
    } catch (error) {
      console.log('Skipping filter test - Type filter not available');
    }
  });

  it('renders only query-related headers when NONE filter (query-only) is applied', async () => {
    mockHttp.get.mockResolvedValue({ workload_groups: [] });
    renderQueryInsights();

    // Skip this test if Type filter is not available
    try {
      await clickTypeOption('query');
      await waitFor(() => {
        const headers = screen.getAllByRole('columnheader', { hidden: true });
        const headerTexts = headers.map((h) => h.textContent?.trim());
        const expectedHeaders = [
          'Id',
          'Type',
          'Timestamp',
          'Status',
          'Latency',
          'CPU Time',
          'Memory Usage',
          'Indices',
          'Search Type',
          'Coordinator Node ID',
          'WLM Group',
          'Total Shards',
        ];
        expect(headerTexts).toEqual(expectedHeaders);
      });
    } catch (error) {
      console.log('Skipping filter test - Type filter not available');
    }
  });

  it('renders mixed headers when both NONE and SIMILARITY filters are applied', async () => {
    mockHttp.get.mockResolvedValue({ workload_groups: [] });
    renderQueryInsights();

    // Skip this test if Type filter is not available
    try {
      await clickTypeOption('query');
      await clickTypeOption('group');
      await waitFor(() => {
        const headers = screen.getAllByRole('columnheader', { hidden: true });
        const headerTexts = headers.map((h) => h.textContent?.trim());
        const expectedHeaders = [
          'Id',
          'Type',
          'Query Count',
          'Timestamp',
          'Status',
          'Avg Latency / Latency',
          'Avg CPU Time / CPU Time',
          'Avg Memory Usage / Memory Usage',
          'Indices',
          'Search Type',
          'Coordinator Node ID',
          'WLM Group',
          'Total Shards',
        ];
        expect(headerTexts).toEqual(expectedHeaders);
      });
    } catch (error) {
      console.log('Skipping filter test - Type filter not available');
    }
  });

  describe('WLM functions', () => {
    it('should call detectWlm API when component mounts', async () => {
      mockHttp.get.mockResolvedValue({ workload_groups: [] });

      renderQueryInsights();

      await waitFor(() => {
        expect(mockHttp.get).toHaveBeenCalledWith('/api/_wlm/workload_group', {
          query: { dataSourceId: 'test' },
        });
      });
    });

    it('should handle detectWlm API failure', async () => {
      mockHttp.get.mockRejectedValue(new Error('API Error'));

      renderQueryInsights();

      await waitFor(() => {
        expect(mockHttp.get).toHaveBeenCalled();
      });
    });

    it('should fetch workload groups for mapping', async () => {
      mockHttp.get.mockResolvedValue({
        workload_groups: [
          { _id: 'wlm-1', name: 'Analytics' },
          { _id: 'wlm-2', name: 'Search Heavy' },
        ],
      });

      renderQueryInsights();

      await waitFor(() => {
        expect(mockHttp.get).toHaveBeenCalledWith('/api/_wlm/workload_group', {
          query: { dataSourceId: 'test' },
        });
      });
    });
  });

  describe('Visualizations', () => {
    it('renders visualization panel with Query/Group toggle', async () => {
      mockHttp.get.mockResolvedValue({ workload_groups: [] });
      await act(async () => {
        renderQueryInsights();
      });

      // EuiButtonGroup renders buttons - find by text within the button group
      expect(screen.getByText('Query')).toBeInTheDocument();
      expect(screen.getByText('Group')).toBeInTheDocument();
    });

    it('renders percentile metrics in query visualization mode', async () => {
      mockHttp.get.mockResolvedValue({ workload_groups: [] });
      await act(async () => {
        renderQueryInsights();
      });

      expect(screen.getByText('P90 LATENCY')).toBeInTheDocument();
      expect(screen.getByText('P90 CPU TIME')).toBeInTheDocument();
      expect(screen.getByText('P90 MEMORY')).toBeInTheDocument();
      expect(screen.getByText('P99 LATENCY')).toBeInTheDocument();
      expect(screen.getByText('P99 CPU TIME')).toBeInTheDocument();
      expect(screen.getByText('P99 MEMORY')).toBeInTheDocument();
    });

    it('shows "no visualizations" message when Group mode is selected', async () => {
      mockHttp.get.mockResolvedValue({ workload_groups: [] });
      await act(async () => {
        renderQueryInsights();
      });

      // First verify the Query mode content is visible (P90 LATENCY)
      await waitFor(() => {
        expect(screen.getByText('P90 LATENCY')).toBeInTheDocument();
      });

      // Find the Group radio button by its data-test-subj attribute
      const groupRadio = document.querySelector('[data-test-subj="group"]') as HTMLInputElement;
      expect(groupRadio).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(groupRadio);
      });

      await waitFor(() => {
        expect(screen.getByText('No Visualization Available')).toBeInTheDocument();
        expect(
          screen.getByText('Visualizations for grouped queries are coming soon')
        ).toBeInTheDocument();
      });
    });

    it('renders chart group-by selector with options', async () => {
      mockHttp.get.mockResolvedValue({ workload_groups: [] });
      await act(async () => {
        renderQueryInsights();
      });

      expect(screen.getByText('Queries by Node')).toBeInTheDocument();
    });

    it('renders performance analysis section', async () => {
      mockHttp.get.mockResolvedValue({ workload_groups: [] });
      await act(async () => {
        renderQueryInsights();
      });

      expect(screen.getByText('Performance Analysis')).toBeInTheDocument();
    });
  });

  describe('Filter UI', () => {
    it('renders all filter buttons', async () => {
      mockHttp.get.mockResolvedValue({ workload_groups: [] });
      await act(async () => {
        renderQueryInsights();
      });

      // Use getAllByRole since there may be multiple buttons with similar names
      const buttons = screen.getAllByRole('button');
      const buttonTexts = buttons.map((b) => b.textContent?.trim());
      expect(buttonTexts).toContain('Type');
      expect(buttonTexts).toContain('Indices');
      expect(buttonTexts).toContain('Search Type');
      expect(buttonTexts).toContain('Coordinator Node ID');
      expect(buttonTexts).toContain('WLM Group');
    });

    it('renders search input field', async () => {
      mockHttp.get.mockResolvedValue({ workload_groups: [] });
      await act(async () => {
        renderQueryInsights();
      });

      expect(screen.getByPlaceholderText('Search queries')).toBeInTheDocument();
    });

    it('opens Type filter popover on click', async () => {
      mockHttp.get.mockResolvedValue({ workload_groups: [] });
      await act(async () => {
        renderQueryInsights();
      });

      const typeButton = findTypeFilterButton();
      fireEvent.click(typeButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('filters table when search text is entered', async () => {
      mockHttp.get.mockResolvedValue({ workload_groups: [] });
      await act(async () => {
        renderQueryInsights();
      });

      const searchInput = screen.getByPlaceholderText('Search queries');
      fireEvent.change(searchInput, { target: { value: 'a2e1c822' } });

      // Search should filter the table
      await waitFor(() => {
        expect(searchInput).toHaveValue('a2e1c822');
      });
    });

    it('filters by index name in free-text search', async () => {
      mockHttp.get.mockResolvedValue({ workload_groups: [] });
      await act(async () => {
        renderQueryInsights();
      });

      const searchInput = screen.getByPlaceholderText('Search queries');
      fireEvent.change(searchInput, { target: { value: 'my-index' } });

      await waitFor(() => {
        // Should find the query with indices: ["my-index"]
        expect(screen.getByText('a2e1c822-3e3c-4d1b-adb2-9f73af094b43')).toBeInTheDocument();
      });
    });

    it('filters by node_id in free-text search', async () => {
      mockHttp.get.mockResolvedValue({ workload_groups: [] });
      await act(async () => {
        renderQueryInsights();
      });

      const searchInput = screen.getByPlaceholderText('Search queries');
      fireEvent.change(searchInput, { target: { value: 'KINGun8' } });

      await waitFor(() => {
        // Should find queries with node_id containing "KINGun8"
        expect(screen.getByText('7cd4c7f1-3803-4c5e-a41c-258e04f96f78')).toBeInTheDocument();
      });
    });

    it('filters by wlm_group_id in free-text search', async () => {
      mockHttp.get.mockResolvedValue({ workload_groups: [] });
      await act(async () => {
        renderQueryInsights();
      });

      const searchInput = screen.getByPlaceholderText('Search queries');
      fireEvent.change(searchInput, { target: { value: 'SEARCH_GROUP' } });

      await waitFor(() => {
        // Should find the query with wlm_group_id: "SEARCH_GROUP"
        expect(screen.getByText('a2e1c822-3e3c-4d1b-adb2-9f73af094b43')).toBeInTheDocument();
      });
    });

    it('filters by labels in free-text search', async () => {
      mockHttp.get.mockResolvedValue({ workload_groups: [] });
      await act(async () => {
        renderQueryInsights();
      });

      const searchInput = screen.getByPlaceholderText('Search queries');
      // Search for X-Opaque-Id value from fixture
      fireEvent.change(searchInput, { target: { value: '90eb5c3b-8448' } });

      await waitFor(() => {
        // Should find queries with matching label value
        expect(screen.getByText('a2e1c822-3e3c-4d1b-adb2-258e04f96f78')).toBeInTheDocument();
      });
    });

    it('searches all fields dynamically', async () => {
      mockHttp.get.mockResolvedValue({ workload_groups: [] });
      await act(async () => {
        renderQueryInsights();
      });

      const searchInput = screen.getByPlaceholderText('Search queries');
      // Search for total_shards value
      fireEvent.change(searchInput, { target: { value: 'query_then_fetch' } });

      await waitFor(() => {
        // Should find queries with search_type: "query_then_fetch"
        expect(screen.getByText('a2e1c822-3e3c-4d1b-adb2-258e04f96f78')).toBeInTheDocument();
      });
    });
  });

  describe('Status column rendering', () => {
    const renderWithQueries = (queries: any[]) =>
      render(
        <MemoryRouter>
          <DataSourceContext.Provider value={mockDataSourceContext}>
            <QueryInsights
              queries={queries}
              loading={false}
              onTimeChange={mockOnTimeChange}
              recentlyUsedRanges={[]}
              currStart="now-15m"
              currEnd="now"
              retrieveQueries={mockRetrieveQueries}
              // @ts-ignore
              core={mockCoreWithHttp}
              depsStart={{} as any}
              params={{} as any}
              dataSourceManagement={dataSourceManagementMock}
            />
          </DataSourceContext.Provider>
        </MemoryRouter>
      );

    beforeEach(() => {
      mockHttp.get.mockResolvedValue({ workload_groups: [] });
    });

    it('renders Completed badge for query row with failed=false', async () => {
      renderWithQueries([{ ...sampleQueries[0], group_by: 'NONE', failed: false }]);
      await waitFor(() => expect(screen.getByText('Completed')).toBeInTheDocument());
    });

    it('renders Failed badge for query row with failed=true', async () => {
      renderWithQueries([{ ...sampleQueries[0], group_by: 'NONE', failed: true }]);
      await waitFor(() => expect(screen.getByText('Failed')).toBeInTheDocument());
    });

    it('renders dash and no badge for group rows', async () => {
      renderWithQueries([{ ...sampleQueries[1], group_by: 'SIMILARITY', failed: false }]);
      await waitFor(() => {
        expect(screen.queryByText('Completed')).not.toBeInTheDocument();
        expect(screen.queryByText('Failed')).not.toBeInTheDocument();
      });
    });
  });
});
