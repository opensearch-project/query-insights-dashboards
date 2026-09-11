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
import { getDataSourceEnabledUrl, isDataSourceCompatible } from '../utils/datasource-utils';

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
  dataSourceFilter?: (dataSource: any) => boolean;
}

export const DataSourceMenu = React.memo(
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
      dataSourceFilter = isDataSourceCompatible,
    } = props;
    const { setHeaderActionMenu } = params;
    const DataSourceMenuComponent =
      dataSourceManagement?.ui.getDataSourceMenu<DataSourceSelectableConfig>();

    const dataSourceEnabled = !!depsStart.dataSource?.dataSourceEnabled;

    const wrapSetDataSourceWithUpdateUrl = (dataSources: DataSourceOption[]) => {
      if (!dataSources || dataSources.length === 0 || !dataSources[0]) return;
      const selected = dataSources[0];
      if (!selected.id && !selected.label) return;
      window.history.replaceState({}, '', getDataSourceEnabledUrl(selected).toString());
      setDataSource(selected);
      onSelectedDataSource();
    };

    return dataSourceEnabled ? (
      <DataSourceMenuComponent
        onManageDataSource={onManageDataSource}
        setMenuMountPoint={setHeaderActionMenu}
        componentType={dataSourcePickerReadOnly ? 'DataSourceView' : 'DataSourceSelectable'}
        componentConfig={{
          onManageDataSource,
          savedObjects: coreStart.savedObjects.client,
          notifications: coreStart.notifications,
          activeOption:
            selectedDataSource?.id || selectedDataSource?.label
              ? [selectedDataSource]
              : undefined,
          onSelectedDataSources: wrapSetDataSourceWithUpdateUrl,
          fullWidth: true,
          dataSourceFilter,
        }}
      />
    ) : null;
  },
  (prevProps, newProps) =>
    prevProps.selectedDataSource?.id === newProps.selectedDataSource?.id &&
    prevProps.dataSourcePickerReadOnly === newProps.dataSourcePickerReadOnly &&
    prevProps.selectedDataSource?.label === newProps.selectedDataSource?.label
);

// Use the same component for both Query Insights and WLM
export const QueryInsightsDataSourceMenu = (
  props: Omit<DataSourceMenuProps, 'dataSourceFilter'>
) => <DataSourceMenu {...props} dataSourceFilter={isDataSourceCompatible} />;

// Alias for backward compatibility
export const WLMDataSourceMenu = QueryInsightsDataSourceMenu;
