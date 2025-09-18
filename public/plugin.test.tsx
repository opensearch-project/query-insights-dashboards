/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { CoreSetup, CoreStart, DEFAULT_NAV_GROUPS } from '../../../src/core/public';
import { QueryInsightsDashboardsPlugin, WLM_CONFIG } from './plugin';
import { PLUGIN_NAME } from '../common';
import { renderApp } from './application';
import { coreMock } from '../../../src/core/public/mocks';

jest.mock('./application', () => ({
  renderApp: jest.fn(),
}));

describe('QueryInsightsDashboardsPlugin', () => {
  let plugin: QueryInsightsDashboardsPlugin;
  let coreSetupMock: jest.Mocked<CoreSetup>;
  let coreStartMock: jest.Mocked<CoreStart>;
  let registerMock: jest.Mock;
  let addNavLinksToGroupMock: jest.Mock;

  beforeEach(() => {
    coreSetupMock = coreMock.createSetup();
    coreStartMock = coreMock.createStart();
    addNavLinksToGroupMock = jest.fn();

    // Properly mock the navGroup structure
    coreSetupMock.chrome.navGroup = {
      addNavLinksToGroup: addNavLinksToGroupMock,
    } as any;

    plugin = new QueryInsightsDashboardsPlugin();
    registerMock = coreSetupMock.application.register;
  });

  it('should register the application in setup', () => {
    plugin.setup(coreSetupMock, {} as any);

    expect(registerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: PLUGIN_NAME,
        title: 'Query Insights',
        category: expect.objectContaining({
          id: expect.any(String),
          label: expect.any(String),
          order: expect.any(Number),
        }),
        mount: expect.any(Function),
        order: expect.any(Number),
        description: expect.any(String),
      })
    );
  });

  it('should mount the application correctly', async () => {
    plugin.setup(coreSetupMock, {} as any);

    const appRegistration = registerMock.mock.calls[0][0];
    expect(appRegistration).toBeDefined();

    const paramsMock = { element: document.createElement('div') };
    const mountFunction = appRegistration.mount;

    await mountFunction(paramsMock);

    const depsMock = { dataSourceManagement: undefined };
    coreSetupMock.getStartServices.mockResolvedValue([coreStartMock, depsMock, undefined]);

    await mountFunction(paramsMock);

    expect(renderApp).toHaveBeenCalledWith(
      coreStartMock,
      depsMock,
      expect.objectContaining({ element: expect.any(HTMLElement) }),
      depsMock.dataSourceManagement
    );
  });

  if (WLM_CONFIG.enabled) {
    it('should register workload management application', () => {
      plugin.setup(coreSetupMock, {} as any);

      expect(registerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'workloadManagement',
          title: 'Workload Management',
          appRoute: '/app/workload-management',
          description: 'Monitor and manage workload distribution across the cluster.',
          category: expect.objectContaining({
            id: 'opensearch',
            label: 'OpenSearch Plugins',
            order: 2000,
          }),
          order: 5100,
          mount: expect.any(Function),
        })
      );
    });
  }

  it('should register both applications in correct order', () => {
    plugin.setup(coreSetupMock, {} as any);
    const calls = registerMock.mock.calls.map(([app]) => ({
      id: app.id,
      title: app.title,
    }));

    const expected = WLM_CONFIG.enabled
      ? [
          { id: PLUGIN_NAME, title: 'Query Insights' },
          { id: 'workloadManagement', title: 'Workload Management' },
        ]
      : [{ id: PLUGIN_NAME, title: 'Query Insights' }];

    expect(registerMock).toHaveBeenCalledTimes(expected.length);
    expect(calls).toEqual(expected);
  });

  it('should add navigation links to group', () => {
    plugin.setup(coreSetupMock, {} as any);

    expect(addNavLinksToGroupMock).toHaveBeenCalledWith(DEFAULT_NAV_GROUPS.dataAdministration, [
      {
        id: PLUGIN_NAME,
        category: {
          id: 'performance',
          label: 'Performance',
          order: 9000,
          euiIconType: 'managementApp',
        },
        order: 200,
      },
    ]);
  });

  it('should return empty start and stop methods', () => {
    expect(plugin.start(coreStartMock)).toEqual({});
    expect(plugin.stop()).toBeUndefined();
  });
});
