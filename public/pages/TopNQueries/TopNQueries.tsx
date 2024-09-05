import React, { useCallback, useEffect, useState } from 'react';
import { Redirect, Route, Switch, useHistory, useLocation } from 'react-router-dom';
import { EuiTab, EuiTabs, EuiTitle, EuiSpacer } from '@elastic/eui';
import dateMath from '@elastic/datemath';
import QueryInsights from '../QueryInsights/QueryInsights';
import Configuration from '../Configuration/Configuration';
import QueryDetails from '../QueryDetails/QueryDetails';
import { CoreStart } from '../../../../../src/core/public';

export const QUERY_INSIGHTS = '/queryInsights';
export const CONFIGURATION = '/configuration';

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
  const [latencySettings, setLatencySettings] = useState<MetricSettings>({
    isEnabled: false,
    currTopN: '',
    currWindowSize: '',
    currTimeUnit: 'HOURS',
  });

  const [cpuSettings, setCpuSettings] = useState<MetricSettings>({
    isEnabled: false,
    currTopN: '',
    currWindowSize: '',
    currTimeUnit: 'HOURS',
  });

  const [memorySettings, setMemorySettings] = useState<MetricSettings>({
    isEnabled: false,
    currTopN: '',
    currWindowSize: '',
    currTimeUnit: 'HOURS',
  });

  const setMetricSettings = (metricType: string, updates: Partial<MetricSettings>) => {
    switch (metricType) {
      case 'latency':
        setLatencySettings((prevSettings) => ({ ...prevSettings, ...updates }));
        break;
      case 'cpu':
        setCpuSettings((prevSettings) => ({ ...prevSettings, ...updates }));
        break;
      case 'memory':
        setMemorySettings((prevSettings) => ({ ...prevSettings, ...updates }));
        break;
    }
  };

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
      const nullResponse = { response: { top_queries: [] } };
      const params = {
        query: {
          from: new Date(parseDateString(start)).toISOString(),
          to: new Date(parseDateString(end)).toISOString(),
        },
      };
      const fetchMetric = async (endpoint: string) => {
        try {
          const response = await core.http.get(endpoint, params);
          return {
            response: {
              top_queries: Array.isArray(response?.response?.top_queries)
                ? response.response.top_queries
                : [],
            },
          };
        } catch {
          return nullResponse;
        }
      };
      try {
        setLoading(true);
        const respLatency = latencySettings.isEnabled
          ? await fetchMetric('/api/top_queries/latency')
          : nullResponse;
        const respCpu = cpuSettings.isEnabled
          ? await fetchMetric('/api/top_queries/cpu')
          : nullResponse;
        const respMemory = memorySettings.isEnabled
          ? await fetchMetric('/api/top_queries/memory')
          : nullResponse;
        const newQueries = [
          ...respLatency.response.top_queries,
          ...respCpu.response.top_queries,
          ...respMemory.response.top_queries,
        ];
        const noDuplicates = Array.from(
          new Set(newQueries.map((item) => JSON.stringify(item)))
        ).map((item) => JSON.parse(item));
        setQueries(noDuplicates);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error retrieving queries:', error);
      } finally {
        setLoading(false);
      }
    },
    [latencySettings, cpuSettings, memorySettings, core]
  );

  const retrieveConfigInfo = useCallback(
    async (
      get: boolean,
      enabled: boolean = false,
      metric: string = '',
      newTopN: string = '',
      newWindowSize: string = '',
      newTimeUnit: string = ''
    ) => {
      if (get) {
        try {
          const resp = await core.http.get('/api/settings');
          const settings = resp.response.persistent.search.insights.top_queries;
          const latency = settings.latency;
          const cpu = settings.cpu;
          const memory = settings.memory;
          if (latency !== undefined && latency.enabled === 'true') {
            const [time, timeUnits] = latency.window_size.match(/\D+|\d+/g);
            setMetricSettings('latency', {
              isEnabled: true,
              currTopN: latency.top_n_size,
              currWindowSize: time,
              currTimeUnit: timeUnits === 'm' ? 'MINUTES' : 'HOURS',
            });
          }
          if (cpu !== undefined && cpu.enabled === 'true') {
            const [time, timeUnits] = cpu.window_size.match(/\D+|\d+/g);
            setMetricSettings('cpu', {
              isEnabled: true,
              currTopN: cpu.top_n_size,
              currWindowSize: time,
              currTimeUnit: timeUnits === 'm' ? 'MINUTES' : 'HOURS',
            });
          }
          if (memory !== undefined && memory.enabled === 'true') {
            const [time, timeUnits] = memory.window_size.match(/\D+|\d+/g);
            setMetricSettings('memory', {
              isEnabled: true,
              currTopN: memory.top_n_size,
              currWindowSize: time,
              currTimeUnit: timeUnits === 'm' ? 'MINUTES' : 'HOURS',
            });
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to retrieve settings:', error);
        }
      } else {
        try {
          setMetricSettings(metric, {
            isEnabled: enabled,
            currTopN: newTopN,
            currWindowSize: newWindowSize,
            currTimeUnit: newTimeUnit,
          });
          await core.http.put('/api/update_settings', {
            query: {
              metric,
              enabled,
              top_n_size: newTopN,
              window_size: `${newWindowSize}${newTimeUnit === 'MINUTES' ? 'm' : 'h'}`,
            },
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to set settings:', error);
        }
      }
    },
    [core]
  );

  const onTimeChange = ({ start, end }: { start: string; end: string }) => {
    const usedRange = recentlyUsedRanges.filter(
      (range) => !(range.start === start && range.end === end)
    );
    usedRange.unshift({ start, end });
    setStart(start);
    setEnd(end);
    setRecentlyUsedRanges(usedRange.length > 10 ? usedRange.slice(0, 9) : usedRange);
    retrieveConfigInfo(true);
    retrieveQueries(start, end);
  };

  useEffect(() => {
    onTimeChange({ start: currStart, end: currEnd });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currStart, currEnd]);

  useEffect(() => {
    retrieveQueries(currStart, currEnd);
  }, [latencySettings, cpuSettings, memorySettings, currStart, currEnd, retrieveQueries]);

  return (
    <div style={{ padding: '35px 35px' }}>
      <Switch>
        <Route exact path="/query-details/:hashedQuery">
          <QueryDetails queries={queries} core={core} />
        </Route>
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
        <Route exact path={CONFIGURATION}>
          <EuiTitle size="l">
            <h1>Query insights - Configuration</h1>
          </EuiTitle>
          <EuiSpacer size="l" />
          <EuiTabs>{tabs.map(renderTab)}</EuiTabs>
          <EuiSpacer size="l" />
          <Configuration
            latencySettings={latencySettings}
            cpuSettings={cpuSettings}
            memorySettings={memorySettings}
            configInfo={retrieveConfigInfo}
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
