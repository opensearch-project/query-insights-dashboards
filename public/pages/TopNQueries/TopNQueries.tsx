/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Redirect, Route, Switch, useHistory, useLocation } from 'react-router-dom';
import { EuiTab, EuiTabs, EuiTitle, EuiSpacer } from '@elastic/eui';
import { AppMountParameters, CoreStart } from 'opensearch-dashboards/public';
import { DataSourceManagementPluginSetup } from 'src/plugins/data_source_management/public';
import { DataSourceOption } from 'src/plugins/data_source_management/public/components/data_source_menu/types';
import { DateTime } from 'luxon';
import QueryInsights from '../QueryInsights/QueryInsights';
import Configuration from '../Configuration/Configuration';
import QueryDetails from '../QueryDetails/QueryDetails';
import { InflightQueries } from '../InflightQueries/InflightQueries';
import { SearchQueryRecord } from '../../../types/types';
import { QueryGroupDetails } from '../QueryGroupDetails/QueryGroupDetails';
import TaskDetail from '../TaskDetail/TaskDetail';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import {
  getVersionOnce,
  getGroupBySettingsPath,
  isVersion31OrHigher,
  isVersion219,
} from '../../utils/version-utils';
import {
  DEFAULT_DELETE_AFTER_DAYS,
  DEFAULT_EXPORTER_TYPE,
  DEFAULT_GROUP_BY,
  DEFAULT_METRIC_ENABLED,
  DEFAULT_REMOTE_EXPORTER_ENABLED,
  DEFAULT_REMOTE_EXPORTER_PATH,
  DEFAULT_REMOTE_EXPORTER_REPOSITORY,
  DEFAULT_SHOW_LIVE_QUERIES_ON_ERROR,
  DEFAULT_TIME_UNIT,
  DEFAULT_TOP_N_SIZE,
  DEFAULT_WINDOW_SIZE,
  EXPORTER_TYPE,
  MetricType,
  QUERY_INSIGHTS_ACCESS_DENIED_TITLE,
  QUERY_INSIGHTS_SETTINGS_ACCESS_DENIED_TITLE,
  QUERY_INSIGHTS_SETTINGS_REQUEST_FAILED_MESSAGE,
  QUERY_INSIGHTS_SETTINGS_UPDATE_DENIED_TITLE,
  QUERY_INSIGHTS_SETTINGS_UPDATE_FAILED_MESSAGE,
} from '../../../common/constants';

import { parseDateString } from '../../../common/utils/DateUtils';
import {
  getErrorMessage,
  isFailedResponse,
  isForbiddenError,
} from '../../../common/utils/ErrorUtils';
import {
  getMergedMetricSettings,
  getMergedStringSettings,
  getTimeAndUnitFromString,
} from '../../../common/utils/MetricUtils';
import { getDataSourceFromUrl } from '../../utils/datasource-utils';
import { sharedDataSourceState } from '../../shared-state';

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

export interface RemoteExporterSettings {
  enabled: boolean;
  repository: string;
  path: string;
}

export interface EnabledMetrics {
  latency: boolean;
  cpu: boolean;
  memory: boolean;
}

