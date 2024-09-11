/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import './index.scss';

import { QueryInsightsDashboardsPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, OpenSearch Dashboards Platform `plugin()` initializer.
export function plugin() {
  return new QueryInsightsDashboardsPlugin();
}
export { QueryInsightsDashboardsPluginSetup, QueryInsightsDashboardsPluginStart } from './types';
