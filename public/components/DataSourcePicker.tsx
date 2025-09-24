/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  DataSourceManagementPluginSetup,
  DataSourceOption,
  DataSourceSelectableConfig,
} from 'src/plugins/data_source_management/public';
import { AppMountParameters, CoreStart } from '../../../../src/core/public';
import { QueryInsightsDashboardsPluginStartDependencies } from '../types';
import {
  getDataSourceEnabledUrl,
  isDataSourceCompatible,
  isWLMDataSourceCompatible,
} from '../utils/datasource-utils';

export interface DataSourceMenuProps {
  dataSourceManagement?: DataSourceManagementPluginSetup;
  depsStart: QueryInsightsDashboardsPluginStartDependencies;
  coreStart: CoreStart;
  params: AppMountParameters;
  setDataSource: React.Dispatch<React.SetStateAction<DataSourceOption>>;
  selectedDataSource: DataSourceOption;
  onManageDataSource: () => void;
  onSelectedDataSource: () => void;
  dataSourcePickerReadOnly: boolean;
}

export const QueryInsightsDataSourceMenu = React.memo(
  (props: DataSourceMenuProps) => {
    const {
      coreStart,
      depsStart,
      dataSourceManagement,
      params,
      setDataSource,
      selectedDataSource,
      onManageDataSource,
      onSelectedDataSource,
      dataSourcePickerReadOnly,
    } = props;
    const { setHeaderActionMenu } = params;
    const DataSourceMenu = dataSourceManagement?.ui.getDataSourceMenu<DataSourceSelectableConfig>();

    const dataSourceEnabled = !!depsStart.dataSource?.dataSourceEnabled;

    const wrapSetDataSourceWithUpdateUrl = (dataSources: DataSourceOption[]) => {
      window.history.replaceState({}, '', getDataSourceEnabledUrl(dataSources[0]).toString());
      setDataSource(dataSources[0]);
      onSelectedDataSource();
    };

    return dataSourceEnabled ? (
      <DataSourceMenu
        onManageDataSource={onManageDataSource}
        setMenuMountPoint={setHeaderActionMenu}
        componentType={dataSourcePickerReadOnly ? 'DataSourceView' : 'DataSourceSelectable'}
        componentConfig={{
          onManageDataSource,
          savedObjects: coreStart.savedObjects.client,
          notifications: coreStart.notifications,
          activeOption:
            selectedDataSource.id || selectedDataSource.label ? [selectedDataSource] : undefined,
          onSelectedDataSources: wrapSetDataSourceWithUpdateUrl,
          fullWidth: true,
          dataSourceFilter: isDataSourceCompatible,
        }}
      />
    ) : null;
  },
  (prevProps, newProps) =>
    prevProps.selectedDataSource.id === newProps.selectedDataSource.id &&
    prevProps.dataSourcePickerReadOnly === newProps.dataSourcePickerReadOnly
);

export const WLMDataSourceMenu = React.memo(
  (props: DataSourceMenuProps) => {
    const {
      coreStart,
      depsStart,
      dataSourceManagement,
      params,
      setDataSource,
      selectedDataSource,
      onManageDataSource,
      onSelectedDataSource,
      dataSourcePickerReadOnly,
    } = props;
    const { setHeaderActionMenu } = params;
    const DataSourceMenu = dataSourceManagement?.ui.getDataSourceMenu<DataSourceSelectableConfig>();

    const dataSourceEnabled = !!depsStart.dataSource?.dataSourceEnabled;

    const wrapSetDataSourceWithUpdateUrl = (dataSources: DataSourceOption[]) => {
      window.history.replaceState({}, '', getDataSourceEnabledUrl(dataSources[0]).toString());
      setDataSource(dataSources[0]);
      onSelectedDataSource();
    };

    return dataSourceEnabled ? (
      <DataSourceMenu
        onManageDataSource={onManageDataSource}
        setMenuMountPoint={setHeaderActionMenu}
        componentType={dataSourcePickerReadOnly ? 'DataSourceView' : 'DataSourceSelectable'}
        componentConfig={{
          onManageDataSource,
          savedObjects: coreStart.savedObjects.client,
          notifications: coreStart.notifications,
          activeOption:
            selectedDataSource.id || selectedDataSource.label ? [selectedDataSource] : undefined,
          onSelectedDataSources: wrapSetDataSourceWithUpdateUrl,
          fullWidth: true,
          dataSourceFilter: isWLMDataSourceCompatible,
        }}
      />
    ) : null;
  },
  (prevProps, newProps) =>
    prevProps.selectedDataSource.id === newProps.selectedDataSource.id &&
    prevProps.dataSourcePickerReadOnly === newProps.dataSourcePickerReadOnly
);
