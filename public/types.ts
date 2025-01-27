/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataSourcePluginStart } from '../../../src/plugins/data_source/public';
import { DataSourceManagementPluginSetup } from '../../../src/plugins/data_source_management/public';
import { NavigationPublicPluginStart } from '../../../src/plugins/navigation/public';

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface QueryInsightsDashboardsPluginSetup {}
export interface QueryInsightsDashboardsPluginStart {}
export interface QueryInsightsDashboardsPluginStartDependencies {
  dataSource?: DataSourcePluginStart;
}
export interface QueryInsightsDashboardsPluginSetupDependencies {
  dataSourceManagement?: DataSourceManagementPluginSetup;
}
/* eslint-enable @typescript-eslint/no-empty-interface */

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
  dataSource?: DataSourcePluginStart;
}
