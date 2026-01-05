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
} from '../../../src/core/public';
import {
  QueryInsightsDashboardsPluginSetup,
  QueryInsightsDashboardsPluginSetupDependencies,
  QueryInsightsDashboardsPluginStart,
  QueryInsightsDashboardsPluginStartDependencies,
} from './types';
import { PLUGIN_NAME } from '../common';
import { WLM_CONFIG } from '../common/constants';

export class QueryInsightsDashboardsPlugin
  implements
    Plugin<
      QueryInsightsDashboardsPluginSetup,
      QueryInsightsDashboardsPluginStart,
      {},
      QueryInsightsDashboardsPluginStartDependencies
    > {
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
      navLinkStatus: 'default', // Show Query Insights for all supported versions
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

        // Preserve data source from URL if navigating between apps
        const urlParams = new URLSearchParams(window.location.search);
        const dataSourceParam = urlParams.get('dataSource');
        if (dataSourceParam && !params.history.location.search.includes('dataSource')) {
          const newUrl = `${params.history.location.pathname}?dataSource=${encodeURIComponent(
            dataSourceParam
          )}`;
          params.history.replace(newUrl);
        }

        // Render the application
        return renderApp(
          coreStart,
          depsStart as QueryInsightsDashboardsPluginStartDependencies,
          params,
          deps.dataSourceManagement
        );
      },
    });

    if (WLM_CONFIG.enabled) {
      core.application.register({
        id: 'workloadManagement',
        title: 'Workload Management',
        appRoute: '/app/workload-management',
        description: 'Monitor and manage workload distribution across the cluster.',
        navLinkStatus: 'hidden', // Hide if version < 3.1
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

          // Preserve data source from URL if navigating between apps
          const urlParams = new URLSearchParams(window.location.search);
          const dataSourceParam = urlParams.get('dataSource');
          if (dataSourceParam && !params.history.location.search.includes('dataSource')) {
            const newUrl = `${params.history.location.pathname}?dataSource=${encodeURIComponent(
              dataSourceParam
            )}`;
            params.history.replace(newUrl);
          }

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
    if (WLM_CONFIG.enabled) {
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

  public start(core: CoreStart): QueryInsightsDashboardsPluginStart {
    // Override navigation behavior to preserve data source
    if (WLM_CONFIG.enabled) {
      core.chrome.navLinks.update('workloadManagement', {
        url: undefined,
        onClick: () => {
          const currentDataSource = new URLSearchParams(window.location.search).get('dataSource');
          const targetUrl = currentDataSource
            ? `/app/workload-management?dataSource=${encodeURIComponent(
                currentDataSource
              )}#/workloadManagement`
            : '/app/workload-management#/workloadManagement';
          window.location.href = targetUrl;
        },
      });
    }

    core.chrome.navLinks.update(PLUGIN_NAME, {
      url: undefined,
      onClick: () => {
        const currentDataSource = new URLSearchParams(window.location.search).get('dataSource');
        const targetUrl = currentDataSource
          ? `/app/query-insights-dashboards?dataSource=${encodeURIComponent(
              currentDataSource
            )}#/queryInsights`
          : '/app/query-insights-dashboards#/queryInsights';
        window.location.href = targetUrl;
      },
    });

    return {};
  }

  public stop() {}
}
