import React, { useCallback, useEffect, useState } from 'react';
import { Redirect, Route, Switch, useHistory, useLocation } from 'react-router-dom';
import { EuiTab, EuiTabs, EuiTitle, EuiSpacer } from '@elastic/eui';
import QueryInsights from '../QueryInsights/QueryInsights';
import { CoreStart } from '../../../../../src/core/public';

export const QUERY_INSIGHTS = '/queryInsights';

export interface MetricSettings {
  isEnabled: boolean;
  currTopN: string;
  currWindowSize: string;
  currTimeUnit: string;
}

const TopNQueries = ({ core }: { core: CoreStart }) => {
  const history = useHistory();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [currStart, setStart] = useState('now-1d');
  const [currEnd, setEnd] = useState('now');
  const [recentlyUsedRanges, setRecentlyUsedRanges] = useState([
    { start: currStart, end: currEnd },
  ]);

  const [queries, setQueries] = useState<any[]>([]);

  const tabs: Array<{ id: string; name: string; route: string }> = [
    {
      id: 'topNQueries',
      name: 'Top N queries',
      route: QUERY_INSIGHTS,
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

  const retrieveQueries = useCallback(async (start: string, end: string) => {
    try {
      setLoading(true);
      const noDuplicates: any[] = [];
      setQueries(noDuplicates);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error retrieving queries:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const onTimeChange = ({ start, end }: { start: string; end: string }) => {
    const usedRange = recentlyUsedRanges.filter(
      (range) => !(range.start === start && range.end === end)
    );
    usedRange.unshift({ start, end });
    setStart(start);
    setEnd(end);
    setRecentlyUsedRanges(usedRange.length > 10 ? usedRange.slice(0, 9) : usedRange);
    retrieveQueries(start, end);
  };

  useEffect(() => {
    onTimeChange({ start: currStart, end: currEnd });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currStart, currEnd]);

  useEffect(() => {
    retrieveQueries(currStart, currEnd);
  }, [currStart, currEnd, retrieveQueries]);

  return (
    <div style={{ padding: '35px 35px' }}>
      <Switch>
        <Route exact path={QUERY_INSIGHTS}>
          <EuiTitle size="l">
            <h1>Query insights - Top N queries</h1>
          </EuiTitle>
          <EuiSpacer size="l" />
          <EuiTabs>{tabs.map(renderTab)}</EuiTabs>
          <EuiSpacer size="l" />
          <QueryInsights
            queries={queries}
            loading={loading}
            onTimeChange={onTimeChange}
            recentlyUsedRanges={recentlyUsedRanges}
            currStart={currStart}
            currEnd={currEnd}
            core={core}
          />
        </Route>
        <Redirect to={QUERY_INSIGHTS} />
      </Switch>
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default TopNQueries;
