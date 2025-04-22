/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WLMCreate } from './WLMCreate';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

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
};

const depsMock = {}; // Not used in this component

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({
    push: mockPush,
  }),
}));

describe('WLMCreate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <WLMCreate core={coreMock as any} depsStart={depsMock as any} />
      </MemoryRouter>
    );

  it('renders all input fields and buttons', () => {
    renderComponent();

    expect(screen.getByText('Create Workload group')).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Index wildcard/)).toBeInTheDocument();
    expect(screen.getByText(/Soft/)).toBeInTheDocument();
    expect(screen.getByText(/Enforced/)).toBeInTheDocument();
    expect(screen.getByLabelText(/CPU usage/)).toBeInTheDocument();
    expect(screen.getByLabelText(/memory usage/)).toBeInTheDocument();
    expect(screen.getByText(/Cancel/)).toBeInTheDocument();
    expect(screen.getByText(/Create workload group/)).toBeInTheDocument();
  });

  it('disables create button when name is empty', () => {
    renderComponent();
    const createButton = screen.getByRole('button', { name: /create workload group/i });
    expect(createButton).toBeDisabled();
  });

  it('enables the Create button when name is filled', () => {
    renderComponent();
    fireEvent.change(screen.getByLabelText(/Name/), {
      target: { value: 'MyGroup' },
    });
    expect(screen.getByRole('button', { name: /Create workload group/i })).toBeEnabled();
  });

  it('calls API and shows success toast on successful creation', async () => {
    coreMock.http.put.mockResolvedValue({});

    renderComponent();
    fireEvent.change(screen.getByLabelText(/Name/), {
      target: { value: 'MyGroup' },
    });

    fireEvent.click(screen.getByText(/Create workload group/));

    await waitFor(() => {
      expect(coreMock.http.put).toHaveBeenCalledWith(
        '/api/_wlm/workload_group',
        expect.any(Object)
      );
      expect(mockAddSuccess).toHaveBeenCalledWith('Workload group "MyGroup" created successfully.');
      expect(mockPush).toHaveBeenCalledWith('/workloadManagement');
    });
  });

  it('shows error toast on API failure', async () => {
    coreMock.http.put.mockRejectedValue({ body: { message: 'Creation failed' } });

    renderComponent();
    fireEvent.change(screen.getByLabelText(/Name/), {
      target: { value: 'FailGroup' },
    });

    fireEvent.click(screen.getByText(/Create workload group/));

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

    const cpuInput = screen.getByLabelText(/CPU usage/i);
    fireEvent.change(cpuInput, { target: { value: '70' } });

    expect(screen.queryByText(/value must be between 0 and 100/i)).not.toBeInTheDocument();
    expect(cpuInput).not.toHaveAttribute('aria-invalid');
  });

  it('navigates to main page on cancel', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockPush).toHaveBeenCalledWith('/workloadManagement');
  });

  it('shows error toast when API fails', async () => {
    coreMock.http.put.mockRejectedValue({ body: { message: 'Creation failed' } });

    renderComponent();
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'FailGroup' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create workload group/i }));

    await waitFor(() => {
      expect(coreMock.notifications.toasts.addDanger).toHaveBeenCalledWith({
        title: 'Failed to create workload group',
        text: 'Creation failed',
      });
    });
  });

  it('updates CPU and memory threshold', () => {
    renderComponent();

    fireEvent.change(screen.getByLabelText(/CPU usage/i), { target: { value: '90' } });
    fireEvent.change(screen.getByLabelText(/memory usage/i), { target: { value: '90' } });

    const cpuInput = screen.getByLabelText(/CPU usage/i) as HTMLInputElement;
    const memInput = screen.getByLabelText(/memory usage/i) as HTMLInputElement;

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
});
