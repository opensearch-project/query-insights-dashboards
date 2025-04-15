/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useState } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { CoreStart } from 'opensearch-dashboards/public';
import { DataSourceOption } from 'src/plugins/data_source_management/public/components/data_source_menu/types';
import { WorkloadManagementMain } from './WLMMain/WLMMain';
import { WLMDetails } from './WLMDetails/WLMDetails';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';

export const WLM_MAIN = '/workloadManagement';
export const WLM_DETAILS = '/wlm-details';

export interface DataSourceContextType {
  dataSource: DataSourceOption;
  setDataSource: React.Dispatch<React.SetStateAction<DataSourceOption>>;
}

// Context for data source management
export const DataSourceContext = createContext<DataSourceContextType | null>(null);

export const WorkloadManagement = ({
  core,
  depsStart,
}: {
  core: CoreStart;
  depsStart: QueryInsightsDashboardsPluginStartDependencies;
}) => {
  const dataSourceFromUrl = { label: 'Default Cluster', id: '' }; // Mock data source
  const [dataSource, setDataSource] = useState<DataSourceOption>(dataSourceFromUrl);

  return (
    <DataSourceContext.Provider value={{ dataSource, setDataSource }}>
      <div style={{ padding: '20px 40px' }}>
        <Switch>
          {/* Workload Management Main Page */}
          <Route exact path={WLM_MAIN}>
            <WorkloadManagementMain core={core} depsStart={depsStart} />
          </Route>

          {/* Workload Management Details Page */}
          <Route exact path={WLM_DETAILS}>
            {() => {
              return <WLMDetails core={core} depsStart={depsStart} />;
            }}
          </Route>

          {/* Redirect to Main Page */}
          <Redirect to={WLM_MAIN} />
        </Switch>
      </div>
    </DataSourceContext.Provider>
  );
};
