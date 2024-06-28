import React, { useState, useEffect } from 'react';
import { useHistory, useLocation, Switch, Route, Redirect } from 'react-router-dom';
import { EuiTab, EuiTabs, EuiTitle } from '@elastic/eui';
import Configuration from '../Configuration';
import QueryInsights from '../QueryInsights';
import { FormattedMessage } from '@osd/i18n/react';

const TopNQueries = (props) => {
  const conf = 'configuration'
  // const { httpClient, notifications, setFlyout, landingDataSourceId } = props;
  const history = useHistory();
  const location = useLocation();
  const [selectedTabId, setSelectedTabId] = useState(location.pathname.includes(conf) ? conf : 'topNQueries')

  const tabs = [
    {
      id: 'topNQueries',
      name: 'Top N queries',
      route: '/queryInsights',
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
      const selectedTabId = currPathname.includes(conf) ? conf : 'topNQueries';
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
    <div style={{ padding: '35px 35px' }}>
      <Switch>
        <Route
          exact
          path="/queryInsights"
          render={(props) => (
            <EuiTitle size="l">
              <h1>
                <FormattedMessage
                  id={"queryInsightsDashboards.topnqueries"}
                  defaultMessage="{name}"
                  values={{ name: "Query insights - Top N queries" }}
                />
              </h1>
            </EuiTitle>
          )}
        />
        <Route
          exact
          path="/configuration"
          render={(props) => (
            <EuiTitle size="l">
              <h1>
                <FormattedMessage
                  id={"queryInsightsDashboards.configuration"}
                  defaultMessage="{name}"
                  values={{ name: "Query insights - Configuration" }}
                />
              </h1>
            </EuiTitle>
          )}
        />
      </Switch>
      <div style={{ padding: '25px 0px' }}>
        <EuiTabs>{tabs.map(renderTab)}</EuiTabs>
      </div>
      <div style={{ padding: '25px 25px' }}>
        <Switch>
          <Route
            exact
            path="/queryInsights"
            render={(props) => (
              <QueryInsights
                {...props}
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
          <Redirect to="/queryInsights" />
        </Switch>
      </div>
    </div>
  );
};

export default TopNQueries;
