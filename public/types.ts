import { NavigationPublicPluginStart } from '../../../src/plugins/navigation/public';

export interface QueryInsightsDashboardsPluginSetup {
  getGreeting: () => string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface QueryInsightsDashboardsPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}
