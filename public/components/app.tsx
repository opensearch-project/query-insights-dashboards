/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { DataSourceManagementPluginSetup } from 'src/plugins/data_source_management/public';
import TopNQueries from '../pages/TopNQueries/TopNQueries';
import { WorkloadManagement } from '../pages/WorkloadManagement/WorkloadManagement';
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
  const isWLMApp = params.appBasePath.includes('workload-management'); // Check if the path includes 'workload-management'

  return (
    <Switch>
      {isWLMApp && (
        <Route path="/">
          <WorkloadManagement
            core={core}
            depsStart={depsStart}
            params={params}
            dataSourceManagement={dataSourceManagement}
          />
        </Route>
      )}

      {!isWLMApp && (
        <Route path="/">
          <TopNQueries
            core={core}
            depsStart={depsStart}
            params={params}
            dataSourceManagement={dataSourceManagement}
          />
        </Route>
      )}
    </Switch>
  );
};
