import React, { useState, useEffect } from 'react';
import { useHistory, useLocation, Switch, Route, Redirect } from 'react-router-dom';
import { EuiTab, EuiTabs } from '@elastic/eui';
import Configuration from '../Configuration';
import Dashboard from '../Dashboard';

const TopNQueries = (props) => {
  const { httpClient, notifications, setFlyout, landingDataSourceId } = props;
  const history = useHistory();
  const location = useLocation();
  const [selectedTabId, setSelectedTabId] = useState(location.pathname.includes('configuration') ? 'configuration' : 'topNQueries')

  const tabs = [
    {
      id: 'topNQueries',
      name: 'Top N Queries',
      route: '/dashboard',
    },
    {
      id: 'configuration',
      name: 'Configuration',
      route: '/configuration',
    },
  ];

  useEffect(() => {
    const { pathname: prevPathname } = location;
    const { pathname: currPathname } = props.location;
    if (prevPathname !== currPathname) {
      const selectedTabId = currPathname.includes('configuration') ? 'configuration' : 'topNQueries';
      setSelectedTabId(selectedTabId);
    }
  }, [location, props.location]);

  const onSelectedTabChanged = (route) => {
    const { pathname: currPathname } = location;
    if (!currPathname.includes(route)) {
      history.push(route);
    }
  };

  const renderTab = (tab) => (
    <EuiTab
      onClick={() => onSelectedTabChanged(tab.route)}
      isSelected={tab.id === selectedTabId}
      key={tab.id}
    >
      {tab.name}
    </EuiTab>
  );

  return (
    <div>
      <EuiTabs>{tabs.map(renderTab)}</EuiTabs>
      <div style={{ padding: '25px 25px' }}>
        <Switch>
          <Route
            exact
            path="/dashboard"
            render={(props) => (
              <Dashboard
            //     {...props}
            //     httpClient={httpClient}
            //     notifications={notifications}
            //     perAlertView={false}
            //     setFlyout={setFlyout}
            //     landingDataSourceId={landingDataSourceId}
              />
            )}
          />
          <Route
            exact
            path="/configuration"
            render={(props) => (
              <Configuration
            //     {...props}
            //     httpClient={httpClient}
            //     notifications={notifications}
            //     landingDataSourceId={landingDataSourceId}
              />
            )}
          />
          <Redirect to="/dashboard" />
        </Switch>
      </div>
    </div>
  );
};

export default TopNQueries;
