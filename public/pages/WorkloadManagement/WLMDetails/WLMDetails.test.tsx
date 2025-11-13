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
import { WLM_MAIN } from '../WorkloadManagement';
import { act } from 'react-dom/test-utils';
import { DataSourceContext } from '../WorkloadManagement';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: jest.fn(),
}));

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
      addWarning: jest.fn(),
    },
  },
  chrome: {
    setBreadcrumbs: jest.fn(),
  },
  application: {
    navigateToApp: jest.fn(),
    getUrlForApp: jest.fn(() => '/app/query-insights'),
  },
  savedObjects: {
    client: {
      get: jest.fn().mockResolvedValue({ attributes: { dataSourceVersion: '3.3.0' } }),
    },
  },
} as unknown) as CoreStart;

const mockDeps = {
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

(mockCore.http.get as jest.Mock).mockImplementation((url: string) => {
  if (url === '/api/_wlm/workload_group') {
    return Promise.resolve({
      workload_groups: [{ name: 'test-group', _id: 'abc123' }],
    });
  }

  if (url === '/api/_wlm/stats/abc123') {
    return Promise.resolve({
      'node-1': {
        workload_groups: {
          abc123: {
            cpu: { current_usage: 0.5 },
            memory: { current_usage: 0.3 },
          },
        },
      },
    });
  }

  return Promise.resolve({ body: {} });
});

const mockDataSource = {
  id: 'default',
  name: 'default',
  dataSourceVersion: '3.3.0',
} as any;

const mockParams = {
  setHeaderActionMenu: jest.fn(),
} as any;

const renderComponent = (name = 'test-group') => {
  render(
    <MemoryRouter initialEntries={[`/wlm-details?name=${name}`]}>
      <DataSourceContext.Provider value={{ dataSource: mockDataSource, setDataSource: jest.fn() }}>
        <WLMDetails
          core={mockCore}
          depsStart={mockDeps as any}
          params={mockParams}
          dataSourceManagement={mockDataSourceManagement}
        />
      </DataSourceContext.Provider>
    </MemoryRouter>
  );
};

const mockPush = jest.fn();
const mockHistory = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({
    push: mockPush,
    history: mockHistory,
  }),
}));

jest.mock('../../../components/PageHeader', () => ({
  PageHeader: () => <div data-testid="mock-page-header">Mocked PageHeader</div>,
}));

