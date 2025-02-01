/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { CoreSetup, CoreStart } from '../../../src/core/public';
import { QueryInsightsDashboardsPlugin } from './plugin';
import { PLUGIN_NAME } from '../common';
import { renderApp } from './application';

jest.mock('./application', () => ({
  renderApp: jest.fn(),
}));

describe('QueryInsightsDashboardsPlugin', () => {
  let plugin: QueryInsightsDashboardsPlugin;
  let coreSetupMock: jest.Mocked<CoreSetup>;
  let coreStartMock: jest.Mocked<CoreStart>;
  let registerMock: jest.Mock;
  let addNavLinksMock: jest.Mock;

  beforeEach(() => {
    coreSetupMock = ({
      application: {
        register: jest.fn(),
      },
      chrome: {
        navGroup: {
          addNavLinksToGroup: jest.fn(),
        },
      },
      getStartServices: jest.fn().mockResolvedValue([coreStartMock, {}]),
    } as unknown) as jest.Mocked<CoreSetup>;

    coreStartMock = {} as jest.Mocked<CoreStart>;

    plugin = new QueryInsightsDashboardsPlugin();
    registerMock = coreSetupMock.application.register;
    addNavLinksMock = coreSetupMock.chrome.navGroup.addNavLinksToGroup;
  });

  it('should register the application in setup', () => {
    plugin.setup(coreSetupMock, {} as any);

    expect(registerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: PLUGIN_NAME,
        title: 'Query Insights',
      })
    );
  });

  it('should mount the application correctly', async () => {
    plugin.setup(coreSetupMock, {} as any);

    const appRegistration = registerMock.mock.calls[0][0]; // Get the registered app config
    expect(appRegistration).toBeDefined();

    const paramsMock = { element: document.createElement('div') };
    const mountFunction = appRegistration.mount;

    await mountFunction(paramsMock);

    expect(renderApp).toHaveBeenCalled();
  });

  it('should add the navigation link to nav group', () => {
    plugin.setup(coreSetupMock, {} as any);
    expect(addNavLinksMock).toHaveBeenCalled();
  });

  it('should return empty start and stop methods', () => {
    expect(plugin.start(coreStartMock)).toEqual({});
    expect(plugin.stop()).toBeUndefined();
  });
});
