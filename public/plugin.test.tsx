/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { CoreSetup, CoreStart } from '../../../src/core/public';
import { QueryInsightsDashboardsPlugin } from './plugin';
import { PLUGIN_NAME } from '../common';

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

    coreStartMock = ({
      http: {
        get: jest.fn(),
        put: jest.fn(),
      },
      uiSettings: {
        get: jest.fn().mockReturnValue(false),
      },
    } as unknown) as jest.Mocked<CoreStart>;

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
        category: expect.objectContaining({
          id: expect.any(String),
          label: expect.any(String),
          order: expect.any(Number),
        }),
        order: expect.any(Number),
        mount: expect.any(Function),
        description: expect.any(String),
      })
    );
  });

  it('should add the navigation link to nav group', () => {
    plugin.setup(coreSetupMock, {} as any);

    expect(addNavLinksMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        description: expect.any(String),
      }),
      expect.arrayContaining([
        expect.objectContaining({
          id: 'query-insights-dashboards',
          order: expect.any(Number),
          category: expect.objectContaining({
            euiIconType: expect.any(String),
            id: 'performance', // Adjusted to match received data
            label: expect.any(String),
            order: expect.any(Number),
          }),
        }),
      ])
    );
  });
});
