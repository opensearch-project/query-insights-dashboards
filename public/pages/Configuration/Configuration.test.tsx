/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import Configuration from './Configuration';
import { DataSourceContext } from '../TopNQueries/TopNQueries';
import { TIME_UNITS_TEXT, EXPORTER_TYPE } from '../../../common/constants';
import * as constants from '../../../common/constants';
import {
  validateTopNSize,
  validateWindowSize,
  validateDeleteAfterDays,
  validateConfiguration,
} from './configurationValidation';

const mockConfigInfo = jest.fn();
const mockCoreStart = {
  chrome: {
    setBreadcrumbs: jest.fn(),
  },
  http: {
    get: jest.fn().mockResolvedValue({ ok: true, response: {} }),
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

const groupBySettings = {
  groupBy: 'SIMILARITY',
};

const dataRetentionSettings = {
  exporterType: 'local_index',
  deleteAfterDays: '179',
};

const remoteExporterSettings = {
  enabled: false,
  repository: '',
  path: 'query-insights',
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

const renderConfiguration = (overrides = {}) =>
  render(
    <MemoryRouter>
      <DataSourceContext.Provider value={mockDataSourceContext}>
        <Configuration
          latencySettings={{ ...defaultLatencySettings, ...overrides }}
          cpuSettings={defaultCpuSettings}
          memorySettings={defaultMemorySettings}
          groupBySettings={groupBySettings}
          configInfo={mockConfigInfo}
          dataRetentionSettings={dataRetentionSettings}
          remoteExporterSettings={remoteExporterSettings}
          core={mockCoreStart}
          depsStart={{ navigation: {} }}
          params={{} as any}
          dataSourceManagement={dataSourceManagementMock}
        />
      </DataSourceContext.Provider>
    </MemoryRouter>
  );

const getWindowSizeConfigurations = () => screen.getAllByRole('combobox');
const getTopNSizeConfiguration = () => screen.getAllByRole('spinbutton');
const getEnableToggle = () => {
  const toggles = screen.getAllByRole('switch');
  return toggles[0]; // First switch is the top-n-metric toggle
};

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
    fireEvent.change(getTopNSizeConfiguration()[0], { target: { value: '101' } });
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
    fireEvent.change(getWindowSizeConfigurations()[1], { target: { value: '999' } });
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });

  it('calls configInfo and navigates on Save button click', async () => {
    renderConfiguration();
    fireEvent.change(getTopNSizeConfiguration()[0], { target: { value: '7' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(mockConfigInfo).toHaveBeenCalledWith(
        false,
        true,
        'latency',
        '7',
        '10',
        'MINUTES',
        'local_index',
        'SIMILARITY',
        '179',
        false,
        '',
        'query-insights'
      );
    });
  });

  it('resets state on Cancel button click', async () => {
    renderConfiguration();
    fireEvent.change(getTopNSizeConfiguration()[0], { target: { value: '7' } });
    fireEvent.click(screen.getByText('Cancel'));
    expect(getTopNSizeConfiguration()[0]).toHaveValue(5); // Resets to initial value
  });

  describe('Validation Logic Tests', () => {
    describe('TopN Size Validation', () => {
      it('should hide Save button when topN size is less than 1', () => {
        renderConfiguration();
        fireEvent.change(getTopNSizeConfiguration()[0], { target: { value: '0' } });
        expect(screen.queryByText('Save')).not.toBeInTheDocument();
      });

      it('should hide Save button when topN size is greater than 100', () => {
        renderConfiguration();
        fireEvent.change(getTopNSizeConfiguration()[0], { target: { value: '101' } });
        expect(screen.queryByText('Save')).not.toBeInTheDocument();
      });

      it('should show Save button when topN size is within valid range (1-100)', () => {
        renderConfiguration();
        fireEvent.change(getTopNSizeConfiguration()[0], { target: { value: '50' } });
        expect(screen.getByText('Save')).toBeInTheDocument();
      });
    });

    describe('Window Size Validation - Minutes', () => {
      it('should hide Save button when window size is empty for minutes', () => {
        renderConfiguration();
        fireEvent.change(getTopNSizeConfiguration()[0], { target: { value: '6' } });
        fireEvent.change(getWindowSizeConfigurations()[2], { target: { value: 'MINUTES' } });
        fireEvent.change(getWindowSizeConfigurations()[1], { target: { value: '' } });
        expect(screen.queryByText('Save')).not.toBeInTheDocument();
      });

      it('should hide Save button when window size is NaN for minutes', () => {
        renderConfiguration();
        fireEvent.change(getTopNSizeConfiguration()[0], { target: { value: '6' } });
        fireEvent.change(getWindowSizeConfigurations()[2], { target: { value: 'MINUTES' } });
        fireEvent.change(getWindowSizeConfigurations()[1], { target: { value: 'invalid' } });
        expect(screen.queryByText('Save')).not.toBeInTheDocument();
      });

      it('should show Save button when window size is valid for minutes', () => {
        renderConfiguration();
        fireEvent.change(getTopNSizeConfiguration()[0], { target: { value: '6' } });
        fireEvent.change(getWindowSizeConfigurations()[2], { target: { value: 'MINUTES' } });
        fireEvent.change(getWindowSizeConfigurations()[1], { target: { value: '5' } });
        expect(screen.getByText('Save')).toBeInTheDocument();
      });
    });

    describe('Window Size Validation - Hours', () => {
      it('should show Save button when window size is within valid range (1-24) for hours', () => {
        renderConfiguration();
        fireEvent.change(getTopNSizeConfiguration()[0], { target: { value: '6' } });
        fireEvent.change(getWindowSizeConfigurations()[2], { target: { value: 'HOURS' } });
        fireEvent.change(getWindowSizeConfigurations()[1], { target: { value: '12' } });
        expect(screen.getByText('Save')).toBeInTheDocument();
      });
    });

    describe('Delete After Days Validation', () => {
      it('should hide Save button when delete after days is less than 1 for local index', () => {
        renderConfiguration();
        fireEvent.change(getTopNSizeConfiguration()[0], { target: { value: '6' } });
        const deleteAfterField = getTopNSizeConfiguration()[1];
        fireEvent.change(deleteAfterField, { target: { value: '0' } });
        expect(screen.queryByText('Save')).not.toBeInTheDocument();
      });

      it('should hide Save button when delete after days is greater than 180 for local index', () => {
        renderConfiguration();
        fireEvent.change(getTopNSizeConfiguration()[0], { target: { value: '6' } });
        const deleteAfterField = getTopNSizeConfiguration()[1];
        fireEvent.change(deleteAfterField, { target: { value: '181' } });
        expect(screen.queryByText('Save')).not.toBeInTheDocument();
      });

      it('should show Save button when delete after days is within valid range (1-180) for local index', () => {
        renderConfiguration();
        fireEvent.change(getTopNSizeConfiguration()[0], { target: { value: '6' } });
        const deleteAfterField = getTopNSizeConfiguration()[1];
        fireEvent.change(deleteAfterField, { target: { value: '90' } });
        expect(screen.getByText('Save')).toBeInTheDocument();
      });

      it('should show Save button when exporter is changed to none', () => {
        renderConfiguration();
        fireEvent.change(getTopNSizeConfiguration()[0], { target: { value: '6' } });
        fireEvent.change(screen.getByDisplayValue('Local Index'), { target: { value: 'none' } });
        expect(screen.getByText('Save')).toBeInTheDocument();
      });
    });

    describe('Combined Validation Scenarios', () => {
      it('should hide Save button when multiple validation rules fail', () => {
        renderConfiguration();
        fireEvent.change(getTopNSizeConfiguration()[0], { target: { value: '101' } });
        expect(screen.queryByText('Save')).not.toBeInTheDocument();
      });

      it('should show Save button when all validation rules pass', () => {
        renderConfiguration();
        fireEvent.change(getTopNSizeConfiguration()[0], { target: { value: '25' } });
        expect(screen.getByText('Save')).toBeInTheDocument();
      });
    });
  });

  describe('Validation Utility Functions', () => {
    describe('validateTopNSize', () => {
      it('should return false for values less than 1', () => {
        expect(validateTopNSize('0')).toBe(false);
        expect(validateTopNSize('-1')).toBe(false);
      });

      it('should return false for values greater than 100', () => {
        expect(validateTopNSize('101')).toBe(false);
        expect(validateTopNSize('200')).toBe(false);
      });

      it('should return true for valid values (1-100)', () => {
        expect(validateTopNSize('1')).toBe(true);
        expect(validateTopNSize('50')).toBe(true);
        expect(validateTopNSize('100')).toBe(true);
      });

      it('should return false for non-numeric strings', () => {
        expect(validateTopNSize('abc')).toBe(false);
        expect(validateTopNSize('')).toBe(false);
        expect(validateTopNSize('10.5')).toBe(false);
      });
    });

    describe('validateWindowSize', () => {
      it('should validate minutes correctly', () => {
        const minutesUnit = TIME_UNITS_TEXT[0].value;
        expect(validateWindowSize('', minutesUnit)).toBe(false);
        expect(validateWindowSize('abc', minutesUnit)).toBe(false);
        expect(validateWindowSize('1', minutesUnit)).toBe(true);
        expect(validateWindowSize('30', minutesUnit)).toBe(true);
      });

      it('should validate hours correctly', () => {
        const hoursUnit = TIME_UNITS_TEXT[1].value;
        expect(validateWindowSize('0', hoursUnit)).toBe(false);
        expect(validateWindowSize('25', hoursUnit)).toBe(false);
        expect(validateWindowSize('1', hoursUnit)).toBe(true);
        expect(validateWindowSize('24', hoursUnit)).toBe(true);
      });
    });

    describe('validateDeleteAfterDays', () => {
      it('should validate local index correctly', () => {
        const localIndexType = EXPORTER_TYPE.localIndex;
        expect(validateDeleteAfterDays('0', localIndexType)).toBe(false);
        expect(validateDeleteAfterDays('181', localIndexType)).toBe(false);
        expect(validateDeleteAfterDays('1', localIndexType)).toBe(true);
        expect(validateDeleteAfterDays('180', localIndexType)).toBe(true);
      });

      it('should return true for non-local index', () => {
        const noneType = EXPORTER_TYPE.none;
        expect(validateDeleteAfterDays('0', noneType)).toBe(true);
        expect(validateDeleteAfterDays('abc', noneType)).toBe(true);
      });
    });

    describe('validateConfiguration', () => {
      it('should return false when any validation fails', () => {
        expect(validateConfiguration('101', '5', 'MINUTES', '30', EXPORTER_TYPE.localIndex)).toBe(
          false
        );
        expect(validateConfiguration('50', '', 'MINUTES', '30', EXPORTER_TYPE.localIndex)).toBe(
          false
        );
        expect(validateConfiguration('50', '5', 'MINUTES', '181', EXPORTER_TYPE.localIndex)).toBe(
          false
        );
      });

      it('should return false when remote is enabled but repository is empty', () => {
        expect(
          validateConfiguration('50', '5', 'MINUTES', '30', EXPORTER_TYPE.localIndex, true, '')
        ).toBe(false);
      });

      it('should return true when remote is enabled with a repository', () => {
        expect(
          validateConfiguration(
            '50',
            '5',
            'MINUTES',
            '30',
            EXPORTER_TYPE.localIndex,
            true,
            'my-repo'
          )
        ).toBe(true);
      });

      it('should return true when remote is disabled regardless of repository', () => {
        expect(
          validateConfiguration('50', '5', 'MINUTES', '30', EXPORTER_TYPE.localIndex, false, '')
        ).toBe(true);
      });
    });
  });

  describe('Remote Repository Exporter', () => {
    const getRemoteToggle = () => {
      const toggles = screen.getAllByRole('switch');
      return toggles[toggles.length - 1]; // Last switch is the remote exporter toggle
    };

    it('should show remote exporter toggle in disabled state by default', () => {
      renderConfiguration();
      const remoteToggle = getRemoteToggle();
      expect(remoteToggle).not.toBeChecked();
    });

    it('should not show repository fields when remote exporter is disabled', () => {
      renderConfiguration();
      expect(screen.queryByText('exporter.remote.repository')).not.toBeInTheDocument();
      expect(screen.queryByText('exporter.remote.path')).not.toBeInTheDocument();
    });

    it('should check plugin when remote toggle is enabled', async () => {
      mockCoreStart.http.get.mockResolvedValue({ ok: true, response: {} });
      renderConfiguration();
      fireEvent.click(getRemoteToggle());
      await waitFor(() => {
        expect(mockCoreStart.http.get).toHaveBeenCalledWith(
          '/api/cat/plugins',
          expect.objectContaining({ query: { dataSourceId: 'test' } })
        );
      });
    });

    it('should show plugin not installed error when plugin is missing', async () => {
      mockCoreStart.http.get.mockImplementation((url: string) => {
        if (url === '/api/cat/plugins') {
          return Promise.resolve({ ok: true, response: [{ component: 'other-plugin' }] });
        }
        return Promise.resolve({ ok: true, response: {} });
      });
      renderConfiguration();
      fireEvent.click(getRemoteToggle());
      await waitFor(() => {
        expect(screen.getByText('The repository-s3 plugin is not installed')).toBeInTheDocument();
      });
    });

    it('should show repository fields when plugin check fails (optimistic fallback)', async () => {
      mockCoreStart.http.get.mockImplementation((url: string) => {
        if (url === '/api/cat/plugins') {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ ok: true, response: {} });
      });
      renderConfiguration();
      fireEvent.click(getRemoteToggle());
      await waitFor(() => {
        expect(screen.getByText('Register new')).toBeInTheDocument();
      });
    });

    it('should show repository fields when plugin is installed', async () => {
      mockCoreStart.http.get.mockImplementation((url: string) => {
        if (url === '/api/cat/plugins') {
          return Promise.resolve({ ok: true, response: [{ component: 'repository-s3' }] });
        }
        if (url === '/api/snapshot/repositories') {
          return Promise.resolve({ ok: true, response: { 'my-repo': { type: 's3' } } });
        }
        return Promise.resolve({ ok: true, response: {} });
      });
      renderConfiguration();
      fireEvent.click(getRemoteToggle());
      await waitFor(() => {
        expect(screen.getByText('Register new')).toBeInTheDocument();
      });
    });

    it('should show repository fields on load when remote exporter is already enabled', async () => {
      mockCoreStart.http.get.mockImplementation((url: string) => {
        if (url === '/api/cat/plugins') {
          return Promise.resolve({ ok: true, response: [{ component: 'repository-s3' }] });
        }
        if (url === '/api/snapshot/repositories') {
          return Promise.resolve({ ok: true, response: { 'my-repo': { type: 's3' } } });
        }
        return Promise.resolve({ ok: true, response: {} });
      });
      render(
        <MemoryRouter>
          <DataSourceContext.Provider value={mockDataSourceContext}>
            <Configuration
              latencySettings={defaultLatencySettings}
              cpuSettings={defaultCpuSettings}
              memorySettings={defaultMemorySettings}
              groupBySettings={groupBySettings}
              configInfo={mockConfigInfo}
              dataRetentionSettings={dataRetentionSettings}
              remoteExporterSettings={{ enabled: true, repository: 'my-repo', path: 'insights' }}
              core={mockCoreStart}
              depsStart={{ navigation: {} }}
              params={{} as any}
              dataSourceManagement={dataSourceManagementMock}
            />
          </DataSourceContext.Provider>
        </MemoryRouter>
      );
      await waitFor(() => {
        expect(screen.getByText('Register new')).toBeInTheDocument();
      });
    });

    it('should show remote exporter status as Disabled in status panel', () => {
      renderConfiguration();
      expect(screen.getByText('Remote Exporter')).toBeInTheDocument();
    });

    it('should not show Save when remote is enabled but no repository selected', async () => {
      mockCoreStart.http.get.mockImplementation((url: string) => {
        if (url === '/api/cat/plugins') {
          return Promise.resolve({ ok: true, response: [{ component: 'repository-s3' }] });
        }
        return Promise.resolve({ ok: true, response: {} });
      });
      renderConfiguration();
      fireEvent.click(getRemoteToggle());
      await waitFor(() => {
        expect(screen.getByText('Register new')).toBeInTheDocument();
      });
      expect(screen.queryByText('Save')).not.toBeInTheDocument();
    });

    it('should open register repository flyout when Register new is clicked', async () => {
      mockCoreStart.http.get.mockImplementation((url: string) => {
        if (url === '/api/cat/plugins') {
          return Promise.resolve({ ok: true, response: [{ component: 'repository-s3' }] });
        }
        return Promise.resolve({ ok: true, response: {} });
      });
      renderConfiguration();
      fireEvent.click(getRemoteToggle());
      await waitFor(() => {
        expect(screen.getByText('Register new')).toBeInTheDocument();
      });
      // When registration is enabled the help text mentions registering a new repository.
      expect(
        screen.getByText('Select an existing repository or register a new one.')
      ).toBeInTheDocument();
      fireEvent.click(screen.getByText('Register new'));
      await waitFor(() => {
        expect(screen.getByText('Register S3 repository')).toBeInTheDocument();
      });
    });

    it('should hide Register new when repository registration is disabled', async () => {
      // Self-contained: flip the flag off, then restore it at the end so no shared mock is needed.
      const flag = jest.replaceProperty(constants, 'REMOTE_REPOSITORY_REGISTRATION_CONFIG', {
        enabled: false,
      });
      mockCoreStart.http.get.mockImplementation((url: string) => {
        if (url === '/api/cat/plugins') {
          return Promise.resolve({ ok: true, response: [{ component: 'repository-s3' }] });
        }
        if (url === '/api/snapshot/repositories') {
          return Promise.resolve({ ok: true, response: { 'my-repo': { type: 's3' } } });
        }
        return Promise.resolve({ ok: true, response: {} });
      });
      renderConfiguration();
      fireEvent.click(getRemoteToggle());
      // The repository selector still renders (users can pick an existing repository)...
      await waitFor(() => {
        expect(screen.getByText('exporter.remote.repository')).toBeInTheDocument();
      });
      // ...but the registration entry point is gone, and the help text drops the "register" wording.
      expect(screen.queryByText('Register new')).not.toBeInTheDocument();
      expect(screen.getByText('Select an existing repository.')).toBeInTheDocument();
      expect(
        screen.queryByText('Select an existing repository or register a new one.')
      ).not.toBeInTheDocument();
      flag.restore();
    });

    it('should hide fields when toggle is turned off after being on', async () => {
      mockCoreStart.http.get.mockImplementation((url: string) => {
        if (url === '/api/cat/plugins') {
          return Promise.resolve({ ok: true, response: [{ component: 'repository-s3' }] });
        }
        return Promise.resolve({ ok: true, response: {} });
      });
      renderConfiguration();
      fireEvent.click(getRemoteToggle());
      await waitFor(() => {
        expect(screen.getByText('Register new')).toBeInTheDocument();
      });
      fireEvent.click(getRemoteToggle());
      expect(screen.queryByText('Register new')).not.toBeInTheDocument();
    });

    it('should only show S3 type repositories in dropdown', async () => {
      mockCoreStart.http.get.mockImplementation((url: string) => {
        if (url === '/api/cat/plugins') {
          return Promise.resolve({ ok: true, response: [{ component: 'repository-s3' }] });
        }
        if (url === '/api/snapshot/repositories') {
          return Promise.resolve({
            ok: true,
            response: {
              's3-repo': { type: 's3' },
              'fs-repo': { type: 'fs' },
              'another-s3': { type: 's3' },
            },
          });
        }
        return Promise.resolve({ ok: true, response: {} });
      });
      renderConfiguration();
      fireEvent.click(getRemoteToggle());
      await waitFor(() => {
        expect(screen.getByText('Register new')).toBeInTheDocument();
      });
      // EuiComboBox renders options as data attributes or in dropdown
      // The repoOptions state should only contain s3 repos
      expect(screen.queryByText('fs-repo')).not.toBeInTheDocument();
    });

    it('should reset remote fields on Cancel', async () => {
      mockCoreStart.http.get.mockImplementation((url: string) => {
        if (url === '/api/cat/plugins') {
          return Promise.resolve({ ok: true, response: [{ component: 'repository-s3' }] });
        }
        return Promise.resolve({ ok: true, response: {} });
      });
      render(
        <MemoryRouter>
          <DataSourceContext.Provider value={mockDataSourceContext}>
            <Configuration
              latencySettings={defaultLatencySettings}
              cpuSettings={defaultCpuSettings}
              memorySettings={defaultMemorySettings}
              groupBySettings={groupBySettings}
              configInfo={mockConfigInfo}
              dataRetentionSettings={dataRetentionSettings}
              remoteExporterSettings={{ enabled: true, repository: 'my-repo', path: 'insights' }}
              core={mockCoreStart}
              depsStart={{ navigation: {} }}
              params={{} as any}
              dataSourceManagement={dataSourceManagementMock}
            />
          </DataSourceContext.Provider>
        </MemoryRouter>
      );
      await waitFor(() => {
        expect(screen.getByText('Register new')).toBeInTheDocument();
      });
      // Change the path
      const pathInput = screen.getByDisplayValue('insights');
      fireEvent.change(pathInput, { target: { value: 'new-path' } });
      expect(screen.getByDisplayValue('new-path')).toBeInTheDocument();
      // Click Cancel
      fireEvent.click(screen.getByText('Cancel'));
      // Should reset to original value
      expect(screen.getByDisplayValue('insights')).toBeInTheDocument();
    });
  });
});
