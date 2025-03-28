import React, { createContext, useState } from 'react';
import { Redirect, Route, Switch, useHistory, useLocation } from 'react-router-dom';
import { EuiTab } from '@elastic/eui';
import { AppMountParameters, CoreStart } from 'opensearch-dashboards/public';
import { DataSourceManagementPluginSetup } from 'src/plugins/data_source_management/public';
import { DataSourceOption } from 'src/plugins/data_source_management/public/components/data_source_menu/types';
import WorkloadManagementMain from './WLMMain/WLMMain';
import WLMDetails from './WLMDetails/WLMDetails';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';

export const WLM_MAIN = '/workloadManagement';
export const WLM_DETAILS = '/wlm-details';

export interface DataSourceContextType {
  dataSource: DataSourceOption;
  setDataSource: React.Dispatch<React.SetStateAction<DataSourceOption>>;
}

// Context for data source management
export const DataSourceContext = createContext<DataSourceContextType | null>(null);

const WorkloadManagement = ({
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
  const history = useHistory();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const tabs: Array<{ id: string; name: string; route: string }> = [
    { id: 'wlmMain', name: 'Workload Management', route: WLM_MAIN },
  ];

  const onSelectedTabChanged = (route: string) => {
    if (!location.pathname.includes(route)) {
      history.push(route);
    }
  };

  const renderTab = (tab: { route: string; id: string; name: string }) => (
    <EuiTab
      onClick={() => onSelectedTabChanged(tab.route)}
      isSelected={location.pathname.includes(tab.route)}
      key={tab.id}
    >
      {tab.name}
    </EuiTab>
  );

  const dataSourceFromUrl = { label: 'Default Cluster', id: '' }; // Mock data source
  const [dataSource, setDataSource] = useState<DataSourceOption>(dataSourceFromUrl);

  return (
    <DataSourceContext.Provider value={{ dataSource, setDataSource }}>
      <div style={{ padding: '20px 40px' }}>
        <Switch>
          {/* Workload Management Main Page */}
          <Route exact path={WLM_MAIN}>
            <WorkloadManagementMain
              core={core}
              depsStart={depsStart}
              params={params}
              dataSourceManagement={dataSourceManagement}
            />
          </Route>

          {/* Workload Management Details Page */}
          <Route exact path={WLM_DETAILS}>
            {() => {
              return (
                <WLMDetails
                  core={core}
                  depsStart={depsStart}
                  params={params}
                  dataSourceManagement={dataSourceManagement}
                />
              );
            }}
          </Route>

          {/* Redirect to Main Page */}
          <Redirect to={WLM_MAIN} />
        </Switch>
      </div>
    </DataSourceContext.Provider>
  );
};

export default WorkloadManagement;
