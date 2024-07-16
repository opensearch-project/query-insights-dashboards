import React from 'react';
import { useHistory, useLocation, Switch, Route, Redirect } from 'react-router-dom';
import { EuiTab, EuiTabs, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@osd/i18n/react';
import QueryInsights from '../QueryInsights/QueryInsights';

const TopNQueries = () => {
  const history = useHistory();
  const location = useLocation();

  const tabs: Array<{ id: string; name: string; route: string }> = [
    {
      id: 'topNQueries',
      name: 'Top N queries',
      route: 'queryInsights',
    },
    {
      id: 'configuration',
      name: 'Configuration',
      route: 'configuration',
    },
  ];

  const onSelectedTabChanged = (route: string) => {
    const { pathname: currPathname } = location;
    if (!currPathname.includes(route)) {
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

  return (
    <div style={{ padding: '35px 35px' }}>
      <Switch>
        <Route
          exact
          path="/queryInsights"
          render={() => (
            <EuiTitle size="l">
              <h1>
                <FormattedMessage
                  id={'queryInsightsDashboards.topnqueries'}
                  defaultMessage="{name}"
                  values={{ name: 'Query insights - Top N queries' }}
                />
              </h1>
            </EuiTitle>
          )}
        />
        <Route
          exact
          path="/configuration"
          render={() => (
            <EuiTitle size="l">
              <h1>
                <FormattedMessage
                  id={'queryInsightsDashboards.configuration'}
                  defaultMessage="{name}"
                  values={{ name: 'Query insights - Configuration' }}
                />
              </h1>
            </EuiTitle>
          )}
        />
      </Switch>
      <div style={{ padding: '25px 0px' }}>
        <EuiTabs>{tabs.map(renderTab)}</EuiTabs>
      </div>
      <div>
        <Switch>
          <Route exact path="/queryInsights" render={(props) => <QueryInsights />} />
          <Redirect to="/queryInsights" />
        </Switch>
      </div>
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default TopNQueries;