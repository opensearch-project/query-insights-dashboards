/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { MemoryRouter } from 'react-router-dom';
import Configuration from './Configuration';

const mockConfigInfo = jest.fn();
const mockCoreStart = {
  chrome: {
    setBreadcrumbs: jest.fn(),
  },
};

const defaultLatencySettings = {
  isEnabled: true,
  currTopN: '5',
  currWindowSize: '10',
  currTimeUnit: 'MINUTES',
};
const defaultCpuSettings = {
  isEnabled: false,
  currTopN: '10',
  currWindowSize: '1',
  currTimeUnit: 'HOURS',
};
const defaultMemorySettings = {
  isEnabled: false,
  currTopN: '15',
  currWindowSize: '2',
  currTimeUnit: 'HOURS',
};

const renderConfiguration = (overrides = {}) =>
  render(
    <MemoryRouter>
      <Configuration
        latencySettings={{ ...defaultLatencySettings, ...overrides }}
        cpuSettings={defaultCpuSettings}
        memorySettings={defaultMemorySettings}
        configInfo={mockConfigInfo}
        core={mockCoreStart}
      />
    </MemoryRouter>
  );

const getWindowSizeConfigurations = () => screen.getAllByRole('combobox');
const getTopNSizeConfiguration = () => screen.getByRole('spinbutton');
const getEnableToggle = () => screen.getByRole('switch');

describe('Configuration Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default settings', () => {
    const { container } = renderConfiguration();
    expect(container).toMatchSnapshot('should match default settings snapshot');
  });

  // The following tests test the interactions on the frontend with Mocks.
  it('updates state when toggling metrics and enables Save button when changes are made', () => {
    const { container } = renderConfiguration();
    // before toggling the metric
    expect(getWindowSizeConfigurations()[0]).toHaveValue('latency');
    expect(getEnableToggle()).toBeChecked();
    // toggle the metric
    fireEvent.change(getWindowSizeConfigurations()[0], { target: { value: 'cpu' } });
    // after toggling the metric
    expect(getWindowSizeConfigurations()[0]).toHaveValue('cpu');
    // the enabled box should be disabled by default based on our configuration
    const cpuEnableBox = getEnableToggle();
    expect(cpuEnableBox).toBeInTheDocument();
    expect(cpuEnableBox).not.toBeChecked();

    fireEvent.click(getEnableToggle());
    expect(getEnableToggle()).toBeChecked();
    expect(screen.getByText('Save')).toBeEnabled();
    expect(container).toMatchSnapshot('should match settings snapshot after toggling');
  });

  it('validates topNSize and windowSize inputs and disables Save button for invalid input', () => {
    renderConfiguration();
    fireEvent.change(getTopNSizeConfiguration(), { target: { value: '101' } });
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
    fireEvent.change(getWindowSizeConfigurations()[1], { target: { value: '999' } });
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });

  it('calls configInfo and navigates on Save button click', async () => {
    renderConfiguration();
    fireEvent.change(getTopNSizeConfiguration(), { target: { value: '7' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(mockConfigInfo).toHaveBeenCalledWith(false, true, 'latency', '7', '10', 'MINUTES');
    });
  });

  it('resets state on Cancel button click', async () => {
    renderConfiguration();
    fireEvent.change(getTopNSizeConfiguration(), { target: { value: '7' } });
    fireEvent.click(screen.getByText('Cancel'));
    expect(getTopNSizeConfiguration()).toHaveValue(5); // Resets to initial value
  });
});
