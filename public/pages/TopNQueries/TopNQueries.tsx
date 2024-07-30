import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useHistory, useLocation, Switch, Route, Redirect } from 'react-router-dom';
import { EuiTab, EuiTabs, EuiTitle } from '@elastic/eui';
import dateMath from '@elastic/datemath';
import QueryInsights from '../QueryInsights/QueryInsights';
import { CoreStart } from '../../../../../src/core/public';

const QUERY_INSIGHTS = '/queryInsights';
const CONFIGURATION = '/configuration';

const TopNQueries = ({ core }: { core: CoreStart }) => {
  const history = useHistory();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const defaultStart: string = 'now-1d';
  const allQueries = useMemo(() => [], []);
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

  const retrieveQueries = useCallback(
    async (start: string, end: string) => {
      setLoading(true);
      try {
        const startTimestamp = parseDateString(start);
        const endTimestamp = parseDateString(end);
        setQueries((prevQueries) => {
          // @ts-ignore
          const newQueries = allQueries.filter(
            (item) => item.timestamp >= startTimestamp && item.timestamp <= endTimestamp
          );
          return newQueries;
        });
      } catch (error) {
        // console.error('Failed to retrieve queries:', error);
      } finally {
        setLoading(false);
      }
    },
    [allQueries]
  );

  useEffect(() => {
    retrieveQueries(defaultStart, 'now');
    core.chrome.setBreadcrumbs([
      {
        text: 'Query insights',
        href: '/queryInsights',
        onClick: (e) => {
          e.preventDefault();
          history.push('/queryInsights');
        },
      },
    ]);
  }, [retrieveQueries, core.chrome, history, defaultStart]);

  return (
    <div style={{ padding: '35px 35px' }}>
      <Switch>
        <Route exact path={QUERY_INSIGHTS}>
          <EuiTitle size="l">
            <h1>Query insights - Top N queries</h1>
          </EuiTitle>
          <div style={{ padding: '25px 0px' }}>
            <EuiTabs>{tabs.map(renderTab)}</EuiTabs>
          </div>
          <QueryInsights
            queries={queries}
            loading={loading}
            onQueriesChange={retrieveQueries}
            defaultStart={defaultStart}
          />
        </Route>
        <Route exact path={CONFIGURATION}>
          <EuiTitle size="l">
            <h1>Query insights - Configuration</h1>
          </EuiTitle>
          <div style={{ padding: '25px 0px' }}>
            <EuiTabs>{tabs.map(renderTab)}</EuiTabs>
          </div>
        </Route>
        <Redirect to={QUERY_INSIGHTS} />
      </Switch>
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default TopNQueries;
