import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
  ILegacyCustomClusterClient,
} from '../../../src/core/server';
import { QueryInsightsPlugin } from './clusters/queryInsightsPlugin';

import { QueryInsightsDashboardsPluginSetup, QueryInsightsDashboardsPluginStart } from './types';
import { defineRoutes } from './routes';

export class QueryInsightsDashboardsPlugin
  implements Plugin<QueryInsightsDashboardsPluginSetup, QueryInsightsDashboardsPluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('query-insights-dashboards: Setup');
    const router = core.http.createRouter();
    const queryInsightsClient: ILegacyCustomClusterClient = core.opensearch.legacy.createClient(
      'opensearch_queryInsights',
      {
        plugins: [QueryInsightsPlugin],
      }
    );
    // @ts-ignore
    core.http.registerRouteHandlerContext('queryInsights_plugin', (_context, _request) => {
      return {
        logger: this.logger,
        queryInsightsClient,
      };
    });

    // Register server side APIs
    defineRoutes(router);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('query-insights-dashboards: Started');
    return {};
  }

  public stop() {}
}
