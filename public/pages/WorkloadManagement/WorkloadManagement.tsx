/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useState } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { CoreStart, AppMountParameters } from 'opensearch-dashboards/public';
import { DataSourceOption } from 'src/plugins/data_source_management/public/components/data_source_menu/types';
import { DataSourceManagementPluginSetup } from 'src/plugins/data_source_management/public';
import { WorkloadManagementMain } from './WLMMain/WLMMain';
import { WLMDetails } from './WLMDetails/WLMDetails';
import { WLMCreate } from './WLMCreate/WLMCreate';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';
import { getDataSourceFromUrl } from '../../utils/datasource-utils';

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
  const [dataSource, setDataSource] = useState<DataSourceOption>(dataSourceFromUrl);

  return (
    <DataSourceContext.Provider value={{ dataSource, setDataSource }}>
      <div style={{ padding: '20px 40px' }}>
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
