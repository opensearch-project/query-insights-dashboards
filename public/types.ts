/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { NavigationPublicPluginStart } from '../../../src/plugins/navigation/public';

export interface QueryInsightsDashboardsPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface QueryInsightsDashboardsPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}
