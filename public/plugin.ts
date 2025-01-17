/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  DEFAULT_NAV_GROUPS,
  Plugin,
} from '../../../src/core/public';
import {
  QueryInsightsDashboardsPluginSetup,
  QueryInsightsDashboardsPluginStart,
  QueryInsightsDashboardsPluginStartDependencies,
} from './types';
import { PLUGIN_NAME } from '../common';

export class QueryInsightsDashboardsPlugin
  implements
    Plugin<
      QueryInsightsDashboardsPluginSetup,
      QueryInsightsDashboardsPluginStart,
      {},
      QueryInsightsDashboardsPluginStartDependencies
    > {
  public setup(core: CoreSetup): QueryInsightsDashboardsPluginSetup {
    // Register an application into the side navigation menu
    core.application.register({
      id: PLUGIN_NAME,
      title: 'Query Insights',
      // @ts-ignore
      description: 'OpenSearch Dashboards Query Insights Plugin',
      category: {
        id: 'opensearch',
        label: 'OpenSearch Plugins',
        order: 2000,
      },
      order: 5000,
      async mount(params: AppMountParameters) {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services as specified in opensearch_dashboards.json
        const [coreStart, depsStart] = await core.getStartServices();
        // Render the application
        return renderApp(
          coreStart,
          depsStart as QueryInsightsDashboardsPluginStartDependencies,
          params
        );
      },
    });

    // Registration for new navigation
    core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.observability, [
      {
        id: PLUGIN_NAME,
        category: DEFAULT_APP_CATEGORIES.manage,
        order: 200,
      },
    ]);
    core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.all, [
      {
        id: PLUGIN_NAME,
        category: DEFAULT_APP_CATEGORIES.manage,
        order: 200,
      },
    ]);
    core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.search, [
      {
        id: PLUGIN_NAME,
        category: DEFAULT_APP_CATEGORIES.manage,
        order: 200,
      },
    ]);
    core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.essentials, [
      {
        id: PLUGIN_NAME,
        category: DEFAULT_APP_CATEGORIES.manage,
        order: 200,
      },
    ]);

    return {};
  }

  public start(_core: CoreStart): QueryInsightsDashboardsPluginStart {
    return {};
  }

  public stop() {}
}