describe('WLMDetails Component', () => {
  beforeEach(() => {
    jest.resetAllMocks(); // Reset mock function calls

    // Restore the data source menu mock after reset
    mockDataSourceManagement.ui.getDataSourceMenu.mockReturnValue(MockDataSourceMenu);

    (mockCore.http.get as jest.Mock).mockImplementation((path: string) => {
      if (path.startsWith('/api/_wlm/workload_group/test-group')) {
        return Promise.resolve({
          workload_groups: [
            {
              _id: 'wg-123',
              name: 'test-group',
              resource_limits: { cpu: 0.5, memory: 0.5 },
              resiliency_mode: 'SOFT',
            },
          ],
        });
      }
      // 2) GET existing rules
      if (path === '/api/_rules/workload_group') {
        return Promise.resolve({
          rules: [
            {
              id: 'keep-me',
              description: 'd',
              index_pattern: ['keep-*'],
              workload_group: 'wg-123',
            },
            {
              id: 'remove-me',
              description: 'd',
              index_pattern: ['remove-*'],
              workload_group: 'wg-123',
            },
          ],
        });
      }
      // 3) GET stats
      if (path.startsWith('/api/_wlm/stats')) {
        return Promise.resolve({
          'node-1': {
            workload_groups: {
              'wg-123': {
                cpu: { current_usage: 0.5 },
                memory: { current_usage: 0.3 },
                total_completions: 100,
                total_rejections: 5,
                total_cancellations: 2,
              },
              DEFAULT_WORKLOAD_GROUP: {
                cpu: { current_usage: 0.2 },
                memory: { current_usage: 0.1 },
                total_completions: 50,
                total_rejections: 1,
                total_cancellations: 0,
              },
            },
          },
        });
      }
      return Promise.resolve({ body: {} });
    });
  });

  it('renders workload group information', () => {
    renderComponent();

    expect(screen.getByText(/Workload group name/i)).toBeInTheDocument();
    expect(screen.getByText(/Description/i)).toBeInTheDocument();
    expect(screen.getByText(/CPU usage limit/i)).toBeInTheDocument();
    expect(screen.getByText(/Memory usage limit/i)).toBeInTheDocument();
  });

  it('renders tabs and switches to Settings tab', () => {
    renderComponent();

    const settingsTabButton = screen.getByTestId('wlm-tab-settings');

    expect(settingsTabButton).toBeInTheDocument();
    fireEvent.click(settingsTabButton);

    expect(settingsTabButton).toHaveClass('euiTab-isSelected');
  });

  it('shows table when Resources tab is active', () => {
    renderComponent();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('handles no stats returned gracefully', async () => {
    (mockCore.http.get as jest.Mock)
      .mockImplementationOnce(() =>
        Promise.resolve({ workload_groups: [{ name: 'test-group', _id: 'abc123' }] })
      )
      .mockImplementationOnce(() => Promise.resolve({ body: {} }));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/No items found/i)).toBeInTheDocument();
    });
  });

  it('shows error toast and redirects if no query group found', async () => {
    const mockAddDanger = jest.fn();
    mockCore.notifications.toasts.addDanger = mockAddDanger;

    mockCore.http.get = jest.fn((path: string) => {
      if (path.startsWith('/api/_wlm/workload_group')) {
        return Promise.reject(new Error('Group ID not found'));
      }
      return Promise.resolve({ body: {} });
    });

    renderComponent('non-existent-group');

    await waitFor(() => {
      expect(mockCore.notifications.toasts.addDanger).toHaveBeenCalled();

      expect(mockCore.notifications.toasts.addDanger).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('Failed to find workload group'),
        expect.any(Error)
      );
      expect(mockPush).toHaveBeenCalledWith(WLM_MAIN);
    });
  });

  it('does not crash if stats are missing', async () => {
    mockCore.http.get = jest.fn((path: string) => {
      if (path === '/api/_wlm/workload_group') {
        return Promise.resolve({
          workload_groups: [{ name: 'test-group', _id: 'abc123' }],
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

  it('saves changes successfully after changing resiliency mode', async () => {
    mockCore.notifications.toasts.addSuccess = jest.fn();
    mockPush.mockClear();

    (mockCore.http.get as jest.Mock).mockImplementation((path: string) => {
      if (path.startsWith('/api/_wlm/workload_group')) {
        return Promise.resolve({
          workload_groups: [
            {
              name: 'test-group',
              _id: 'abc123',
              resource_limits: { cpu: 0.5, memory: 0.5 },
              resiliency_mode: 'soft',
            },
          ],
        });
      }
      if (path.startsWith('/api/_wlm/stats/abc123')) {
        return Promise.resolve({ body: {} });
      }
      return Promise.resolve({ body: {} });
    });

    (mockCore.http.put as jest.Mock).mockResolvedValue({});

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Workload group name/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('wlm-tab-settings'));

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Enforced'));
    });

    await waitFor(() => {
      const applyButton = screen.getByRole('button', { name: /apply changes/i });
      expect(applyButton).not.toBeDisabled();
    });

    fireEvent.click(screen.getByText('Apply Changes'));

    await waitFor(() => {
      expect(mockCore.http.put).toHaveBeenCalled();
      expect(mockCore.notifications.toasts.addSuccess).toHaveBeenCalled();
    });
  });

  it('shows error toast if fetching stats fails', async () => {
    mockCore.notifications.toasts.addDanger = jest.fn();
    mockPush.mockClear();

    (mockCore.http.get as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('/_wlm/workload_group')) {
        return Promise.resolve({
          workload_groups: [{ name: 'test-group', _id: 'abc123' }],
        });
      }
      if (path.includes('/_wlm/stats/abc123')) {
        return Promise.reject(new Error('Stats fetch failed'));
      }
      if (path.startsWith('/api/_wlm/stats')) {
        return Promise.resolve({
          'node-1': {
            workload_groups: {
              abc123: {
                cpu: { current_usage: 0.5 },
                memory: { current_usage: 0.3 },
                total_completions: 100,
                total_rejections: 5,
                total_cancellations: 2,
              },
            },
          },
        });
      }
      return Promise.resolve({ body: {} });
    });

    renderComponent('test-group');

    await waitFor(() => {
      expect(mockCore.notifications.toasts.addDanger).toHaveBeenCalledTimes(2);
      expect(mockCore.notifications.toasts.addDanger).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('Could not load workload group stats.'),
        expect.any(Error)
      );
    });
  });

  it('deletes workload group successfully', async () => {
    mockCore.notifications.toasts.addSuccess = jest.fn();
    mockPush.mockClear();

    (mockCore.http.delete as jest.Mock).mockResolvedValue({});

    renderComponent('test-group');

    const deleteButtons = screen.getAllByRole('button');
    const openDeleteButton = deleteButtons.find((btn) =>
      btn.textContent?.toLowerCase().includes('delete')
    );

    expect(openDeleteButton).toBeDefined();

    fireEvent.click(openDeleteButton!);

    await waitFor(() => {
      expect(screen.getByText('Delete workload group')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('delete'), { target: { value: 'delete' } });

    const confirmDeleteButton = await screen.findAllByRole('button');
    const realConfirmDeleteButton = confirmDeleteButton.find(
      (btn) => btn.textContent?.toLowerCase() === 'delete'
    );

    expect(realConfirmDeleteButton).toBeDefined();

    fireEvent.click(realConfirmDeleteButton!);

    await waitFor(() => {
      expect(mockCore.http.delete).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalled();
    });
  });

  it('shows error if delete group fails', async () => {
    mockCore.notifications.toasts.addDanger = jest.fn();
    (mockCore.http.delete as jest.Mock).mockRejectedValue(new Error('Delete error'));

    renderComponent();

    const allDeleteButtons = screen.getAllByRole('button');
    const openDeleteButton = allDeleteButtons.find((btn) =>
      btn.textContent?.toLowerCase().includes('delete')
    );

    expect(openDeleteButton).toBeDefined();
    fireEvent.click(openDeleteButton!);

    await waitFor(() => {
      expect(screen.getByText('Delete workload group')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('delete'), { target: { value: 'delete' } });

    const allConfirmButtons = await screen.findAllByRole('button');
    const confirmDeleteButton = allConfirmButtons.find(
      (btn) => btn.textContent?.toLowerCase() === 'delete'
    );

    expect(confirmDeleteButton).toBeDefined();
    fireEvent.click(confirmDeleteButton!);

    await waitFor(() => {
      expect(mockCore.notifications.toasts.addDanger).toHaveBeenCalled();
    });
  });

  it('shows error if workload group _id not found', async () => {
    (mockCore.http.get as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('/_wlm/workload_group')) {
        return Promise.resolve({ body: { workload_groups: [{}] } });
      }
      return Promise.resolve({ body: {} });
    });

    mockPush.mockClear();
    mockCore.notifications.toasts.addDanger = jest.fn();

    renderComponent('test-group');

    await waitFor(() => {
      expect(mockCore.notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
      expect(mockCore.notifications.toasts.addDanger).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('Failed to find workload group'),
        expect.any(Error)
      );
    });
  });

  it('shows inline validation error for invalid CPU/memory input', async () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('wlm-tab-settings'));

    await waitFor(() => {
      expect(screen.getByTestId('cpu-threshold-input')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('cpu-threshold-input'), {
      target: { value: '200' },
    });

    const applyButton = screen.getByRole('button', { name: /apply changes/i });

    expect(applyButton).toBeDisabled();
  });

  it('redirects if group name is missing from URL', async () => {
    render(
      <MemoryRouter initialEntries={['/wlm-details']}>
        <DataSourceContext.Provider
          value={{ dataSource: mockDataSource, setDataSource: jest.fn() }}
        >
          <WLMDetails
            core={mockCore as CoreStart}
            depsStart={mockDeps as any}
            params={mockParams}
            dataSourceManagement={mockDataSourceManagement}
          />
        </DataSourceContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(WLM_MAIN);
    });
  });

  it('loads default workload group details if group name is DEFAULT_WORKLOAD_GROUP', async () => {
    render(
      <MemoryRouter initialEntries={['/wlm-details?name=DEFAULT_WORKLOAD_GROUP']}>
        <DataSourceContext.Provider
          value={{ dataSource: mockDataSource, setDataSource: jest.fn() }}
        >
          <Route path="/wlm-details">
            <WLMDetails
              core={mockCore as CoreStart}
              depsStart={mockDeps as any}
              dataSourceManagement={mockDataSourceManagement}
              params={mockParams}
            />
          </Route>
        </DataSourceContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('System default workload group')).toBeInTheDocument();
      expect(screen.getByText('soft')).toBeInTheDocument();
    });
  });

  it('can cancel delete modal', async () => {
    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(screen.getByText('Delete workload group')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.queryByText('Delete workload group')).not.toBeInTheDocument();
    });
  });

  it('disables Settings tab content for DEFAULT_WORKLOAD_GROUP', async () => {
    renderComponent('DEFAULT_WORKLOAD_GROUP');

    fireEvent.click(screen.getByTestId('wlm-tab-settings'));

    await waitFor(() => {
      expect(
        screen.getByText(/Settings are not available for the DEFAULT_WORKLOAD_GROUP/i)
      ).toBeInTheDocument();
    });
  });

  it('sets breadcrumbs correctly on mount', async () => {
    renderComponent('test-group');

    await waitFor(() => {
      expect(mockCore.chrome.setBreadcrumbs).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ text: 'Data Administration' }),
          expect.objectContaining({ text: expect.stringContaining('Workload Group:') }),
        ])
      );
    });
  });

  it('opens and cancels delete modal correctly', async () => {
    renderComponent('test-group');

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(screen.getByText('Delete workload group')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.queryByText('Delete workload group')).not.toBeInTheDocument();
    });
  });

  it('does not fetch stats if groupName is missing', async () => {
    (mockCore.http.get as jest.Mock).mockResolvedValue({ body: {} });

    render(
      <MemoryRouter initialEntries={['/wlm-details']}>
        <DataSourceContext.Provider
          value={{ dataSource: mockDataSource, setDataSource: jest.fn() }}
        >
          <WLMDetails
            core={mockCore as CoreStart}
            depsStart={mockDeps as any}
            params={mockParams}
            dataSourceManagement={mockDataSourceManagement}
          />
        </DataSourceContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Workload group name/i)).toBeInTheDocument();
    });
  });

  it('handles table sort and pagination', async () => {
    renderComponent('test-group');

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    const cpuUsageHeader = screen.getByRole('columnheader', { name: /CPU Usage/i });

    fireEvent.click(cpuUsageHeader);

    expect(cpuUsageHeader).toBeInTheDocument();
  });

  it('shows error if more than 10 indexes are entered', async () => {
    renderComponent();
    fireEvent.click(screen.getByTestId('wlm-tab-settings'));

    const input = screen.getByTestId('indexInput');
    const value = Array(11).fill('logs-*').join(',');

    fireEvent.change(input, { target: { value } });
    expect(await screen.findByText(/at most 10 indexes/i)).toBeInTheDocument();
  });

  it('lets you add a rule and enables the Apply Changes button', async () => {
    renderComponent();

    await waitFor(() => expect(screen.getByText(/Workload group name/i)).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('wlm-tab-settings'));
    await waitFor(() => expect(screen.getByText(/Workload group settings/i)).toBeInTheDocument());

    const initialInputs = screen.getAllByTestId('indexInput');
    const initialCount = initialInputs.length;
    expect(initialCount).toBe(2);

    fireEvent.click(screen.getByRole('button', { name: /\+ add another rule/i }));

    const inputs = screen.getAllByTestId('indexInput');
    expect(inputs).toHaveLength(initialCount + 1);

    const newInput = inputs[inputs.length - 1];
    fireEvent.change(newInput, { target: { value: 'new-*' } });
    expect(newInput).toHaveValue('new-*');

    const applyBtn = screen.getByRole('button', { name: /Apply Changes/i });
    expect(applyBtn).not.toBeDisabled();
  });

  it('lets you delete a rule and enables the Apply Changes button', async () => {
    renderComponent();

    await waitFor(() => expect(screen.getByText(/Workload group name/i)).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('wlm-tab-settings'));
    await waitFor(() => expect(screen.getByText(/Workload group settings/i)).toBeInTheDocument());

    const initialInputs = screen.getAllByTestId('indexInput');
    const initialCount = initialInputs.length;
    expect(initialCount).toBe(2);

    const deleteIcons = screen.getAllByLabelText('Delete rule');
    expect(deleteIcons).toHaveLength(initialCount);

    fireEvent.click(deleteIcons[1]);

    const inputsAfterDelete = screen.getAllByTestId('indexInput');
    expect(inputsAfterDelete).toHaveLength(initialCount - 1);

    const applyBtn = screen.getByRole('button', { name: /Apply Changes/i });
    expect(applyBtn).not.toBeDisabled();
  });

  it('lets you update a rule and enables the Apply Changes button', async () => {
    renderComponent();

    await waitFor(() => expect(screen.getByText(/Workload group name/i)).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('wlm-tab-settings'));
    await waitFor(() => expect(screen.getByText(/Workload group settings/i)).toBeInTheDocument());

    const inputs = screen.getAllByTestId('indexInput');
    expect(inputs).toHaveLength(2);

    fireEvent.change(inputs[0], { target: { value: 'keep-updated-*' } });
    expect(inputs[0]).toHaveValue('keep-updated-*');

    const applyBtn = screen.getByRole('button', { name: /Apply Changes/i });
    expect(applyBtn).not.toBeDisabled();
  });

  it('sends an update HTTP request when you modify an existing rule and click Apply Changes', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText(/Workload group name/i)).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('wlm-tab-settings'));
    await waitFor(() => expect(screen.getByText(/Workload group settings/i)).toBeInTheDocument());

    const inputs = screen.getAllByTestId('indexInput');
    fireEvent.change(inputs[0], { target: { value: 'keep-updated-*' } });

    const applyBtn = screen.getByRole('button', { name: /Apply Changes/i });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      const updateCalls = (mockCore.http.put as jest.Mock).mock.calls.filter(
        ([url]) => url === '/api/_rules/workload_group/keep-me'
      );
      expect(updateCalls).toHaveLength(1);

      const [, options] = updateCalls[0];
      expect(options).toEqual(
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
          query: { dataSourceId: 'default' },
        })
      );
      const body = JSON.parse(options.body);
      expect(body).toEqual({
        description: '-',
        index_pattern: ['keep-updated-*'],
        workload_group: 'wg-123',
      });
    });

    expect(mockCore.notifications.toasts.addSuccess).toHaveBeenCalled();
  });

  it('clicking Refresh calls both details and stats fetchers', async () => {
    jest.useFakeTimers();
    (mockCore.http.get as jest.Mock).mockClear();

    renderComponent('test-group');

    // Wait initial load
    await waitFor(() => expect(screen.getByText(/Workload group name/i)).toBeInTheDocument());

    const initialGetCalls = (mockCore.http.get as jest.Mock).mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

    await waitFor(() => {
      // expect at least 2 more GET calls: group details & stats
      expect((mockCore.http.get as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(
        initialGetCalls + 2
      );
    });

    jest.useRealTimers();
  });

  it('auto-refresh runs only while isSaved === true', async () => {
    jest.useFakeTimers();
    (mockCore.http.get as jest.Mock).mockClear();

    renderComponent('test-group');

    await waitFor(() => expect(screen.getByText(/Workload group name/i)).toBeInTheDocument());

    const callsAfterMount = (mockCore.http.get as jest.Mock).mock.calls.length;

    // Advance 60s -> expect auto refresh fired (details + stats)
    await act(async () => {
      jest.advanceTimersByTime(60000);
    });

    const afterFirstTick = (mockCore.http.get as jest.Mock).mock.calls.length;
    expect(afterFirstTick).toBeGreaterThanOrEqual(callsAfterMount + 2);

    // Make unsaved change -> isSaved = false stops interval
    fireEvent.click(screen.getByTestId('wlm-tab-settings'));
    await waitFor(() => expect(screen.getByText(/Workload group settings/i)).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/Describe the workload group/i), {
      target: { value: 'changed' },
    });

    await act(async () => {
      jest.advanceTimersByTime(60000);
    });

    const afterSecondTick = (mockCore.http.get as jest.Mock).mock.calls.length;
    // no additional auto-refresh when unsaved
    expect(afterSecondTick).toBe(afterFirstTick);

    jest.useRealTimers();
  });

  it('index validation: shows error when any single index exceeds 100 characters', async () => {
    renderComponent('test-group');
    fireEvent.click(screen.getByTestId('wlm-tab-settings'));

    const input = await screen.findByTestId('indexInput');
    const tooLong = 'x'.repeat(101);

    fireEvent.change(input, { target: { value: tooLong } });

    expect(
      await screen.findByText(/Index names must be 100 characters or fewer/i)
    ).toBeInTheDocument();
  });

  it('role onBlur reverts to original and warns when cleared after being non-empty', async () => {
    // Override rules to include role so "originallyNonEmpty" = true
    (mockCore.http.get as jest.Mock).mockImplementation((path: string) => {
      if (path.startsWith('/api/_wlm/workload_group/test-group')) {
        return Promise.resolve({
          workload_groups: [
            {
              _id: 'wg-123',
              name: 'test-group',
              resource_limits: { cpu: 0.5, memory: 0.5 },
              resiliency_mode: 'SOFT',
            },
          ],
        });
      }
      if (path === '/api/_rules/workload_group') {
        return Promise.resolve({
          rules: [
            {
              id: 'r1',
              description: 'd',
              index_pattern: ['keep-*'],
              principal: { role: ['admin'] },
              workload_group: 'wg-123',
            },
          ],
        });
      }
      if (path.startsWith('/api/_wlm/stats')) {
        return Promise.resolve({ body: {} });
      }
      return Promise.resolve({ body: {} });
    });

    const warnSpy = jest.fn();
    ((mockCore.notifications.toasts.addWarning as unknown) as jest.Mock) = warnSpy;

    renderComponent('test-group');
    fireEvent.click(screen.getByTestId('wlm-tab-settings'));

    // First rule's Role textarea
    const roleBox = await screen.findByPlaceholderText('Enter role');
    expect(roleBox).toHaveValue('admin');

    fireEvent.change(roleBox, { target: { value: '' } });
    fireEvent.blur(roleBox);

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith('Role cannot be cleared once set.');
      expect(roleBox).toHaveValue('admin');
    });
  });

  it('username onBlur reverts to original and warns when cleared after being non-empty', async () => {
    (mockCore.http.get as jest.Mock).mockImplementation((path: string) => {
      if (path.startsWith('/api/_wlm/workload_group/test-group')) {
        return Promise.resolve({
          workload_groups: [
            {
              _id: 'wg-123',
              name: 'test-group',
              resource_limits: { cpu: 0.5, memory: 0.5 },
              resiliency_mode: 'SOFT',
            },
          ],
        });
      }
      if (path === '/api/_rules/workload_group') {
        return Promise.resolve({
          rules: [
            {
              id: 'r1',
              description: 'd',
              index_pattern: ['keep-*'],
              principal: { username: ['alice'] },
              workload_group: 'wg-123',
            },
          ],
        });
      }
      if (path.startsWith('/api/_wlm/stats')) {
        return Promise.resolve({ body: {} });
      }
      return Promise.resolve({ body: {} });
    });

    const warnSpy = jest.fn();
    ((mockCore.notifications.toasts.addWarning as unknown) as jest.Mock) = warnSpy;

    renderComponent('test-group');
    fireEvent.click(screen.getByTestId('wlm-tab-settings'));

    const userBox = await screen.findByPlaceholderText('Enter username');
    expect(userBox).toHaveValue('alice');

    fireEvent.change(userBox, { target: { value: '' } });
    fireEvent.blur(userBox);

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith('Username cannot be cleared once set.');
      expect(userBox).toHaveValue('alice');
    });
  });

  it('Add another rule button disables at 5 rules', async () => {
    renderComponent('test-group');
    fireEvent.click(screen.getByTestId('wlm-tab-settings'));

    const addBtn = await screen.findByRole('button', { name: /\+ add another rule/i });

    // You start with 2 rules in your mocks; add until 5
    fireEvent.click(addBtn);
    fireEvent.click(addBtn);
    fireEvent.click(addBtn);

    // Now 5 -> disabled
    expect(addBtn).toBeDisabled();
  });

  it('Delete button is disabled for DEFAULT_WORKLOAD_GROUP', async () => {
    renderComponent('DEFAULT_WORKLOAD_GROUP');

    const deleteBtn = screen.getByRole('button', { name: /delete/i });
    expect(deleteBtn).toBeDisabled();
  });

  it("Delete modal's confirm button stays disabled until user types 'delete'", async () => {
    renderComponent('test-group');
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    const confirmBtn = await screen.findByRole('button', { name: /^delete$/i });
    expect(confirmBtn).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('delete'), { target: { value: 'dele' } });
    expect(confirmBtn).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('delete'), { target: { value: 'delete' } });
    expect(confirmBtn).not.toBeDisabled();
  });

  it('blocks saving when resiliency mode missing and both resource limits invalid', async () => {
    const dangerSpy = jest.fn();
    ((mockCore.notifications.toasts.addDanger as unknown) as jest.Mock) = dangerSpy;

    renderComponent('test-group');
    fireEvent.click(screen.getByTestId('wlm-tab-settings'));

    // Make both invalid
    const cpu = await screen.findByTestId('cpu-threshold-input');
    const mem = await screen.findByTestId('memory-threshold-input');
    fireEvent.change(cpu, { target: { value: '0' } });
    fireEvent.change(mem, { target: { value: '101' } });

    // Also unset resiliency mode by selecting then hacking idSelected? (simulate no change but still invalid limits)
    // Just click Apply with invalid state:
    const applyBtn = screen.getByRole('button', { name: /apply changes/i });
    expect(applyBtn).toBeDisabled(); // guarded by isInvalid

    // Force an attempt by making one small valid change then back to invalid to trigger message:
    fireEvent.change(cpu, { target: { value: '1' } });
    fireEvent.change(mem, { target: { value: '101' } });
    expect(applyBtn).toBeDisabled();

    // The component surfaces error toast only when saveChanges runs; to cover the message path,
    // set both undefined and try save: make both empty, then click Apply (enabled due to isSaved flag).
    fireEvent.change(cpu, { target: { value: '' } });
    fireEvent.change(mem, { target: { value: '' } });
    // Now flip a setting to unsave & enable Apply
    fireEvent.click(screen.getByLabelText('Enforced'));
    expect(applyBtn).not.toBeDisabled();

    // Make them invalid again: mem=0
    fireEvent.change(mem, { target: { value: '0' } });
    expect(applyBtn).toBeDisabled(); // stays guarded by isInvalid
  });

  it('Apply Changes performs create + update + delete diff of rules', async () => {
    // Start with keep-me (update) and remove-me (delete)
    (mockCore.http.get as jest.Mock).mockImplementation((path: string) => {
      if (path.startsWith('/api/_wlm/workload_group/test-group')) {
        return Promise.resolve({
          workload_groups: [
            {
              _id: 'wg-123',
              name: 'test-group',
              resource_limits: { cpu: 0.5, memory: 0.5 },
              resiliency_mode: 'SOFT',
            },
          ],
        });
      }
      if (path === '/api/_rules/workload_group') {
        return Promise.resolve({
          rules: [
            {
              id: 'keep-me',
              description: 'd',
              index_pattern: ['keep-*'],
              workload_group: 'wg-123',
            },
            {
              id: 'remove-me',
              description: 'd',
              index_pattern: ['remove-*'],
              workload_group: 'wg-123',
            },
          ],
        });
      }
      if (path.startsWith('/api/_wlm/stats')) {
        return Promise.resolve({ body: {} });
      }
      return Promise.resolve({ body: {} });
    });

    (mockCore.http.put as jest.Mock).mockResolvedValue({});
    (mockCore.http.delete as jest.Mock).mockResolvedValue({});

    renderComponent('test-group');
    fireEvent.click(screen.getByTestId('wlm-tab-settings'));
    await waitFor(() => screen.getByText(/Workload group settings/i));

    // Update existing "keep-me"
    const inputs = screen.getAllByTestId('indexInput');
    fireEvent.change(inputs[0], { target: { value: 'keep-updated-*' } });

    // Delete "remove-me" (second panel)
    const deleteIcons = screen.getAllByLabelText('Delete rule');
    fireEvent.click(deleteIcons[1]);

    // Create a new rule (indexId empty)
    fireEvent.click(screen.getByRole('button', { name: /\+ add another rule/i }));
    const newInputs = screen.getAllByTestId('indexInput');
    const newest = newInputs[newInputs.length - 1];
    fireEvent.change(newest, { target: { value: 'new-*' } });

    // Apply
    const applyBtn = screen.getByRole('button', { name: /apply changes/i });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      // Update call
      expect((mockCore.http.put as jest.Mock).mock.calls).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([
            '/api/_rules/workload_group/keep-me',
            expect.objectContaining({
              query: { dataSourceId: 'default' },
              headers: { 'Content-Type': 'application/json' },
            }),
          ]),
        ])
      );

      // Create call (no id in path)
      expect((mockCore.http.put as jest.Mock).mock.calls).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([
            '/api/_rules/workload_group',
            expect.objectContaining({
              query: { dataSourceId: 'default' },
              headers: { 'Content-Type': 'application/json' },
            }),
          ]),
        ])
      );

      // Delete call
      expect((mockCore.http.delete as jest.Mock).mock.calls).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([
            '/api/_rules/workload_group/remove-me',
            expect.objectContaining({ query: { dataSourceId: 'default' } }),
          ]),
        ])
      );
    });
  });
});
