import React, { useState, useEffect, useCallback } from 'react';
import { useHistory, useLocation, Switch, Route, Redirect } from 'react-router-dom';
import { EuiTab, EuiTabs, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@osd/i18n/react';
import QueryInsights from '../QueryInsights/QueryInsights';
import dateMath from '@elastic/datemath';
import { CoreStart } from '../../../../../src/core/public';

const QUERY_INSIGHTS = '/queryInsights';
const CONFIGURATION = '/configuration';

const TopNQueries = ({ core }: { core: CoreStart }) => {
  const history = useHistory();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const defaultStart = 'now-1d';
  const [queries, setQueries] = useState<any[]>([]);

  const tabs: Array<{ id: string; name: string; route: string }> = [
    {
      id: 'topNQueries',
      name: 'Top N queries',
      route: QUERY_INSIGHTS,
    },
    {
      id: 'configuration',
      name: 'Configuration',
      route: CONFIGURATION,
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

  const parseDateString = (dateString: string) => {
    const date = dateMath.parse(dateString);
    return date ? date.toDate().getTime() : new Date().getTime();
  };

  const retrieveQueries = async (start: string, end: string) => {
    setLoading(true);
    const startTimestamp = parseDateString(start);
    const endTimestamp = parseDateString(end);
    const newQueries = queries.filter(
      (item) => item.timestamp >= startTimestamp && item.timestamp <= endTimestamp
    );
    setQueries(newQueries);
    setLoading(false);
  }

  const handleQueriesChange = useCallback(({ start, end }: { start: string; end: string}) => {
    try {
      retrieveQueries(start, end);
    } catch (error) {
      console.error('Error fetching top queries:', error);
    }
  }, []);

  useEffect(() => {
    retrieveQueries(defaultStart, 'now');
  }, []);

  return (
    <div style={{ padding: '35px 35px' }}>
      <Switch>
        <Route
          exact
          path={QUERY_INSIGHTS}>
          <EuiTitle size="l">
            <h1>
              <FormattedMessage
                id={'queryInsightsDashboards.topnqueries'}
                defaultMessage="{name}"
                values={{name: 'Query insights - Top N queries'}}
              />
            </h1>
          </EuiTitle>
          <div style={{padding: '25px 0px'}}>
            <EuiTabs>{tabs.map(renderTab)}</EuiTabs>
          </div>
          <QueryInsights queries={queries} loading={loading} onQueriesChange={handleQueriesChange}
                         defaultStart={defaultStart}/>
        </Route>
        <Route
            exact
            path={CONFIGURATION}>
            <EuiTitle size="l">
              <h1>
                <FormattedMessage
                  id={'queryInsightsDashboards.configuration'}
                  defaultMessage="{name}"
                  values={{name: 'Query insights - Configuration'}}
                />
              </h1>
            </EuiTitle>
        </Route>
        <div style={{padding: '25px 0px'}}>
          <EuiTabs>{tabs.map(renderTab)}</EuiTabs>
        </div>
        <Redirect to={QUERY_INSIGHTS} />
      </Switch>
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default TopNQueries;