export type ConfigurationLoadState = 'loading' | 'ready' | 'accessDenied' | 'error';

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

  // Sync with shared state
  useEffect(() => {
    const currentSharedState = sharedDataSourceState.getDataSource();
    if (currentSharedState.id || currentSharedState.label !== 'Local cluster') {
      setDataSource(currentSharedState);
    } else if (dataSource?.id || dataSource?.label !== 'Local cluster') {
      sharedDataSourceState.setDataSource(dataSource);
    }

    return sharedDataSourceState.subscribe(setDataSource);
  }, []);

  const wrappedSetDataSource = (newDataSource: DataSourceOption) => {
    setDataSource(newDataSource);
    sharedDataSourceState.setDataSource(newDataSource);
  };

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

  const [remoteExporterSettings, setRemoteExporterSettings] = useState<RemoteExporterSettings>({
    enabled: DEFAULT_REMOTE_EXPORTER_ENABLED,
    repository: DEFAULT_REMOTE_EXPORTER_REPOSITORY,
    path: DEFAULT_REMOTE_EXPORTER_PATH,
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
  const [queryAccessDenied, setQueryAccessDenied] = useState(false);
  const [configurationLoadState, setConfigurationLoadState] =
    useState<ConfigurationLoadState>('loading');
  const latestQueryRequestId = useRef(0);
  const latestConfigRequestId = useRef(0);
  const configSaveQueueByDataSource = useRef(new Map<string | undefined, Promise<void>>());
  const latestDataSourceChangeId = useRef(0);
  const isMounted = useRef(true);
  const enabledMetricsRef = useRef<EnabledMetrics>({
    latency: DEFAULT_METRIC_ENABLED,
    cpu: DEFAULT_METRIC_ENABLED,
    memory: DEFAULT_METRIC_ENABLED,
  });

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      latestQueryRequestId.current += 1;
      latestConfigRequestId.current += 1;
      latestDataSourceChangeId.current += 1;
    };
  }, []);

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
          setShowLiveQueries(DEFAULT_SHOW_LIVE_QUERIES_ON_ERROR);
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
    async (start: string, end: string, enabledMetrics?: EnabledMetrics) => {
      const requestId = ++latestQueryRequestId.current;
      const requestDataSourceId = getDataSourceFromUrl().id;
      const metrics = enabledMetrics ?? enabledMetricsRef.current;
      setLoading(true);
      setQueryAccessDenied(false);
      const nullResponse = { response: { top_queries: [] } };
      const apiParams = {
        query: {
          from: parseDateString(start),
          to: parseDateString(end),
          dataSourceId: requestDataSourceId,
          verbose: false,
        },
      };
      const fetchMetric = async (endpoint: string) => {
        try {
          // TODO: #13 refactor the interface definitions for requests and responses
          const response: {
            ok?: boolean;
            response: { top_queries: SearchQueryRecord[] } | string;
          } = await core.http.get(endpoint, apiParams);
          if (isForbiddenError(response)) {
            throw Object.assign(new Error(QUERY_INSIGHTS_ACCESS_DENIED_TITLE), {
              statusCode: 403,
            });
          }
          if (response?.ok === false) {
            throw new Error(
              typeof response.response === 'string'
                ? response.response
                : 'Failed to retrieve top queries'
            );
          }
          const responseBody =
            typeof response?.response === 'object' ? response.response : undefined;
          return {
            response: {
              top_queries: Array.isArray(responseBody?.top_queries) ? responseBody.top_queries : [],
            },
          };
        } catch (error) {
          if (isForbiddenError(error)) {
            throw error;
          }
          if (requestId !== latestQueryRequestId.current) {
            return nullResponse;
          }
          core.notifications.toasts.addDanger({
            title: 'Failed to retrieve top queries',
            text:
              error?.body?.message ??
              error?.message ??
              'An unknown error occurred while fetching top queries.',
          });
          return nullResponse;
        }
      };
      try {
        const respLatency = metrics.latency
          ? await fetchMetric('/api/top_queries/latency')
          : nullResponse;
        const respCpu = metrics.cpu ? await fetchMetric('/api/top_queries/cpu') : nullResponse;
        const respMemory = metrics.memory
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

        const version = await getVersionOnce(requestDataSourceId);
        const is219OSVersion = isVersion219(version);

        const fromTime = DateTime.fromISO(parseDateString(start));
        const toTime = DateTime.fromISO(parseDateString(end));

        const isWithinTimeWindow = (q: SearchQueryRecord) => {
          const ts = DateTime.fromMillis(q.timestamp);
          return ts.isValid && ts >= fromTime && ts <= toTime;
        };

        const filteredQueries = is219OSVersion
          ? noDuplicates.filter(isWithinTimeWindow)
          : noDuplicates;
        if (requestId === latestQueryRequestId.current) {
          setQueries(filteredQueries);
        }
      } catch (error) {
        if (requestId !== latestQueryRequestId.current) {
          return;
        }
        if (isForbiddenError(error)) {
          setQueries([]);
          setQueryAccessDenied(true);
          return;
        }
        console.error('Error retrieving queries:', error);
      } finally {
        if (requestId === latestQueryRequestId.current) {
          setLoading(false);
        }
      }
    },
    [core]
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
      newDeleteAfterDays: string = '',
      newRemoteEnabled: boolean = false,
      newRemoteRepository: string = '',
      newRemotePath: string = ''
    ): Promise<EnabledMetrics | undefined> => {
      if (get) {
        const requestId = ++latestConfigRequestId.current;
        setConfigurationLoadState('loading');
        try {
          const requestDataSourceId = getDataSourceFromUrl().id;
          // const resp = await core.http.get('/api/settings', {query: {dataSourceId: '738ffbd0-d8de-11ef-9d96-eff1abd421b8'}});
          const resp = await core.http.get('/api/settings', {
            query: { dataSourceId: requestDataSourceId },
          });
          if (isForbiddenError(resp)) {
            throw Object.assign(new Error(QUERY_INSIGHTS_SETTINGS_ACCESS_DENIED_TITLE), {
              statusCode: 403,
            });
          }
          if (isFailedResponse(resp)) {
            throw new Error(
              getErrorMessage(resp) ?? QUERY_INSIGHTS_SETTINGS_REQUEST_FAILED_MESSAGE
            );
          }
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

          const metricUpdates = metrics.map(({ metricType, metricSetting }) => {
            if (metricSetting?.enabled === 'false') {
              return {
                metricType,
                updates: { isEnabled: false },
              };
            }

            const [time, timeUnits] = getTimeAndUnitFromString(metricSetting.window_size);
            return {
              metricType,
              updates: {
                isEnabled: true,
                currTopN: metricSetting.top_n_size ?? DEFAULT_TOP_N_SIZE,
                currWindowSize: time,
                currTimeUnit: timeUnits,
              },
            };
          });
          const enabledMetrics: EnabledMetrics = {
            latency: metricUpdates[0].updates.isEnabled,
            cpu: metricUpdates[1].updates.isEnabled,
            memory: metricUpdates[2].updates.isEnabled,
          };
          const version = await getVersionOnce(requestDataSourceId);
          const groupBy = getMergedStringSettings(
            getGroupBySettingsPath(version, persistentSettings),
            getGroupBySettingsPath(version, transientSettings),
            DEFAULT_GROUP_BY
          );

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

          const remoteEnabled =
            persistentSettings?.exporter?.remote?.enabled === 'true' ||
            transientSettings?.exporter?.remote?.enabled === 'true';
          const remoteRepository = getMergedStringSettings(
            persistentSettings?.exporter?.remote?.repository,
            transientSettings?.exporter?.remote?.repository,
            DEFAULT_REMOTE_EXPORTER_REPOSITORY
          );
          const remotePath = getMergedStringSettings(
            persistentSettings?.exporter?.remote?.path,
            transientSettings?.exporter?.remote?.path,
            DEFAULT_REMOTE_EXPORTER_PATH
          );

          if (requestId !== latestConfigRequestId.current) {
            return;
          }

          enabledMetricsRef.current = enabledMetrics;
          metricUpdates.forEach(({ metricType, updates }) => {
            setMetricSettings(metricType, updates);
          });
          setGroupBySettings({ groupBy });
          setDataRetentionSettings({ deleteAfterDays, exporterType });
          setRemoteExporterSettings({
            enabled: remoteEnabled,
            repository: remoteRepository,
            path: remotePath,
          });
          setConfigurationLoadState('ready');
          return enabledMetrics;
        } catch (error) {
          if (requestId !== latestConfigRequestId.current) {
            return;
          }
          if (isForbiddenError(error)) {
            setConfigurationLoadState('accessDenied');
          } else {
            setConfigurationLoadState('error');
          }
          const fallbackMetrics = {
            latency: true,
            cpu: true,
            memory: true,
          };
          enabledMetricsRef.current = fallbackMetrics;
          return fallbackMetrics;
        }
      } else {
        const requestDataSourceId = getDataSourceFromUrl().id;
        const queryParams: Record<string, any> = {
          metric,
          enabled,
          top_n_size: newTopN,
          exporterType: newExporterType,
          group_by: newGroupBy,
          delete_after_days: newDeleteAfterDays,
          remote_enabled: newRemoteEnabled,
          remote_repository: newRemoteRepository,
          remote_path: newRemotePath,
          dataSourceId: requestDataSourceId,
        };
        const normalizedTimeUnit =
          newTimeUnit === 'MINUTES' ? 'm' : newTimeUnit === 'HOURS' ? 'h' : newTimeUnit;
        if (newWindowSize && normalizedTimeUnit) {
          queryParams.window_size = `${newWindowSize}${normalizedTimeUnit}`;
        }

        const previousSave =
          configSaveQueueByDataSource.current.get(requestDataSourceId) ?? Promise.resolve();
        const save = previousSave
          .catch(() => undefined)
          .then(async () => {
            if (!isMounted.current) {
              return;
            }

            const response = await core.http.put('/api/update_settings', { query: queryParams });
            if (!isMounted.current) {
              return;
            }
            if (isForbiddenError(response)) {
              throw Object.assign(new Error(QUERY_INSIGHTS_SETTINGS_UPDATE_DENIED_TITLE), {
                statusCode: 403,
              });
            }
            if (isFailedResponse(response)) {
              throw new Error(
                getErrorMessage(response) ?? QUERY_INSIGHTS_SETTINGS_UPDATE_FAILED_MESSAGE
              );
            }
            if (requestDataSourceId !== getDataSourceFromUrl().id) {
              return;
            }

            latestConfigRequestId.current += 1;
            if (
              metric === MetricType.LATENCY ||
              metric === MetricType.CPU ||
              metric === MetricType.MEMORY
            ) {
              enabledMetricsRef.current = {
                ...enabledMetricsRef.current,
                [metric]: enabled,
              };
            }
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
            setRemoteExporterSettings({
              enabled: newRemoteEnabled,
              repository: newRemoteRepository,
              path: newRemotePath,
            });
            setConfigurationLoadState('ready');
          });

        configSaveQueueByDataSource.current.set(requestDataSourceId, save);
        try {
          await save;
        } finally {
          if (configSaveQueueByDataSource.current.get(requestDataSourceId) === save) {
            configSaveQueueByDataSource.current.delete(requestDataSourceId);
          }
        }
      }
    },
    [core]
  );

  const onDataSourceChange = useCallback(async () => {
    const sourceChangeId = ++latestDataSourceChangeId.current;
    const requestDataSourceId = getDataSourceFromUrl().id;

    latestQueryRequestId.current += 1;
    setQueries([]);
    setQueryAccessDenied(false);
    setLoading(true);

    const enabledMetrics = await retrieveConfigInfo(true);
    if (
      sourceChangeId !== latestDataSourceChangeId.current ||
      requestDataSourceId !== getDataSourceFromUrl().id
    ) {
      return;
    }
    if (!enabledMetrics) {
      return;
    }

    await retrieveQueries(currStart, currEnd, enabledMetrics);
  }, [currEnd, currStart, retrieveConfigInfo, retrieveQueries]);

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
    <DataSourceContext.Provider value={{ dataSource, setDataSource: wrappedSetDataSource }}>
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
          <Route exact path="/task-detail">
            {() => (
              <TaskDetail
                core={core}
                depsStart={depsStart}
                params={params}
                dataSourceManagement={dataSourceManagement}
              />
            )}
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
                onDataSourceChange={onDataSourceChange}
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
              onDataSourceChange={onDataSourceChange}
              dataSourceManagement={dataSourceManagement}
              accessDenied={queryAccessDenied}
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
              remoteExporterSettings={remoteExporterSettings}
              configInfo={retrieveConfigInfo}
              onDataSourceChange={onDataSourceChange}
              configurationLoadState={configurationLoadState}
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
