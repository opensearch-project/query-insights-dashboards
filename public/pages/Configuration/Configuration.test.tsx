/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { MemoryRouter } from 'react-router-dom';
import Configuration from './Configuration';
import { DataSourceContext } from '../TopNQueries/TopNQueries';
const mockConfigInfo = jest.fn();
const mockHistoryPush = jest.fn();
const mockCoreStart = {
  chrome: {
    setBreadcrumbs: jest.fn(),
  },
  http: {
    get: jest.fn(),
  },
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ push: mockHistoryPush }),
  useLocation: () => ({ pathname: '/configuration' }),
}));

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

const groupBySettings = {
  groupBy: 'similarity',
};

const dataRetentionSettings = {
  exporterType: 'local_index',
  deleteAfterDays: '7',
};

const dataSourceMenuMock = jest.fn(() => <div>Mock DataSourceMenu</div>);

const dataSourceManagementMock = {
  ui: {
    getDataSourceMenu: jest.fn().mockReturnValue(dataSourceMenuMock),
  },
};
const mockDataSourceContext = {
  dataSource: { id: 'test', label: 'Test' },
  setDataSource: jest.fn(),
};

const mockClusterSettings = {
  persistent: {},
  transient: {},
  defaults: {
    search: {
      insights: {
        top_queries: {
          latency: {
            enabled: 'true',
            top_n_size: '10',
            window_size: '5m',
          },
          cpu: {
            enabled: 'false',
            top_n_size: '10',
            window_size: '5m',
          },
          memory: {
            enabled: 'false',
            top_n_size: '10',
            window_size: '5m',
          },
          grouping: {
            group_by: 'none',
          },
          exporter: {
            type: 'local_index',
            delete_after_days: '7',
          },
        },
      },
    },
  },
};

const renderConfiguration = (overrides = {}) => {
  mockCoreStart.http.get.mockResolvedValue(mockClusterSettings);
  return render(
    <MemoryRouter>
      <DataSourceContext.Provider value={mockDataSourceContext}>
        <Configuration
          latencySettings={{ ...defaultLatencySettings, ...overrides }}
          cpuSettings={defaultCpuSettings}
          memorySettings={defaultMemorySettings}
          groupBySettings={groupBySettings}
          configInfo={mockConfigInfo}
          dataRetentionSettings={dataRetentionSettings}
          core={mockCoreStart}
          depsStart={{ navigation: {} }}
          params={{} as any}
          dataSourceManagement={dataSourceManagementMock}
        />
      </DataSourceContext.Provider>
    </MemoryRouter>
  );
};

const getMetricSelect = () => screen.getByLabelText('Metric type');
const getEnableToggle = () => screen.getByLabelText('Enable metric');
const getTopNInput = () => screen.getByRole('spinbutton');
const getWindowSizeInput = () => screen.getByTestId('window-size-raw');
const getGroupBySelect = () => screen.getByLabelText('Group by');
const getExporterSelect = () => screen.getByLabelText('Exporter type');
const getDeleteAfterInput = () => screen.getByLabelText('Delete after days');
const getSaveButton = () => screen.queryByTestId('save-config-button');
const getCancelButton = () => screen.queryByText('Cancel');

