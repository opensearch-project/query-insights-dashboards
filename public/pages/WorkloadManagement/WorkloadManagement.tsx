/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useState, useEffect } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { CoreStart, AppMountParameters } from 'opensearch-dashboards/public';
import { DataSourceOption } from 'src/plugins/data_source_management/public/components/data_source_menu/types';
import { DataSourceManagementPluginSetup } from 'src/plugins/data_source_management/public';
import { DataSourceAttributes } from 'src/plugins/data_source/common/data_sources';
import { WorkloadManagementMain } from './WLMMain/WLMMain';
import { WLMDetails } from './WLMDetails/WLMDetails';
import { WLMCreate } from './WLMCreate/WLMCreate';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';
import { getDataSourceFromUrl, isWLMDataSourceCompatible } from '../../utils/datasource-utils';
import { sharedDataSourceState } from '../../shared-state';

export const WLM_MAIN = '/workloadManagement';
export const WLM_DETAILS = '/wlm-details';
export const WLM_CREATE = '/wlm-create';

export interface DataSourceContextType {
  dataSource: DataSourceOption;
  setDataSource: React.Dispatch<React.SetStateAction<DataSourceOption>>;
}

// Context for data source management
export const DataSourceContext = createContext<DataSourceContextType | null>(null);

export const WorkloadManagement = ({
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
  const dataSourceFromUrl = getDataSourceFromUrl();
  const [dataSource, setDataSource] = useState<DataSourceOption>(
    dataSourceFromUrl || { id: '', label: 'Local cluster' }
  );

  // Sync with shared state
  useEffect(() => {
    const currentSharedState = sharedDataSourceState.getDataSource();
    if (currentSharedState.id || currentSharedState.label !== 'Local cluster') {
      setDataSource(currentSharedState);
    } else if (dataSource.id || dataSource.label !== 'Local cluster') {
      sharedDataSourceState.setDataSource(dataSource);
    }

    return sharedDataSourceState.subscribe(setDataSource);
  }, []);

  const wrappedSetDataSource = (newDataSource: DataSourceOption) => {
    setDataSource(newDataSource);
    sharedDataSourceState.setDataSource(newDataSource);
  };
  const [isWLMInstalled, setIsWLMInstalled] = useState<boolean | null>(null);

  useEffect(() => {
    const checkWLMInstallation = async () => {
      try {
        if (!dataSource?.id) {
          // For local cluster, assume WLM is available
          setIsWLMInstalled(true);
          return;
        }

        const savedObjectsClient = core.savedObjects.client;
        const dataSourceObj = await savedObjectsClient.get<DataSourceAttributes>(
          'data-source',
          dataSource.id
        );
        setIsWLMInstalled(isWLMDataSourceCompatible(dataSourceObj));
      } catch (error) {
        console.error('Error checking WLM installation:', error);
        setIsWLMInstalled(false);
      }
    };

    checkWLMInstallation();
  }, [dataSource?.id, core.savedObjects.client]);

  if (isWLMInstalled === null) {
    return <div>Loading...</div>;
  }

  if (!isWLMInstalled) {
    return (
      <div>
        WLM is not available for this data source. Please ensure your OpenSearch cluster version is
        3.1.0 or higher and has the required plugins installed.
      </div>
    );
  }

  return (
    <DataSourceContext.Provider value={{ dataSource, setDataSource: wrappedSetDataSource }}>
      <div style={{ padding: '35px 35px' }}>
        <Switch>
          <Route exact path={WLM_MAIN}>
            <WorkloadManagementMain
              core={core}
              depsStart={depsStart}
              params={params}
              dataSourceManagement={dataSourceManagement}
            />
          </Route>

          <Route exact path={WLM_DETAILS}>
            {() => (
              <WLMDetails
                core={core}
                depsStart={depsStart}
                params={params}
                dataSourceManagement={dataSourceManagement}
              />
            )}
          </Route>

          <Route exact path={WLM_CREATE}>
            {() => (
              <WLMCreate
                core={core}
                depsStart={depsStart}
                params={params}
                dataSourceManagement={dataSourceManagement}
              />
            )}
          </Route>

          <Redirect to={WLM_MAIN} />
        </Switch>
      </div>
    </DataSourceContext.Provider>
  );
};
