/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { HashRouter as Router } from 'react-router-dom';
import { AppMountParameters, CoreStart } from '../../../src/core/public';
import { QueryInsightsDashboardsApp } from './components/app';
import { QueryInsightsDashboardsPluginStartDependencies } from './types';
import { DataSourceManagementPluginSetup } from '../../../src/plugins/data_source_management/public';

export const renderApp = (
  core: CoreStart,
  depsStart: QueryInsightsDashboardsPluginStartDependencies,
  params: AppMountParameters,
  dataSourceManagement?: DataSourceManagementPluginSetup
) => {
  ReactDOM.render(
    <Router>
      <QueryInsightsDashboardsApp
        core={core}
        depsStart={depsStart}
        params={params}
        dataSourceManagement={dataSourceManagement}
      />
    </Router>,
    params.element
  );

  return () => ReactDOM.unmountComponentAtNode(params.element);
};