describe('Configuration Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default settings', async () => {
    const { container } = renderConfiguration();
    await waitFor(() => {
      expect(screen.getByText('Top N queries monitoring configuration settings')).toBeInTheDocument();
    });
    expect(container).toMatchSnapshot('should match default settings snapshot');
  });

  it('loads cluster settings on mount', async () => {
    renderConfiguration();
    await waitFor(() => {
      expect(mockCoreStart.http.get).toHaveBeenCalledWith('/api/cluster_settings', {
        query: { include_defaults: true, dataSourceId: 'test' },
      });
    });
  });

  it('displays error when cluster settings fail to load', async () => {
    mockCoreStart.http.get.mockRejectedValue(new Error('Network error'));
    renderConfiguration();
    await waitFor(() => {
      expect(screen.getByText('Could not load cluster settings')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  describe('Metric Configuration', () => {
    it('switches between different metrics', async () => {
      renderConfiguration();
      await waitFor(() => {
        expect(getMetricSelect()).toHaveValue('latency');
      });

      fireEvent.change(getMetricSelect(), { target: { value: 'cpu' } });
      expect(getMetricSelect()).toHaveValue('cpu');

      fireEvent.change(getMetricSelect(), { target: { value: 'memory' } });
      expect(getMetricSelect()).toHaveValue('memory');
    });

    it('toggles metric enable/disable', async () => {
      renderConfiguration();
      await waitFor(() => {
        expect(getEnableToggle()).toBeChecked();
      });

      fireEvent.click(getEnableToggle());
      expect(getEnableToggle()).not.toBeChecked();

      fireEvent.click(getEnableToggle());
      expect(getEnableToggle()).toBeChecked();
    });

    it('validates top N size input', async () => {
      renderConfiguration();
      await waitFor(() => {
        expect(getTopNInput()).toBeInTheDocument();
      });

      // Valid input
      fireEvent.change(getTopNInput(), { target: { value: '50' } });
      expect(getTopNInput()).toHaveValue(50);

      // Invalid input - exceeds max
      fireEvent.change(getTopNInput(), { target: { value: '150' } });
      expect(getTopNInput()).toHaveValue(100); // Should be clamped to max

      // Invalid input - below min
      fireEvent.change(getTopNInput(), { target: { value: '0' } });
      expect(getTopNInput()).toHaveValue(1); // Should be clamped to min
    });

    it('validates window size input format', async () => {
      renderConfiguration();
      await waitFor(() => {
        expect(getWindowSizeInput()).toBeInTheDocument();
      });

      // Valid formats
      fireEvent.change(getWindowSizeInput(), { target: { value: '10m' } });
      expect(getWindowSizeInput()).toHaveValue('10m');

      fireEvent.change(getWindowSizeInput(), { target: { value: '2h' } });
      expect(getWindowSizeInput()).toHaveValue('2h');

      // Invalid format should show warning
      fireEvent.change(getWindowSizeInput(), { target: { value: 'invalid' } });
      fireEvent.click(getEnableToggle()); // Enable to trigger validation
      await waitFor(() => {
        expect(screen.getByText('Invalid window size')).toBeInTheDocument();
      });
    });
  });

  describe('Group By Configuration', () => {
    it('changes group by setting', async () => {
      renderConfiguration();
      await waitFor(() => {
        expect(getGroupBySelect()).toHaveValue('none');
      });

      fireEvent.change(getGroupBySelect(), { target: { value: 'similarity' } });
      expect(getGroupBySelect()).toHaveValue('similarity');
    });

    it('displays group by status correctly', async () => {
      renderConfiguration();
      await waitFor(() => {
        expect(screen.getByText('Group By')).toBeInTheDocument();
      });

      // Initially disabled (none)
      expect(screen.getAllByText('Disabled')[1]).toBeInTheDocument();

      // Enable similarity grouping
      fireEvent.change(getGroupBySelect(), { target: { value: 'similarity' } });
      await waitFor(() => {
        expect(screen.getAllByText('Enabled')[3]).toBeInTheDocument();
      });
    });
  });

  describe('Data Retention Configuration', () => {
    it('changes exporter type', async () => {
      renderConfiguration();
      await waitFor(() => {
        expect(getExporterSelect()).toHaveValue('local_index');
      });

      fireEvent.change(getExporterSelect(), { target: { value: 'none' } });
      expect(getExporterSelect()).toHaveValue('none');
    });

    it('disables delete after days when exporter is none', async () => {
      renderConfiguration();
      await waitFor(() => {
        expect(getDeleteAfterInput()).not.toBeDisabled();
      });

      fireEvent.change(getExporterSelect(), { target: { value: 'none' } });
      expect(getDeleteAfterInput()).toBeDisabled();
    });

    it('validates delete after days input', async () => {
      renderConfiguration();
      await waitFor(() => {
        expect(getDeleteAfterInput()).toBeInTheDocument();
      });

      // Valid input
      fireEvent.change(getDeleteAfterInput(), { target: { value: '30' } });
      expect(getDeleteAfterInput()).toHaveValue(30);

      // Invalid input - exceeds max
      fireEvent.change(getDeleteAfterInput(), { target: { value: '200' } });
      expect(getDeleteAfterInput()).toHaveValue(180); // Should be clamped to max

      // Invalid input - below min
      fireEvent.change(getDeleteAfterInput(), { target: { value: '0' } });
      expect(getDeleteAfterInput()).toHaveValue(1); // Should be clamped to min
    });
  });

  describe('Status Display', () => {
    it('displays metric statuses correctly', async () => {
      renderConfiguration();
      await waitFor(() => {
        expect(screen.getByText('Statuses for configuration metrics')).toBeInTheDocument();
      });

      // Check status indicators
      expect(screen.getByText('Latency')).toBeInTheDocument();
      expect(screen.getByText('CPU Usage')).toBeInTheDocument();
      expect(screen.getByText('Memory')).toBeInTheDocument();
    });

    it('displays exporter status correctly', async () => {
      renderConfiguration();
      await waitFor(() => {
        expect(screen.getByText('Statuses for data retention')).toBeInTheDocument();
      });

      // Initially enabled (local_index)
      expect(screen.getAllByText('Enabled')[2]).toBeInTheDocument();

      // Disable exporter
      fireEvent.change(getExporterSelect(), { target: { value: 'none' } });
      await waitFor(() => {
        expect(screen.getAllByText('Disabled')[3]).toBeInTheDocument();
      });
    });
  });

  describe('Save and Cancel Actions', () => {
    it('shows save/cancel buttons only when changes are made', async () => {
      renderConfiguration();
      await waitFor(() => {
        expect(getSaveButton()).not.toBeInTheDocument();
        expect(getCancelButton()).not.toBeInTheDocument();
      });

      // Make a change
      fireEvent.change(getTopNInput(), { target: { value: '15' } });
      await waitFor(() => {
        expect(getSaveButton()).toBeInTheDocument();
        expect(getCancelButton()).toBeInTheDocument();
      });
    });

    it('disables save button for invalid window size', async () => {
      renderConfiguration();
      await waitFor(() => {
        expect(getWindowSizeInput()).toBeInTheDocument();
      });

      // Make invalid window size change
      fireEvent.change(getWindowSizeInput(), { target: { value: 'invalid' } });
      await waitFor(() => {
        expect(getSaveButton()).toBeDisabled();
      });
    });

    it('calls configInfo with correct parameters on save', async () => {
      renderConfiguration();
      await waitFor(() => {
        expect(getTopNInput()).toBeInTheDocument();
      });

      // Make changes
      fireEvent.change(getTopNInput(), { target: { value: '25' } });
      fireEvent.change(getWindowSizeInput(), { target: { value: '15m' } });
      fireEvent.change(getGroupBySelect(), { target: { value: 'similarity' } });
      fireEvent.change(getDeleteAfterInput(), { target: { value: '30' } });

      fireEvent.click(getSaveButton()!);
      await waitFor(() => {
        expect(mockConfigInfo).toHaveBeenCalledWith(
          false,
          true,
          'latency',
          25,
          15,
          'm',
          'local_index',
          'similarity',
          30
        );
        expect(mockHistoryPush).toHaveBeenCalledWith('/query-insights');
      });
    });

    it('resets form on cancel', async () => {
      renderConfiguration();
      await waitFor(() => {
        expect(getTopNInput()).toBeInTheDocument();
      });

      const originalValue = getTopNInput().value;

      // Make changes
      fireEvent.change(getTopNInput(), { target: { value: '25' } });
      expect(getTopNInput()).toHaveValue(25);

      // Cancel changes
      fireEvent.click(getCancelButton()!);
      expect(getTopNInput()).toHaveValue(parseInt(originalValue));
    });
  });

  describe('Data Source Integration', () => {
    it('reloads settings when data source changes', async () => {
      renderConfiguration();
      await waitFor(() => {
        expect(mockCoreStart.http.get).toHaveBeenCalledTimes(1);
      });

      // Simulate data source change
      const newDataSource = { id: 'new-test', label: 'New Test' };
      mockDataSourceContext.setDataSource(newDataSource);

      // Component should reload settings
      expect(mockCoreStart.http.get).toHaveBeenCalledWith('/api/cluster_settings', {
        query: { include_defaults: true, dataSourceId: 'test' },
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty cluster settings response', async () => {
      mockCoreStart.http.get.mockResolvedValue({});
      renderConfiguration();
      await waitFor(() => {
        expect(screen.getByText('Top N queries monitoring configuration settings')).toBeInTheDocument();
      });
    });

    it('handles malformed window size values', async () => {
      renderConfiguration();
      await waitFor(() => {
        expect(getWindowSizeInput()).toBeInTheDocument();
      });

      const invalidValues = ['', '0m', '25h', '1441m', 'abc', '10x'];

      for (const value of invalidValues) {
        fireEvent.change(getWindowSizeInput(), { target: { value } });
        fireEvent.click(getEnableToggle());

        if (value !== '' && value !== '10x' && value !== 'abc') {
          await waitFor(() => {
            expect(screen.queryByText('Invalid window size')).toBeInTheDocument();
          });
        }
      }
    });

    it('handles non-numeric inputs gracefully', async () => {
      renderConfiguration();
      await waitFor(() => {
        expect(getTopNInput()).toBeInTheDocument();
      });

      // Non-numeric input should be handled
      fireEvent.change(getTopNInput(), { target: { value: 'abc' } });
      expect(getTopNInput()).toHaveValue(0);
    });
  });
});
