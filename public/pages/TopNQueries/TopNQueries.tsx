/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Redirect, Route, Switch, useHistory, useLocation } from 'react-router-dom';
import { EuiTab, EuiTabs, EuiTitle, EuiSpacer } from '@elastic/eui';
import { CoreStart } from 'opensearch-dashboards/public';
import QueryInsights from '../QueryInsights/QueryInsights';
import Configuration from '../Configuration/Configuration';
import QueryDetails from '../QueryDetails/QueryDetails';
import { SearchQueryRecord } from '../../../types/types';
import { QueryGroupDetails } from '../QueryGroupDetails/QueryGroupDetails';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import {
  DEFAULT_TIME_UNIT,
  DEFAULT_TOP_N_SIZE,
  DEFAULT_WINDOW_SIZE,
  MetricType,
} from '../Utils/Constants';

import { MetricSettingsResponse } from '../../types';
import { getTimeAndUnitFromString } from '../Utils/MetricUtils';
import { parseDateString } from '../Utils/DateUtils';

export const QUERY_INSIGHTS = '/queryInsights';
export const CONFIGURATION = '/configuration';

export interface MetricSettings {
  isEnabled: boolean;
  currTopN: string;
  currWindowSize: string;
  currTimeUnit: string;
}

export interface GroupBySettings {
  groupBy: string;
}

