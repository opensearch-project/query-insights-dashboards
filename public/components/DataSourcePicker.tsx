/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  DataSourceManagementPluginSetup,
  DataSourceSelectableConfig,
} from 'src/plugins/data_source_management/public';
import { AppMountParameters, CoreStart } from '../../../../src/core/public';
import { QueryInsightsDashboardsPluginStartDependencies } from '../types';

export interface DataSourceMenuProps {
  dataSourceManagement: DataSourceManagementPluginSetup;
  depsStart: QueryInsightsDashboardsPluginStartDependencies;
  coreStart: CoreStart;
  params: AppMountParameters;
}

export const QueryInsightsDataSourceMenu = (props: DataSourceMenuProps) => {
  const { coreStart, depsStart, dataSourceManagement, params } = props;
  const { setHeaderActionMenu } = params;
  const DataSourceMenu = dataSourceManagement?.ui.getDataSourceMenu<DataSourceSelectableConfig>();

  const dataSourceEnabled = !!depsStart.dataSource?.dataSourceEnabled;

  return dataSourceEnabled ? (
    <DataSourceMenu
      setMenuMountPoint={setHeaderActionMenu}
      componentType={'DataSourceSelectable'}
      componentConfig={{
        savedObjects: coreStart.savedObjects.client,
        notifications: coreStart.notifications,
        // activeOption:
        //   selectedDataSource.id || selectedDataSource.label ? [selectedDataSource] : undefined,
        onSelectedDataSources: () => {}, // TODO: update url,
        fullWidth: true,
      }}
    />
  ) : null;
};
