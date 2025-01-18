/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { NavigationPublicPluginStart } from '../../../src/plugins/navigation/public';

export interface QueryInsightsDashboardsPluginSetup {
  getGreeting: () => string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface QueryInsightsDashboardsPluginStart {}

export interface MetricSettingsResponse {
  enabled?: string; // Could be 'true' or 'false'
  window_size?: string; // E.g., '15m', '1h'
  top_n_size?: string;
}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}
