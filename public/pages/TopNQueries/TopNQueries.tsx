/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { Redirect, Route, Switch, useHistory, useLocation } from 'react-router-dom';
import { EuiTab, EuiTabs, EuiTitle, EuiSpacer } from '@elastic/eui';
import { AppMountParameters, CoreStart } from 'opensearch-dashboards/public';
import { DataSourceManagementPluginSetup } from 'src/plugins/data_source_management/public';
import { DataSourceOption } from 'src/plugins/data_source_management/public/components/data_source_menu/types';
import { DateTime } from 'luxon';
import semver from 'semver';
import QueryInsights from '../QueryInsights/QueryInsights';
import Configuration from '../Configuration/Configuration';
import QueryDetails from '../QueryDetails/QueryDetails';
import { InflightQueries } from '../InflightQueries/InflightQueries';
import { SearchQueryRecord } from '../../../types/types';
import { QueryGroupDetails } from '../QueryGroupDetails/QueryGroupDetails';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import {
  getVersionOnce,
  getGroupBySettingsPath,
  isVersion31OrHigher,
} from '../../utils/version-utils';
import {
  DEFAULT_DELETE_AFTER_DAYS,
  DEFAULT_EXPORTER_TYPE,
  DEFAULT_GROUP_BY,
  DEFAULT_METRIC_ENABLED,
  DEFAULT_TIME_UNIT,
  DEFAULT_TOP_N_SIZE,
  DEFAULT_WINDOW_SIZE,
  EXPORTER_TYPE,
  MetricType,
} from '../../../common/constants';

import { parseDateString } from '../../../common/utils/DateUtils';
import {
  getMergedMetricSettings,
  getMergedStringSettings,
  getTimeAndUnitFromString,
} from '../../../common/utils/MetricUtils';
import { getDataSourceFromUrl } from '../../utils/datasource-utils';

export const QUERY_INSIGHTS = '/queryInsights';
export const CONFIGURATION = '/configuration';
export const LIVE_QUERIES = '/LiveQueries';

export interface MetricSettings {
  isEnabled: boolean;
  currTopN: string;
  currWindowSize: string;
  currTimeUnit: string;
}

export interface GroupBySettings {
  groupBy: string;
}

export interface DataRetentionSettings {
  exporterType: string;
  deleteAfterDays: string;
}

export interface DataSourceContextType {
  dataSource: DataSourceOption;
  setDataSource: React.Dispatch<React.SetStateAction<DataSourceOption>>;
}

// export const LocalCluster = { label: 'Local cluster', id: '' };

export const DataSourceContext = createContext<DataSourceContextType | null>(null);

