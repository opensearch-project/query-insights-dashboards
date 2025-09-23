/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { CoreSetup, CoreStart } from '../../../src/core/public';
import { QueryInsightsDashboardsPlugin } from './plugin';
import { PLUGIN_NAME } from '../common';
import { renderApp } from './application';
import { coreMock } from '../../../src/core/public/mocks';
import { WLM_CONFIG } from '../common/constants';

jest.mock('./application', () => ({
  renderApp: jest.fn(),
}));

jest.mock('../common/constants', () => ({
  WLM_CONFIG: { enabled: true }, // default mocked value
}));

describe('QueryInsightsDashboardsPlugin', () => {
  let plugin: QueryInsightsDashboardsPlugin;
  let coreSetupMock: jest.Mocked<CoreSetup>;
  let coreStartMock: jest.Mocked<CoreStart>;
  let registerMock: jest.Mock;

  beforeEach(() => {
    coreSetupMock = coreMock.createSetup();
    coreStartMock = coreMock.createStart();

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
    coreSetupMock.getStartServices.mockResolvedValue([coreStartMock, depsMock]);

    await mountFunction(paramsMock);

    expect(renderApp).toHaveBeenCalledWith(
      coreStartMock,
      depsMock,
      expect.objectContaining({ element: expect.any(HTMLElement) }),
      depsMock.dataSourceManagement
    );
  });

  it('registers WLM when enabled', () => {
    plugin.setup(coreSetupMock, {} as any);

    expect(registerMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'workloadManagement' })
    );
  });

  it('does NOT register WLM when disabled', () => {
    // override the mocked export for this test
    (WLM_CONFIG as any).enabled = false;
    plugin.setup(coreSetupMock, {} as any);

    expect(registerMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'workloadManagement' })
    );
  });

  it('registers only Query Insights when WLM disabled', () => {
    (WLM_CONFIG as any).enabled = false;
    plugin.setup(coreSetupMock, {} as any);

    const calls = registerMock.mock.calls.map(([app]: any) => ({
      id: app.id,
      title: app.title,
    }));

    expect(registerMock).toHaveBeenCalledTimes(1);
    expect(calls).toEqual([{ id: PLUGIN_NAME, title: 'Query Insights' }]);
  });

  it('registers Query Insights and Workload Management when WLM enabled', () => {
    (WLM_CONFIG as any).enabled = true;
    plugin.setup(coreSetupMock, {} as any);

    const calls = registerMock.mock.calls.map(([app]: any) => ({
      id: app.id,
      title: app.title,
    }));

    expect(registerMock).toHaveBeenCalledTimes(2);
    expect(calls).toEqual([
      { id: PLUGIN_NAME, title: 'Query Insights' },
      { id: 'workloadManagement', title: 'Workload Management' },
    ]);
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
    // Ensures `start` and `stop` do not introduce unwanted behavior
    expect(plugin.start(coreStartMock)).toEqual({});
    expect(plugin.stop()).toBeUndefined();
  });
});
