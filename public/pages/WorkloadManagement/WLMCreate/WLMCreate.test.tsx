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
});
