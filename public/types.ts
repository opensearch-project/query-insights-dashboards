/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { NavigationPublicPluginStart } from '../../../src/plugins/navigation/public';

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface QueryInsightsDashboardsPluginSetup {}
export interface QueryInsightsDashboardsPluginStart {}
/* eslint-enable @typescript-eslint/no-empty-interface */

export interface QueryInsightsDashboardsPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}
