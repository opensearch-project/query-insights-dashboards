/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Route } from 'react-router-dom';
import { DataSourceManagementPluginSetup } from 'src/plugins/data_source_management/public';
import TopNQueries from '../pages/TopNQueries/TopNQueries';
import { AppMountParameters, CoreStart } from '../../../../src/core/public';
import { QueryInsightsDashboardsPluginStartDependencies } from '../types';

export const QueryInsightsDashboardsApp = ({
  core,
  depsStart,
  params,
  dataSourceManagement,
}: {
  core: CoreStart;
  depsStart: QueryInsightsDashboardsPluginStartDependencies;
  params: AppMountParameters;
  dataSourceManagement?: DataSourceManagementPluginSetup;
}) => {
  return (
    <Route
      render={() => (
        <TopNQueries
          core={core}
          depsStart={depsStart}
          params={params}
          dataSourceManagement={dataSourceManagement}
        />
      )}
    />
  );
};
