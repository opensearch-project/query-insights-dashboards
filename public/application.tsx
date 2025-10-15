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
import {
  setCore,
  setSavedObjectsClient,
  setRouteService,
  setDataSourceManagementPlugin,
  setDataSourceEnabled,
  setNotifications,
  setUISettings,
  setApplication,
  setNavigationUI,
  setHeaderActionMenu,
} from './service';
import { RouteService } from './route_service';

export const renderApp = (
  core: CoreStart,
  depsStart: QueryInsightsDashboardsPluginStartDependencies,
  params: AppMountParameters,
  dataSourceManagement?: DataSourceManagementPluginSetup
) => {
  // Initialize services
  setCore(core);
  setSavedObjectsClient(core.savedObjects.client);
  setRouteService(new RouteService(core.http));
  setNotifications(core.notifications);
  setUISettings(core.uiSettings);
  setApplication(core.application);
  setHeaderActionMenu(params.setHeaderActionMenu);

  if (dataSourceManagement) {
    setDataSourceManagementPlugin(dataSourceManagement);
  }

  if (depsStart.navigation) {
    setNavigationUI(depsStart.navigation.ui);
  }

  setDataSourceEnabled({ enabled: !!dataSourceManagement });

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
