/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Route } from 'react-router-dom';
import TopNQueries from '../pages/TopNQueries/TopNQueries';
import { CoreStart } from '../../../../src/core/public';
import { QueryInsightsDashboardsPluginStartDependencies } from '../types';

export const QueryInsightsDashboardsApp = ({
  core,
  depsStart,
}: {
  core: CoreStart;
  depsStart: QueryInsightsDashboardsPluginStartDependencies;
}) => {
  return <Route render={() => <TopNQueries core={core} depsStart={depsStart} />} />;
};
