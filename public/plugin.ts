/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  DEFAULT_NAV_GROUPS,
  Plugin,
  PluginInitializerContext,
} from '../../../src/core/public';
import {
  QueryInsightsDashboardsPluginSetup,
  QueryInsightsDashboardsPluginSetupDependencies,
  QueryInsightsDashboardsPluginStart,
  QueryInsightsDashboardsPluginStartDependencies,
} from './types';
import { PLUGIN_NAME } from '../common';

interface ConfigSchema {
  wlm: { enabled: boolean };
}
const defaultConfig: ConfigSchema = { wlm: { enabled: true } };
export const WLM_CONFIG = defaultConfig.wlm;

export class QueryInsightsDashboardsPlugin
  implements
    Plugin<
      QueryInsightsDashboardsPluginSetup,
      QueryInsightsDashboardsPluginStart,
      {},
      QueryInsightsDashboardsPluginStartDependencies
    > {
  private config: ConfigSchema = defaultConfig; // default ON

  constructor(_ctx: PluginInitializerContext) {}

  public setup(
    core: CoreSetup,
    deps: QueryInsightsDashboardsPluginSetupDependencies
  ): QueryInsightsDashboardsPluginSetup {
    // Register an application into the side navigation menu
    core.application.register({
      id: PLUGIN_NAME,
      title: 'Query Insights',
      // @ts-ignore
      description:
        'Monitor and analyze queries using the Query Insights Plugin, which ranks queries based on their resource utilization (CPU, JVM) and latencies',
      category: {
        id: 'opensearch',
        label: 'OpenSearch Plugins',
        // Order 2000 positions this category after core OpenSearch categories
        order: 2000,
      },
      // Order 5000 places Query Insights within the OpenSearch Plugins category
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
          params,
          deps.dataSourceManagement
        );
      },
    });

    if (this.config.wlm.enabled) {
      core.application.register({
        id: 'workloadManagement',
        title: 'Workload Management',
        appRoute: '/app/workload-management',
        description: 'Monitor and manage workload distribution across the cluster.',
        category: {
          id: 'opensearch',
          label: 'OpenSearch Plugins',
          // Order 2000 positions this category after core OpenSearch categories
          order: 2000,
        },
        // Order 5100 places Workload Management after Query Insights (5000)
        order: 5100,
        async mount(params: AppMountParameters) {
          // Dynamically import the WLM page
          const { renderApp } = await import('./application');

          const [coreStart, depsStart] = await core.getStartServices();

          return renderApp(
            coreStart,
            depsStart as QueryInsightsDashboardsPluginStartDependencies,
            params,
            deps.dataSourceManagement
          );
        },
      });
    }

    // Registration for new navigation
    core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.dataAdministration, [
      {
        id: PLUGIN_NAME,
        category: {
          id: 'performance',
          label: 'Performance',
          // Order 9000 positions Performance category at the end of Data Administration
          order: 9000,
          euiIconType: 'managementApp',
        },
        // Order 200 places this item within the Performance category
        order: 200,
      },
    ]);
    if (this.config.wlm.enabled) {
      core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.dataAdministration, [
        {
          id: 'workloadManagement',
          category: {
            id: 'performance',
            label: 'Performance',
            // Order 9000 positions Performance category at the end of Data Administration
            order: 9000,
            euiIconType: 'managementApp',
          },
          // Order 200 places this item within the Performance category
          order: 200,
        },
      ]);
    }

    return {};
  }

  public start(_core: CoreStart): QueryInsightsDashboardsPluginStart {
    return {};
  }

  public stop() {}
}
