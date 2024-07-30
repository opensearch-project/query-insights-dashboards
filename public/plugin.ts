import { i18n } from '@osd/i18n';
import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '../../../src/core/public';
import { QueryInsightsDashboardsPluginSetup, QueryInsightsDashboardsPluginStart } from './types';
import { PLUGIN_NAME } from '../common';

export class QueryInsightsDashboardsPlugin
  implements Plugin<QueryInsightsDashboardsPluginSetup, QueryInsightsDashboardsPluginStart> {
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
        const [coreStart] = await core.getStartServices();
        // Render the application
        return renderApp(coreStart, params);
      },
    });

    // Return methods that should be available to other plugins
    return {
      getGreeting() {
        return i18n.translate('queryInsightsDashboards.greetingText', {
          defaultMessage: 'Hello from {name}!',
          values: {
            name: PLUGIN_NAME,
          },
        });
      },
    };
  }

  public start(core: CoreStart): QueryInsightsDashboardsPluginStart {
    return {};
  }

  public stop() {}
}