const TopNQueries = ({
  core,
  depsStart,
  initialStart = 'now-1d',
  initialEnd = 'now',
}: {
  core: CoreStart;
  depsStart: QueryInsightsDashboardsPluginStartDependencies;
  initialStart?: string;
  initialEnd?: string;
}) => {
  const history = useHistory();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [currStart, setStart] = useState(initialStart);
  const [currEnd, setEnd] = useState(initialEnd);
  const [recentlyUsedRanges, setRecentlyUsedRanges] = useState([
    { start: currStart, end: currEnd },
  ]);
  const [latencySettings, setLatencySettings] = useState<MetricSettings>({
    isEnabled: false,
    currTopN: DEFAULT_TOP_N_SIZE,
    currWindowSize: DEFAULT_WINDOW_SIZE,
    currTimeUnit: DEFAULT_TIME_UNIT,
  });

  const [cpuSettings, setCpuSettings] = useState<MetricSettings>({
    isEnabled: false,
    currTopN: DEFAULT_TOP_N_SIZE,
    currWindowSize: DEFAULT_WINDOW_SIZE,
    currTimeUnit: DEFAULT_TIME_UNIT,
  });

  const [memorySettings, setMemorySettings] = useState<MetricSettings>({
    isEnabled: false,
    currTopN: DEFAULT_TOP_N_SIZE,
    currWindowSize: DEFAULT_WINDOW_SIZE,
    currTimeUnit: DEFAULT_TIME_UNIT,
  });

  const [groupBySettings, setGroupBySettings] = useState<GroupBySettings>({ groupBy: 'none' });

  const setMetricSettings = (metricType: string, updates: Partial<MetricSettings>) => {
    switch (metricType) {
      case MetricType.LATENCY:
        setLatencySettings((prevSettings) => ({ ...prevSettings, ...updates }));
        break;
      case MetricType.CPU:
        setCpuSettings((prevSettings) => ({ ...prevSettings, ...updates }));
        break;
      case MetricType.MEMORY:
        setMemorySettings((prevSettings) => ({ ...prevSettings, ...updates }));
        break;
    }
  };

  const [queries, setQueries] = useState<SearchQueryRecord[]>([]);

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

  const retrieveQueries = useCallback(
    async (start: string, end: string) => {
      const nullResponse = { response: { top_queries: [] } };
      const params = {
        query: {
          from: parseDateString(start),
          to: parseDateString(end),
        },
      };
      const fetchMetric = async (endpoint: string) => {
        try {
          // TODO: #13 refactor the interface definitions for requests and responses
          const response: { response: { top_queries: SearchQueryRecord[] } } = await core.http.get(
            endpoint,
            params
          );
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
        const noDuplicates: SearchQueryRecord[] = Array.from(
          new Set(newQueries.map((item) => JSON.stringify(item)))
        ).map((item) => JSON.parse(item));
        setQueries(noDuplicates);
      } catch (error) {
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
      newTimeUnit: string = '',
      newGroupBy: string = ''
    ) => {
      if (get) {
        try {
          // Helper to get merged settings with transient overwriting persistent
          const getMergedMetricSettings = (
            persistent: MetricSettingsResponse | undefined,
            transient: MetricSettingsResponse | undefined
          ): MetricSettingsResponse => {
            if (transient !== undefined) {
              return transient;
            }
            return {
              ...persistent,
            };
          };

          const getMergedGroupBySettings = (
            persistent: string | undefined,
            transient: string | undefined
          ) => {
            return transient ?? persistent;
          };

          const resp = await core.http.get('/api/settings');
          const persistentSettings = resp?.response?.persistent?.search?.insights?.top_queries;
          const transientSettings = resp?.response?.transient?.search?.insights?.top_queries;
          const metrics = [
            {
              metricType: MetricType.LATENCY,
              metricSetting: getMergedMetricSettings(
                persistentSettings?.latency,
                transientSettings?.latency
              ),
            },
            {
              metricType: MetricType.CPU,
              metricSetting: getMergedMetricSettings(
                persistentSettings?.cpu,
                transientSettings?.cpu
              ),
            },
            {
              metricType: MetricType.MEMORY,
              metricSetting: getMergedMetricSettings(
                persistentSettings?.memory,
                transientSettings?.memory
              ),
            },
          ];

          // Process each metric
          metrics.forEach(({ metricType, metricSetting }) => {
            if (metricSetting?.enabled === 'true') {
              const [time, timeUnits] = getTimeAndUnitFromString(metricSetting.window_size);
              setMetricSettings(metricType, {
                isEnabled: true,
                currTopN: metricSetting.top_n_size ?? DEFAULT_TOP_N_SIZE,
                currWindowSize: time,
                currTimeUnit: timeUnits,
              });
            }
          });
          const groupBy = getMergedGroupBySettings(
            persistentSettings?.group_by,
            transientSettings?.group_by
          );
          if (groupBy) {
            setGroupBySettings({ groupBy });
          }
        } catch (error) {
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
          setGroupBySettings({ groupBy: newGroupBy });
          await core.http.put('/api/update_settings', {
            query: {
              metric,
              enabled,
              top_n_size: newTopN,
              window_size: `${newWindowSize}${newTimeUnit === 'MINUTES' ? 'm' : 'h'}`,
              group_by: newGroupBy,
            },
          });
        } catch (error) {
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
        <Route exact path="/query-details">
          {() => {
            return <QueryDetails core={core} depsStart={depsStart} />;
          }}
        </Route>
        <Route exact path="/query-group-details">
          {() => {
            return <QueryGroupDetails core={core} depsStart={depsStart} />;
          }}
        </Route>
        <Route exact path={QUERY_INSIGHTS}>
          <PageHeader
            coreStart={core}
            depsStart={depsStart}
            fallBackComponent={
              <>
                <EuiTitle size="l">
                  <h1>Query insights - Top N queries</h1>
                </EuiTitle>
                <EuiSpacer size="l" />
              </>
            }
          />
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
          <PageHeader
            coreStart={core}
            depsStart={depsStart}
            fallBackComponent={
              <>
                <EuiTitle size="l">
                  <h1>Query insights - Configuration</h1>
                </EuiTitle>
                <EuiSpacer size="l" />
              </>
            }
          />

          <EuiTabs>{tabs.map(renderTab)}</EuiTabs>
          <EuiSpacer size="l" />
          <Configuration
            latencySettings={latencySettings}
            cpuSettings={cpuSettings}
            memorySettings={memorySettings}
            groupBySettings={groupBySettings}
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
