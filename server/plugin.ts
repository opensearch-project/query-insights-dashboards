import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../src/core/server';

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
