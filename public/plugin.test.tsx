/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { CoreSetup, CoreStart } from '../../../src/core/public';
import { QueryInsightsDashboardsPlugin } from './plugin';
import { PLUGIN_NAME } from '../common';
import { mountQueryInsightsDashboards } from './application';
import { coreMock } from '../../../src/core/public/mocks';

jest.mock('./application', () => ({
  mountQueryInsightsDashboards: jest.fn(),
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

    expect(mountQueryInsightsDashboards).toHaveBeenCalledWith(
      coreStartMock,
      depsMock,
      expect.objectContaining({ element: expect.any(HTMLElement) }),
      depsMock.dataSourceManagement
    );
  });

  it('should return empty start and stop methods', () => {
    // Ensures `start` and `stop` do not introduce unwanted behavior
    expect(plugin.start(coreStartMock)).toEqual({});
    expect(plugin.stop()).toBeUndefined();
  });
});
