/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { PluginInitializerContext } from '../../../src/core/server';
import { QueryInsightsDashboardsPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, OpenSearch Dashboards Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new QueryInsightsDashboardsPlugin(initializerContext);
}

export { QueryInsightsDashboardsPluginSetup, QueryInsightsDashboardsPluginStart } from './types';
