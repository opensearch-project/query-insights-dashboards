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
import * as reactRouterDom from 'react-router-dom';
import { WLM_MAIN } from '../WorkloadManagement';
import { act } from 'react-dom/test-utils';

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
  if (path === '/api/_wlm/workload_group') {
    return Promise.resolve({
      body: {
        workload_groups: [{ name: 'test-group', _id: 'abc123' }],
      },
    });
  }

  if (path === '/api/_wlm/stats/abc123') {
    return Promise.resolve({
      body: {
        'node-1': {
          workload_groups: {
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
  PageHeader: ({ fallBackComponent }: { fallBackComponent: React.ReactNode }) => (
    <div data-testid="mock-page-header">{fallBackComponent}</div>
  ),
}));

describe('WLMDetails Component', () => {
  beforeEach(() => {
    jest.resetAllMocks(); // Reset mock function calls
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
    const mockPush = jest.fn();
    (reactRouterDom.useHistory as jest.Mock).mockReturnValue({ push: mockPush });

    (mockCore.http.get as jest.Mock)
      .mockImplementationOnce(() =>
        Promise.resolve({ body: { workload_groups: [{ name: 'test-group', _id: 'abc123' }] } })
      )
      .mockImplementationOnce(() => Promise.resolve({ body: {} }));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/No items found/i)).toBeInTheDocument();
    });
  });

  it('shows error toast and redirects if no query group found', async () => {
    const mockPush = jest.fn();
    const mockAddDanger = jest.fn();

    mockCore.http.get = jest.fn((path: string) => {
      if (path.startsWith('/api/_wlm/workload_group')) {
        return Promise.reject(new Error('Group ID not found'));
      }
      return Promise.resolve({ body: {} });
    });

    mockCore.notifications.toasts.addDanger = mockAddDanger;
    (reactRouterDom.useHistory as jest.Mock).mockReturnValue({ push: mockPush });

    renderComponent('non-existent-group');

    await waitFor(() => {
      expect(mockCore.notifications.toasts.addDanger).toHaveBeenCalledWith(
        expect.stringContaining('Failed to find workload group')
      );
      expect(mockPush).toHaveBeenCalledWith(WLM_MAIN);
    });
  });


  it('does not crash if stats are missing', async () => {
    mockCore.http.get = jest.fn((path: string) => {
      if (path === '/api/_wlm/workload_group') {
        return Promise.resolve({
          body: { workload_groups: [{ name: 'test-group', _id: 'abc123' }] },
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
    const mockPush = jest.fn();
    mockCore.notifications.toasts.addSuccess = jest.fn();
    (reactRouterDom.useHistory as jest.Mock).mockReturnValue({ push: mockPush });

    (mockCore.http.get as jest.Mock).mockImplementation((path: string) => {
      if (path.startsWith('/api/_wlm/workload_group')) {
        return Promise.resolve({
          body: {
            workload_groups: [
              {
                name: 'test-group',
                _id: 'abc123',
                resource_limits: { cpu: 0.5, memory: 0.5 },
                resiliency_mode: 'soft',
              },
            ],
          },
        });
      }
      if (path.startsWith('/api/_wlm/stats/abc123')) {
        return Promise.resolve({ body: {} });
      }
      return Promise.resolve({ body: {} });
    });

    (mockCore.http.put as jest.Mock).mockResolvedValue({});

    renderComponent();

    // Wait until the page loads
    await waitFor(() => {
      expect(screen.getByText(/Workload group name/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('wlm-tab-settings')); // Switch to Settings tab

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Enforced'));
    });

    await waitFor(() => {
      const applyButton = screen.getByRole('button', { name: /apply changes/i })
      expect(applyButton).not.toBeDisabled();
    });

    // Click Apply Changes
    fireEvent.click(screen.getByText('Apply Changes'));

    await waitFor(() => {
      expect(mockCore.http.put).toHaveBeenCalled();
      expect(mockCore.notifications.toasts.addSuccess).toHaveBeenCalled();
    });
  });

  it('shows error toast if fetching stats fails', async () => {
    mockCore.notifications.toasts.addDanger = jest.fn();
    (reactRouterDom.useHistory as jest.Mock).mockReturnValue({ push: jest.fn() });

    (mockCore.http.get as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('/_wlm/workload_group')) {
        return Promise.resolve({ body: { workload_groups: [{ name: 'test-group', _id: 'abc123' }] } });
      }
      if (path.includes('/_wlm/stats/abc123')) {
        return Promise.reject(new Error('Stats fetch failed'));
      }
      return Promise.resolve({ body: {} });
    });

    renderComponent('test-group');

    await waitFor(() => {
      expect(mockCore.notifications.toasts.addDanger).toHaveBeenCalledWith(
        expect.stringContaining('Could not load workload group stats')
      );
    });
  });

  it('deletes workload group successfully', async () => {
    const mockPush = jest.fn();
    mockCore.notifications.toasts.addSuccess = jest.fn();
    (reactRouterDom.useHistory as jest.Mock).mockReturnValue({ push: mockPush });

    (mockCore.http.delete as jest.Mock).mockResolvedValue({});

    renderComponent('test-group');

    const deleteButtons = screen.getAllByRole('button');
    const openDeleteButton = deleteButtons.find(btn => btn.textContent?.toLowerCase().includes('delete'));

    expect(openDeleteButton).toBeDefined();

    fireEvent.click(openDeleteButton!);

    await waitFor(() => {
      expect(screen.getByText('Delete workload group')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('delete'), { target: { value: 'delete' } });

    const confirmDeleteButton = await screen.findAllByRole('button');
    const realConfirmDeleteButton = confirmDeleteButton.find(btn => btn.textContent?.toLowerCase() === 'delete');

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
    const openDeleteButton = allDeleteButtons.find(btn => btn.textContent?.toLowerCase().includes('delete'));

    expect(openDeleteButton).toBeDefined();
    fireEvent.click(openDeleteButton!);

    await waitFor(() => {
      expect(screen.getByText('Delete workload group')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('delete'), { target: { value: 'delete' } });

    const allConfirmButtons = await screen.findAllByRole('button');
    const confirmDeleteButton = allConfirmButtons.find(btn => btn.textContent?.toLowerCase() === 'delete');

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

    (reactRouterDom.useHistory as jest.Mock).mockReturnValue({ push: jest.fn() });
    mockCore.notifications.toasts.addDanger = jest.fn();

    renderComponent('test-group');

    await waitFor(() => {
      expect(mockCore.notifications.toasts.addDanger).toHaveBeenCalledWith(expect.stringContaining('Failed to find workload group'));
    });
  });

  it('shows inline validation error for invalid CPU/memory input', async () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('wlm-tab-settings'));

    await waitFor(() => {
      expect(screen.getByLabelText('Reject queries when CPU usage is over')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Reject queries when CPU usage is over'), { target: { value: '200' } });

    const applyButton = screen.getByRole('button', { name: /apply changes/i });

    expect(applyButton).toBeDisabled();
  });

  it('redirects if group name is missing from URL', async () => {
    const mockPush = jest.fn();
    (reactRouterDom.useHistory as jest.Mock).mockReturnValue({ push: mockPush });

    render(
      <MemoryRouter initialEntries={['/wlm-details']}>
        <Route path="/wlm-details">
          <WLMDetails core={mockCore} depsStart={mockDeps as any} />
        </Route>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(WLM_MAIN);
    });
  });

  it('loads default workload group details if group name is DEFAULT_WORKLOAD_GROUP', async () => {
    renderComponent('DEFAULT_WORKLOAD_GROUP');

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
      expect(screen.getByText(/Settings are not available for the DEFAULT_WORKLOAD_GROUP/i)).toBeInTheDocument();
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

    (reactRouterDom.useHistory as jest.Mock).mockReturnValue({ push: jest.fn() });

    render(
      <MemoryRouter initialEntries={['/wlm-details']}>
        <Route path="/wlm-details">
          <WLMDetails core={mockCore as CoreStart} depsStart={mockDeps as any} />
        </Route>
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
});
