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
export interface QueryInsightsDashboardsPluginSetupDependencies {
  dataSourceManagement?: DataSourceManagementPluginSetup;
}
/* eslint-enable @typescript-eslint/no-empty-interface */

export interface MetricSettingsResponse {
  enabled?: string; // Could be 'true' or 'false'
  window_size?: string; // E.g., '15m', '1h'
  top_n_size?: string;
}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
  dataSource?: DataSourcePluginStart;
}