const TopNQueries = ({
  core,
  depsStart,
  params,
  dataSourceManagement,
  initialStart = 'now-1h',
  initialEnd = 'now',
}: {
  core: CoreStart;
  depsStart: QueryInsightsDashboardsPluginStartDependencies;
  params: AppMountParameters;
  dataSourceManagement?: DataSourceManagementPluginSetup;
  initialStart?: string;
  initialEnd?: string;
}) => {
  const history = useHistory();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [currStart, setStart] = useState(initialStart);
  const [currEnd, setEnd] = useState(initialEnd);
  const [showLiveQueries, setShowLiveQueries] = useState<boolean>(true);
  const dataSourceFromUrl = getDataSourceFromUrl();
  const dataSourceId = dataSourceFromUrl.id;

  const [dataSource, setDataSource] = useState<DataSourceOption>(dataSourceFromUrl);

  const [recentlyUsedRanges, setRecentlyUsedRanges] = useState([
    { start: currStart, end: currEnd },
  ]);
  const [latencySettings, setLatencySettings] = useState<MetricSettings>({
    isEnabled: DEFAULT_METRIC_ENABLED,
    currTopN: DEFAULT_TOP_N_SIZE,
    currWindowSize: DEFAULT_WINDOW_SIZE,
    currTimeUnit: DEFAULT_TIME_UNIT,
  });

  const [cpuSettings, setCpuSettings] = useState<MetricSettings>({
    isEnabled: DEFAULT_METRIC_ENABLED,
    currTopN: DEFAULT_TOP_N_SIZE,
    currWindowSize: DEFAULT_WINDOW_SIZE,
    currTimeUnit: DEFAULT_TIME_UNIT,
  });

  const [memorySettings, setMemorySettings] = useState<MetricSettings>({
    isEnabled: DEFAULT_METRIC_ENABLED,
    currTopN: DEFAULT_TOP_N_SIZE,
    currWindowSize: DEFAULT_WINDOW_SIZE,
    currTimeUnit: DEFAULT_TIME_UNIT,
  });

  const [groupBySettings, setGroupBySettings] = useState<GroupBySettings>({ groupBy: 'none' });
  const [dataRetentionSettings, setDataRetentionSettings] = useState<DataRetentionSettings>({
    deleteAfterDays: '',
    exporterType: EXPORTER_TYPE.none,
  });

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

  useEffect(() => {
    let isComponentUnmounted = false;

    (async () => {
      try {
        const version = await getVersionOnce(dataSourceId);
        const shouldShowLiveQueries = isVersion31OrHigher(version);

        if (!isComponentUnmounted) {
          setShowLiveQueries(shouldShowLiveQueries);
        }
      } catch (error) {
        console.error('Failed to fetch data source version:', error);
        if (!isComponentUnmounted) {
          setShowLiveQueries(true);
        }
      }
    })();

    return () => {
      isComponentUnmounted = true;
    };
  }, [dataSourceId]);

  const tabs = useMemo<Array<{ id: string; name: string; route: string }>>(() => {
    const base = [
      { id: 'topNQueries', name: 'Top N queries', route: QUERY_INSIGHTS },
      { id: 'configuration', name: 'Configuration', route: CONFIGURATION },
    ];
    return showLiveQueries
      ? [{ id: 'liveQueries', name: 'Live queries', route: LIVE_QUERIES }, ...base]
      : base;
  }, [showLiveQueries]);

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

  // TODO: refactor retrieveQueries and retrieveConfigInfo into a Util function
  const retrieveQueries = useCallback(
    async (start: string, end: string) => {
      if (loading) return;
      setLoading(true);
      const nullResponse = { response: { top_queries: [] } };
      const apiParams = {
        query: {
          from: parseDateString(start),
          to: parseDateString(end),
          dataSourceId: getDataSourceFromUrl().id, // TODO: get this dynamically from the URL
          verbose: false,
        },
      };
      const fetchMetric = async (endpoint: string) => {
        try {
          // TODO: #13 refactor the interface definitions for requests and responses
          const response: { response: { top_queries: SearchQueryRecord[] } } = await core.http.get(
            endpoint,
            apiParams
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
        const noDuplicates: SearchQueryRecord[] = newQueries.filter(
          (query, index, self) => index === self.findIndex((q) => q.id === query.id)
        );

        const version = await getVersionOnce(dataSourceId);
        const is219OSVersion = version ? semver.eq(version, '2.19.0') : false;

        const fromTime = DateTime.fromISO(parseDateString(start));
        const toTime = DateTime.fromISO(parseDateString(end));

        const isWithinTimeWindow = (q: SearchQueryRecord) => {
          const ts = DateTime.fromMillis(q.timestamp);
          return ts.isValid && ts >= fromTime && ts <= toTime;
        };

        const filteredQueries = is219OSVersion
          ? noDuplicates.filter(isWithinTimeWindow)
          : noDuplicates;
        setQueries(filteredQueries);
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
      newExporterType: string = '',
      newGroupBy: string = '',
      newDeleteAfterDays: string = ''
    ) => {
      if (get) {
        try {
          // const resp = await core.http.get('/api/settings', {query: {dataSourceId: '738ffbd0-d8de-11ef-9d96-eff1abd421b8'}});
          const resp = await core.http.get('/api/settings', {
            query: { dataSourceId: getDataSourceFromUrl().id },
          });
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
            if (metricSetting?.enabled === 'false') {
              setMetricSettings(metricType, {
                isEnabled: false,
              });
            } else {
              const [time, timeUnits] = getTimeAndUnitFromString(metricSetting.window_size);
              setMetricSettings(metricType, {
                isEnabled: true,
                currTopN: metricSetting.top_n_size ?? DEFAULT_TOP_N_SIZE,
                currWindowSize: time,
                currTimeUnit: timeUnits,
              });
            }
          });
          const version = await getVersionOnce(dataSourceId);
          const groupBy = getMergedStringSettings(
            getGroupBySettingsPath(version, persistentSettings),
            getGroupBySettingsPath(version, transientSettings),
            DEFAULT_GROUP_BY
          );
          setGroupBySettings({ groupBy });

          const deleteAfterDays = getMergedStringSettings(
            persistentSettings?.exporter?.delete_after_days,
            transientSettings?.exporter?.delete_after_days,
            DEFAULT_DELETE_AFTER_DAYS
          );
          const exporterType = getMergedStringSettings(
            persistentSettings?.exporter?.type,
            transientSettings?.exporter?.type,
            DEFAULT_EXPORTER_TYPE
          );
          setDataRetentionSettings({ deleteAfterDays, exporterType });
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
          setDataRetentionSettings({
            deleteAfterDays: newDeleteAfterDays,
            exporterType: newExporterType,
          });
          const queryParams: Record<string, any> = {
            metric,
            enabled,
            top_n_size: newTopN,
            exporterType: newExporterType,
            group_by: newGroupBy,
            delete_after_days: newDeleteAfterDays,
            dataSourceId: getDataSourceFromUrl().id,
          };
          if (newTimeUnit === 'MINUTES') {
            newTimeUnit = 'm';
          }
          if (newTimeUnit === 'HOURS') {
            newTimeUnit = 'h';
          }
          if (newWindowSize && newTimeUnit) {
            queryParams.window_size = `${newWindowSize}${newTimeUnit}`;
          }

          await core.http.put('/api/update_settings', { query: queryParams });
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
  };

  useEffect(() => {
    onTimeChange({ start: currStart, end: currEnd });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currStart, currEnd]);

  useEffect(() => {
    retrieveQueries(currStart, currEnd);
  }, [latencySettings, cpuSettings, memorySettings, currStart, currEnd, retrieveQueries]);

  return (
    <DataSourceContext.Provider value={{ dataSource, setDataSource }}>
      <div style={{ padding: '35px 35px' }}>
        <Switch>
          <Route exact path="/query-details">
            {() => {
              return (
                <QueryDetails
                  core={core}
                  depsStart={depsStart}
                  params={params}
                  dataSourceManagement={dataSourceManagement}
                />
              );
            }}
          </Route>
          <Route exact path="/query-group-details">
            {() => {
              return (
                <QueryGroupDetails
                  core={core}
                  depsStart={depsStart}
                  params={params}
                  dataSourceManagement={dataSourceManagement}
                />
              );
            }}
          </Route>
          {showLiveQueries && (
            <Route exact path={LIVE_QUERIES}>
              <PageHeader
                coreStart={core}
                depsStart={depsStart}
                fallBackComponent={
                  <>
                    <EuiTitle size="l">
                      <h1>Query insights - In-flight queries</h1>
                    </EuiTitle>
                    <EuiSpacer size="l" />
                  </>
                }
              />
              <EuiTabs>{tabs.map(renderTab)}</EuiTabs>
              <EuiSpacer size="l" />
              <InflightQueries
                core={core}
                depsStart={depsStart}
                params={params}
                dataSourceManagement={dataSourceManagement}
              />
            </Route>
          )}
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
              depsStart={depsStart}
              params={params}
              retrieveQueries={retrieveQueries}
              dataSourceManagement={dataSourceManagement}
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
              dataRetentionSettings={dataRetentionSettings}
              configInfo={retrieveConfigInfo}
              core={core}
              depsStart={depsStart}
              params={params}
              dataSourceManagement={dataSourceManagement}
            />
          </Route>
          <Redirect to={QUERY_INSIGHTS} />
        </Switch>
      </div>
    </DataSourceContext.Provider>
  );
};

// eslint-disable-next-line import/no-default-export
export default TopNQueries;
