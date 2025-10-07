/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WLMCreate } from './WLMCreate';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { DataSourceContext } from '../WorkloadManagement';
import { userEvent } from '@testing-library/user-event';

const mockPush = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddDanger = jest.fn();

const coreMock = {
  http: {
    put: jest.fn(),
  },
  notifications: {
    toasts: {
      addSuccess: mockAddSuccess,
      addDanger: mockAddDanger,
    },
  },
  chrome: {
    setBreadcrumbs: jest.fn(),
  },
  savedObjects: {
    client: {},
  },
};

const depsMock = {
  dataSource: {
    dataSourceEnabled: true,
  },
};

const MockDataSourceMenu = (_props: any) => <div>Mocked Data Source Menu</div>;

const mockDataSourceManagement = {
  ui: {
    getDataSourceMenu: jest.fn(() => MockDataSourceMenu),
  },
} as any;

const mockDataSource = {
  id: 'default',
  name: 'default',
} as any;

const mockParams = {
  setHeaderActionMenu: jest.fn(),
} as any;

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({
    push: mockPush,
  }),
}));

jest.mock('../../../components/PageHeader', () => ({
  PageHeader: () => <div data-testid="mock-page-header">Mocked PageHeader</div>,
}));

describe('WLMCreate', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Restore the data source menu mock after reset
    mockDataSourceManagement.ui.getDataSourceMenu.mockReturnValue(MockDataSourceMenu);
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <DataSourceContext.Provider
          value={{ dataSource: mockDataSource, setDataSource: jest.fn() }}
        >
          <WLMCreate
            core={coreMock as any}
            depsStart={depsMock as any}
            params={mockParams}
            dataSourceManagement={mockDataSourceManagement}
          />
        </DataSourceContext.Provider>
      </MemoryRouter>
    );

  it('renders all input fields and buttons', () => {
    renderComponent();

    expect(screen.getByRole('button', { name: /create workload group/i })).toBeInTheDocument();
    expect(screen.getByText(/Name/)).toBeInTheDocument();
    expect(screen.getByText(/Description/)).toBeInTheDocument();
    expect(screen.getByText(/Index wildcard/)).toBeInTheDocument();
    expect(screen.getByText(/Soft/)).toBeInTheDocument();
    expect(screen.getByText(/Enforced/)).toBeInTheDocument();
    expect(screen.getByText(/CPU usage/)).toBeInTheDocument();
    expect(screen.getByText(/memory usage/)).toBeInTheDocument();
    expect(screen.getByText(/Cancel/)).toBeInTheDocument();
  });

  it('disables create button when name is empty', () => {
    renderComponent();
    const createButton = screen.getByRole('button', { name: /create workload group/i });
    expect(createButton).toBeDisabled();
  });

  it('enables the Create button when name, CPU usage, and resiliency mode are set', async () => {
    renderComponent();

    await userEvent.type(screen.getByTestId('name-input'), 'MyGroup');
    fireEvent.change(screen.getByTestId('cpu-threshold-input'), {
      target: { value: '50' },
    });
    await userEvent.click(screen.getByLabelText(/Soft/i));

    expect((screen.getByTestId('name-input') as HTMLInputElement).value).toBe('MyGroup');
    expect((screen.getByTestId('cpu-threshold-input') as HTMLInputElement).value).toBe('50');

    await waitFor(() => {
      const createBtn = screen.getByRole('button', { name: /create workload group/i });
      expect(createBtn).toBeEnabled();
    });
  });

  it('calls API and shows success toast on successful creation', async () => {
    coreMock.http.put.mockResolvedValue({});

    renderComponent();

    await userEvent.type(screen.getByTestId('name-input'), 'MyGroup');
    fireEvent.change(screen.getByTestId('cpu-threshold-input'), {
      target: { value: '50' },
    });
    await userEvent.click(screen.getByLabelText(/Soft/i));

    fireEvent.click(screen.getByRole('button', { name: /create workload group/i }));

    await waitFor(() => {
      expect(coreMock.http.put).toHaveBeenCalledWith(
        '/api/_wlm/workload_group',
        expect.objectContaining({ query: { dataSourceId: 'default' } })
      );
      expect(mockAddSuccess).toHaveBeenCalledWith('Workload group created successfully.');
      expect(mockPush).toHaveBeenCalledWith('/workloadManagement');
    });
  });

  it('shows error toast on API failure', async () => {
    coreMock.http.put.mockRejectedValue({ body: { message: 'Creation failed' } });

    renderComponent();

    fireEvent.change(screen.getByTestId('name-input'), {
      target: { value: 'FailGroup' },
    });
    fireEvent.change(screen.getByTestId('cpu-threshold-input'), {
      target: { value: '50' },
    });
    fireEvent.click(screen.getByLabelText(/Soft/i)); // Select resiliency mode

    fireEvent.click(screen.getByRole('button', { name: /create workload group/i }));

    await waitFor(() => {
      expect(mockAddDanger).toHaveBeenCalledWith({
        title: 'Failed to create workload group',
        text: 'Creation failed',
      });
    });
  });

  it('sets breadcrumbs on mount', () => {
    renderComponent();
    expect(coreMock.chrome.setBreadcrumbs).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ text: 'Data Administration' }),
        expect.objectContaining({ text: 'Create' }),
      ])
    );
  });

  it('allows toggling resiliency mode back to soft', () => {
    renderComponent();

    // Go to 'Enforced' first
    fireEvent.click(screen.getByText(/enforced/i));

    // Then back to 'Soft'
    fireEvent.click(screen.getByText(/soft/i));

    expect((screen.getByLabelText(/soft/i) as HTMLInputElement).checked).toBe(true);
  });

  it('does NOT show error message when CPU usage is valid (70)', () => {
    renderComponent();

    const cpuInput = screen.getByTestId('cpu-threshold-input');
    fireEvent.change(cpuInput, { target: { value: '70' } });

    expect(screen.queryByText(/value must be between 0 and 100/i)).not.toBeInTheDocument();
    expect(cpuInput).not.toHaveAttribute('aria-invalid');
  });

  it('navigates to main page on cancel', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockPush).toHaveBeenCalledWith('/workloadManagement');
  });

  it('updates CPU and memory threshold', () => {
    renderComponent();

    fireEvent.change(screen.getByTestId('cpu-threshold-input'), { target: { value: '90' } });
    fireEvent.change(screen.getByTestId('memory-threshold-input'), { target: { value: '90' } });

    const cpuInput = screen.getByTestId('cpu-threshold-input') as HTMLInputElement;
    const memInput = screen.getByTestId('memory-threshold-input') as HTMLInputElement;

    expect(cpuInput.value).toBe('90');
    expect(memInput.value).toBe('90');
  });

  it('breadcrumb onClick navigates to WLM main page', () => {
    renderComponent();

    const breadcrumbs = coreMock.chrome.setBreadcrumbs.mock.calls[0][0];
    const adminCrumb = breadcrumbs.find((b: any) => b.text === 'Data Administration');

    const fakeEvent = { preventDefault: jest.fn() } as any;
    adminCrumb.onClick(fakeEvent);

    expect(fakeEvent.preventDefault).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/workloadManagement');
  });

  it('allows adding rules', async () => {
    renderComponent();

    const indexInput = await screen.getByTestId('indexInput');
    await userEvent.type(indexInput, 'logs-*');
    expect(indexInput).toHaveValue('logs-*');
  });

  it('sorts by memory usage when column is clicked', async () => {
    renderComponent();

    const memoryHeader = screen.getByText(/memory usage/i);
    fireEvent.click(memoryHeader);
    expect(memoryHeader).toBeInTheDocument();
  });

  // Testing rules related
  const fillRequiredFields = async () => {
    await userEvent.type(screen.getByTestId('name-input'), 'MyGroup');
    fireEvent.change(screen.getByTestId('cpu-threshold-input'), { target: { value: '50' } });
    await userEvent.click(screen.getByLabelText(/Soft/i));
  };

  describe('WLMCreate – new rules payload behavior', () => {
    beforeEach(() => {
      coreMock.http.put.mockReset();
    });

    it('skips creating a rule when index/username/role are all empty', async () => {
      // 1) create group -> returns id
      coreMock.http.put.mockResolvedValueOnce({ body: { _id: 'gid-skip' } });

      renderComponent();
      await fillRequiredFields();

      fireEvent.click(screen.getByRole('button', { name: /create workload group/i }));

      await waitFor(() => {
        // Only 1 PUT (group). No second PUT to /api/_rules/workload_group
        expect(coreMock.http.put).toHaveBeenCalledTimes(1);
        expect(coreMock.http.put).toHaveBeenNthCalledWith(
          1,
          '/api/_wlm/workload_group',
          expect.any(Object)
        );
      });
    });

    it('includes principal.username only when usernames provided', async () => {
      coreMock.http.put
        .mockResolvedValueOnce({ body: { _id: 'gid-usernames' } }) // group create
        .mockResolvedValueOnce({}); // rules create

      renderComponent();
      await fillRequiredFields();

      await userEvent.type(screen.getByPlaceholderText(/username/i), 'alice, bob');

      fireEvent.click(screen.getByRole('button', { name: /create workload group/i }));

      await waitFor(() => {
        const call = coreMock.http.put.mock.calls.find(([u]) => u === '/api/_rules/workload_group');
        expect(call).toBeTruthy();
        const [, args] = call!;
        const body = JSON.parse((args as any).body);
        expect(body.workload_group).toBe('gid-usernames');
        expect(body).not.toHaveProperty('index_pattern');
        expect(body).toHaveProperty('principal.username', ['alice', 'bob']);
        expect(body.principal).not.toHaveProperty('role');
      });
    });

    it('includes principal.role only when roles provided', async () => {
      coreMock.http.put
        .mockResolvedValueOnce({ body: { _id: 'gid-roles' } })
        .mockResolvedValueOnce({});

      renderComponent();
      await fillRequiredFields();

      await userEvent.type(screen.getByPlaceholderText(/role/i), 'admin, reader');

      fireEvent.click(screen.getByRole('button', { name: /create workload group/i }));

      await waitFor(() => {
        const call = coreMock.http.put.mock.calls.find(([u]) => u === '/api/_rules/workload_group');
        const [, args] = call!;
        const body = JSON.parse((args as any).body);
        expect(body.workload_group).toBe('gid-roles');
        expect(body).not.toHaveProperty('index_pattern');
        expect(body).toHaveProperty('principal.role', ['admin', 'reader']);
        expect(body.principal).not.toHaveProperty('username');
      });
    });

    it('includes both username and role when both are provided', async () => {
      coreMock.http.put
        .mockResolvedValueOnce({ body: { _id: 'gid-both' } })
        .mockResolvedValueOnce({});

      renderComponent();
      await fillRequiredFields();

      await userEvent.type(screen.getByPlaceholderText(/username/i), 'alice');
      await userEvent.type(screen.getByPlaceholderText(/role/i), 'admin');

      fireEvent.click(screen.getByRole('button', { name: /create workload group/i }));

      await waitFor(() => {
        const call = coreMock.http.put.mock.calls.find(([u]) => u === '/api/_rules/workload_group');
        const [, args] = call!;
        const body = JSON.parse((args as any).body);
        expect(body.principal).toEqual({ username: ['alice'], role: ['admin'] });
      });
    });

    it('includes index_pattern only when non-empty and trims entries', async () => {
      coreMock.http.put
        .mockResolvedValueOnce({ body: { _id: 'gid-index' } })
        .mockResolvedValueOnce({});

      renderComponent();
      await fillRequiredFields();

      const indexInput = screen.getByTestId('indexInput');
      await userEvent.type(indexInput, ' logs-*,  ,  metrics-*  ');

      fireEvent.click(screen.getByRole('button', { name: /create workload group/i }));

      await waitFor(() => {
        const call = coreMock.http.put.mock.calls.find(([u]) => u === '/api/_rules/workload_group');
        const [, args] = call!;
        const body = JSON.parse((args as any).body);
        expect(body).toHaveProperty('index_pattern', ['logs-*', 'metrics-*']);
        expect(body).not.toHaveProperty('principal');
      });
    });

    it('sends resource_limits only when valid CPU/memory provided', async () => {
      coreMock.http.put.mockResolvedValueOnce({ body: { _id: 'gid-rl' } });

      renderComponent();
      // name + resiliency
      await userEvent.type(screen.getByTestId('name-input'), 'MyGroup');
      await userEvent.click(screen.getByLabelText(/Soft/i));

      // valid cpu and memory
      fireEvent.change(screen.getByTestId('cpu-threshold-input'), { target: { value: '40' } });
      fireEvent.change(screen.getByTestId('memory-threshold-input'), { target: { value: '80' } });

      fireEvent.click(screen.getByRole('button', { name: /create workload group/i }));

      await waitFor(() => {
        const [, args] = coreMock.http.put.mock.calls[0];
        const body = JSON.parse((args as any).body);
        expect(body.resource_limits).toEqual({ cpu: 0.4, memory: 0.8 });
      });
    });

    it('shows error toast and does not navigate when rules PUT fails', async () => {
      // group create OK
      coreMock.http.put
        .mockResolvedValueOnce({ body: { _id: 'gid-fail' } })
        .mockRejectedValueOnce({ body: { message: 'Rules create failed' } }); // rules create FAIL

      renderComponent();
      await fillRequiredFields();

      await userEvent.type(screen.getByTestId('indexInput'), 'logs-*');

      fireEvent.click(screen.getByRole('button', { name: /create workload group/i }));

      await waitFor(() => {
        expect(mockAddDanger).toHaveBeenCalledWith({
          title: 'Failed to create workload group',
          text: 'Rules create failed',
        });
        expect(mockPush).not.toHaveBeenCalled();
      });
    });
  });
});
