/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { CoreStart } from 'opensearch-dashboards/public';
import { WLMDetails } from './WLMDetails';
import { DataSourceContext } from '../WorkloadManagement';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ push: jest.fn() }),
}));

jest.mock('../../../components/PageHeader', () => ({
  PageHeader: () => <div data-testid="mock-page-header">Mocked PageHeader</div>,
}));

const MockDataSourceMenu = (_props: any) => <div>Mocked Data Source Menu</div>;

const mockDataSourceManagement = {
  ui: {
    getDataSourceMenu: jest.fn(() => MockDataSourceMenu),
  },
} as any;

const mockParams = {
  setHeaderActionMenu: jest.fn(),
} as any;

const groupResponse = {
  workload_groups: [
    {
      _id: 'wg-123',
      name: 'test-group',
      resource_limits: { cpu: 0.5, memory: 0.5 },
      resiliency_mode: 'SOFT',
    },
  ],
};

// dataSourceEnabled=false bypasses the version gate, isolating the
// security-plugin probe path under test.
const noDsDeps = { dataSource: { dataSourceEnabled: false } } as any;
const localDataSource = { id: '', name: '', label: '' } as any;

const buildCore = (): CoreStart =>
  (({
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
  } as unknown) as CoreStart);

const setRouting = (core: CoreStart, securityImpl: (path: string) => Promise<any> | undefined) => {
  (core.http.get as jest.Mock).mockImplementation((path: string) => {
    const overridden = securityImpl(path);
    if (overridden) return overridden;
    if (path.startsWith('/api/_wlm/workload_group/test-group')) {
      return Promise.resolve(groupResponse);
    }
    if (path === '/api/_rules/workload_group') {
      return Promise.resolve({
        rules: [
          {
            id: 'r1',
            description: 'd',
            index_pattern: ['keep-*'],
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
};

const renderWith = (core: CoreStart, name = 'test-group') => {
  render(
    <MemoryRouter initialEntries={[`/wlm-details?name=${name}`]}>
      <DataSourceContext.Provider value={{ dataSource: localDataSource, setDataSource: jest.fn() }}>
        <WLMDetails
          core={core}
          depsStart={noDsDeps}
          params={mockParams}
          dataSourceManagement={mockDataSourceManagement}
        />
      </DataSourceContext.Provider>
    </MemoryRouter>
  );
};

describe('WLMDetails — security plugin gating', () => {
  it('disables Username and Role inputs when Security plugin is not installed', async () => {
    const core = buildCore();
    setRouting(core, (path) => {
      if (path === '/api/cat/plugins') {
        return Promise.resolve({ ok: true, response: [{ component: 'workload-management' }] });
      }
      return undefined;
    });

    renderWith(core);
    fireEvent.click(screen.getByTestId('wlm-tab-settings'));
    await waitFor(() => expect(screen.getByText(/Workload group settings/i)).toBeInTheDocument());

    await waitFor(() => {
      const inputs = screen.getAllByPlaceholderText('Enter username');
      expect(inputs[0]).toBeDisabled();
    });
    await waitFor(() => {
      expect(
        screen.queryAllByText(/Requires the OpenSearch Security plugin/i).length
      ).toBeGreaterThan(0);
    });
  });

  it('disables Username/Role when Security plugin is installed but disabled', async () => {
    const core = buildCore();
    setRouting(core, (path) => {
      if (path === '/api/cat/plugins') {
        return Promise.resolve({
          ok: true,
          response: [{ component: 'opensearch-security' }],
        });
      }
      if (path === '/api/_plugins/_security/health') {
        return Promise.resolve({ ok: true, available: false });
      }
      return undefined;
    });

    renderWith(core);
    fireEvent.click(screen.getByTestId('wlm-tab-settings'));
    await waitFor(() => expect(screen.getByText(/Workload group settings/i)).toBeInTheDocument());

    await waitFor(async () => {
      const usernameInput = await screen.findByPlaceholderText('Enter username');
      expect(usernameInput).toBeDisabled();
    });
  });

  it('keeps Username/Role enabled when Security plugin is active', async () => {
    const core = buildCore();
    setRouting(core, (path) => {
      if (path === '/api/cat/plugins') {
        return Promise.resolve({
          ok: true,
          response: [{ component: 'opensearch-security' }],
        });
      }
      if (path === '/api/_plugins/_security/health') {
        return Promise.resolve({ ok: true, available: true });
      }
      return undefined;
    });

    renderWith(core);
    fireEvent.click(screen.getByTestId('wlm-tab-settings'));
    await waitFor(() => expect(screen.getByText(/Workload group settings/i)).toBeInTheDocument());

    await waitFor(async () => {
      const usernameInput = await screen.findByPlaceholderText('Enter username');
      expect(usernameInput).not.toBeDisabled();
    });
  });

  it('rewrites the cryptic principal save error to point at the Security plugin', async () => {
    const core = buildCore();
    setRouting(core, (path) => {
      if (path === '/api/cat/plugins') {
        return Promise.resolve({ ok: true, response: [{ component: 'workload-management' }] });
      }
      return undefined;
    });

    (core.http.put as jest.Mock).mockRejectedValueOnce({
      body: {
        message:
          '[x_content_parse_exception] principal is not a valid attribute within the workload_group feature.',
      },
    });

    renderWith(core);
    fireEvent.click(screen.getByTestId('wlm-tab-settings'));
    await waitFor(() => expect(screen.getByText(/Workload group settings/i)).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Enforced'));
    });

    const applyButton = await screen.findByRole('button', { name: /apply changes/i });
    await waitFor(() => expect(applyButton).not.toBeDisabled());
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(core.notifications.toasts.addDanger).toHaveBeenCalledWith(
        expect.stringMatching(/OpenSearch Security plugin/i)
      );
    });
  });
});
