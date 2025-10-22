/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
  ILegacyCustomClusterClient,
} from '../../../src/core/server';
import { QueryInsightsPlugin } from './clusters/queryInsightsPlugin';
import { WlmPlugin } from './clusters/wlmPlugin';

import { QueryInsightsDashboardsPluginSetup, QueryInsightsDashboardsPluginStart } from './types';
import { defineRoutes } from './routes';
import { defineWlmRoutes } from './routes/wlmRoutes';
import { DataSourcePluginSetup } from '../../../src/plugins/data_source/server/types';

export interface QueryInsightsDashboardsPluginSetupDependencies {
  dataSource: DataSourcePluginSetup;
}

export class QueryInsightsDashboardsPlugin
  implements Plugin<QueryInsightsDashboardsPluginSetup, QueryInsightsDashboardsPluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, { dataSource }: QueryInsightsDashboardsPluginSetupDependencies) {
    const dataSourceEnabled = !!dataSource;
    const router = core.http.createRouter();
    const queryInsightsClient: ILegacyCustomClusterClient = core.opensearch.legacy.createClient(
      'opensearch_queryInsights',
      {
        plugins: [QueryInsightsPlugin],
      }
    );
    if (dataSourceEnabled) {
      dataSource.registerCustomApiSchema(QueryInsightsPlugin);
    }

    // @ts-ignore
    core.http.registerRouteHandlerContext('queryInsights_plugin', (_context, _request) => {
      return {
        logger: this.logger,
        queryInsightsClient,
      };
    });
    // Register WLM custom client
    const wlmClient: ILegacyCustomClusterClient = core.opensearch.legacy.createClient(
      'opensearch_wlm',
      {
        plugins: [WlmPlugin],
      }
    );
    if (dataSourceEnabled) {
      dataSource.registerCustomApiSchema(WlmPlugin);
    }

    // @ts-ignore - Register WLM context
    core.http.registerRouteHandlerContext('wlm_plugin', (_context, _request) => {
      return {
        logger: this.logger,
        wlmClient,
      };
    });

    // Register server side APIs
    defineRoutes(router, dataSourceEnabled);
    defineWlmRoutes(router, dataSourceEnabled);

    return {};
  }

  public start(_core: CoreStart) {
    this.logger.debug('query-insights-dashboards: Started');
    return {};
  }

  public stop() {}
}
