/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useCallback, useContext } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiTextAlign,
  EuiIcon,
  EuiButtonGroup,
  EuiSwitch,
  EuiSpacer,
  EuiInMemoryTable,
  EuiButton,
  EuiLink,
  EuiFormRow,
  EuiSelect,
  EuiBadge,
} from '@elastic/eui';
import {
  RadialChart,
  XYPlot,
  HorizontalBarSeries,
  XAxis,
  YAxis,
  HorizontalGridLines,
} from 'react-vis';
import 'react-vis/dist/style.css';
import { Duration } from 'luxon';
import { filesize } from 'filesize';
import { AppMountParameters, CoreStart } from 'opensearch-dashboards/public';
import { DataSourceManagementPluginSetup } from 'src/plugins/data_source_management/public';
import { useLocation } from 'react-router-dom';
import { LiveSearchQueryResponse } from '../../../types/types';
import { retrieveLiveQueries } from '../../../common/utils/QueryUtils';
import { API_ENDPOINTS } from '../../../common/utils/apiendpoints';
import {
  DEFAULT_REFRESH_INTERVAL,
  TOP_N_DISPLAY_LIMIT,
  WLM_GROUP_ID_PARAM,
  ALL_WORKLOAD_GROUPS_TEXT,
  CHART_COLORS,
  REFRESH_INTERVAL_OPTIONS,
} from '../../../common/constants';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';
import { DataSourceContext } from '../TopNQueries/TopNQueries';
import { QueryInsightsDataSourceMenu } from '../../components/DataSourcePicker';

type LiveQueryRaw = NonNullable<LiveSearchQueryResponse['response']>['live_queries'][number];

type LiveQueryRow = LiveQueryRaw & {
  index: string;
  search_type: string;
  coordinator_node: string;
  node_label: string;
  wlm_group: string;
};

interface WlmGroupTally {
  total_completions?: number;
  total_cancellations?: number;
  total_rejections?: number;
}

interface WlmNodeStats {
  workload_groups?: Record<string, WlmGroupTally>;
}

// _nodes and cluster_name also appear; keep value loose
type WlmStatsBody = Record<string, WlmNodeStats | unknown>;

interface WlmGroupDetail {
  _id: string;
  name: string;
}

export const InflightQueries = ({
  core,
  depsStart,
  params,
  dataSourceManagement,
}: {
  core: CoreStart;
  params: AppMountParameters;
  dataSourceManagement?: DataSourceManagementPluginSetup;
  depsStart: QueryInsightsDashboardsPluginStartDependencies;
}) => {
  const isFetching = useRef(false);
  const [query, setQuery] = useState<LiveSearchQueryResponse | null>(null);
  const { dataSource, setDataSource } = useContext(DataSourceContext)!;
  const [nodeCounts, setNodeCounts] = useState<Record<string, number>>({});
  const [indexCounts, setIndexCounts] = useState<Record<string, number>>({});

  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(DEFAULT_REFRESH_INTERVAL);

  const [wlmGroupOptions, setWlmGroupOptions] = useState<Array<{ id: string; name: string }>>([]);

  const location = useLocation();
  const urlSearchParams = new URLSearchParams(location.search);
  const initialWlmGroup = urlSearchParams.get(WLM_GROUP_ID_PARAM) || '';

  const [wlmGroupId, setWlmGroupId] = useState<string | undefined>(
    initialWlmGroup !== '' ? initialWlmGroup : undefined
  );
  const wlmIdToNameMap = React.useMemo(
    () => Object.fromEntries(wlmGroupOptions.map((g) => [g.id, g.name])),
    [wlmGroupOptions]
  );

  const wlmCacheRef = useRef<Record<string, boolean>>({});

  const getWlmAvailable = useCallback((): boolean => {
    const cacheKey = dataSource?.id || 'default';
    return wlmCacheRef.current[cacheKey] ?? false;
  }, [dataSource?.id]);

  const detectWlm = useCallback(async (): Promise<boolean> => {
    const cacheKey = dataSource?.id || 'default';
    if (wlmCacheRef.current[cacheKey] !== undefined) {
      return wlmCacheRef.current[cacheKey];
    }

    try {
      const httpQuery = dataSource?.id ? { dataSourceId: dataSource.id } : undefined;
      const res = await core.http.get('/api/cat_plugins', { query: httpQuery });
      const has = !!res?.hasWlm;
      wlmCacheRef.current[cacheKey] = has;
      return has;
    } catch (e) {
      console.warn('[LiveQueries] _cat/plugins detection failed; assuming WLM unavailable', e);
      wlmCacheRef.current[cacheKey] = false;
      return false;
    }
  }, [core.http, dataSource?.id]);

  useEffect(() => {
    void detectWlm();
  }, [detectWlm]);

  const [workloadGroupStats, setWorkloadGroupStats] = useState<{
    total_completions: number;
    total_cancellations: number;
    total_rejections: number;
  }>({ total_completions: 0, total_cancellations: 0, total_rejections: 0 });

  const fetchActiveWlmGroups = useCallback(async () => {
    const httpQuery = dataSource?.id ? { dataSourceId: dataSource.id } : undefined;
    let statsBody: WlmStatsBody = {};
    try {
      const statsRes = await core.http.get('/api/_wlm/stats', { query: httpQuery });
      statsBody = ((statsRes as { body?: unknown }).body ?? statsRes) as WlmStatsBody;
    } catch (e) {
      console.warn('[LiveQueries] Failed to fetch WLM stats', e);
      setWorkloadGroupStats({ total_completions: 0, total_cancellations: 0, total_rejections: 0 });
      setWlmGroupOptions([]);
      return {};
    }

    const activeGroupIds = new Set<string>();
    let completions = 0;
    let cancellations = 0;
    let rejections = 0;

    for (const [nodeId, maybeNode] of Object.entries(statsBody)) {
      if (nodeId === '_nodes' || nodeId === 'cluster_name') continue;
      const nodeStats = maybeNode as WlmNodeStats;
      const workloadGroups = nodeStats.workload_groups ?? {};
      for (const [groupId, groupStats] of Object.entries(workloadGroups)) {
        activeGroupIds.add(groupId);
        if (!wlmGroupId || wlmGroupId === groupId) {
          const s = groupStats;
          completions += s.total_completions ?? 0;
          cancellations += s.total_cancellations ?? 0;
          rejections += s.total_rejections ?? 0;
        }
      }
    }

    setWorkloadGroupStats({
      total_completions: completions,
      total_cancellations: cancellations,
      total_rejections: rejections,
    });

    // fetch group NAMES only if plugin exists (but do not block the stats)
    const idToNameMap: Record<string, string> = {};
    try {
      if (getWlmAvailable()) {
        const groupsRes = await core.http.get('/api/_wlm/workload_group', { query: httpQuery });
        const details = ((groupsRes as { body?: { workload_groups?: WlmGroupDetail[] } }).body
          ?.workload_groups ??
          (groupsRes as { workload_groups?: WlmGroupDetail[] }).workload_groups ??
          []) as WlmGroupDetail[];

        for (const g of details) idToNameMap[g._id] = g.name;
      }
    } catch (e) {
      console.warn('[LiveQueries] Failed to fetch workload groups', e);
    }

    const options = Array.from(activeGroupIds).map((id) => ({ id, name: idToNameMap[id] || id }));
    setWlmGroupOptions(options);
    return idToNameMap;
  }, [core.http, dataSource?.id, wlmGroupId, detectWlm]);

  const liveQueries = query?.response?.live_queries ?? [];

  const convertTime = (unixTime: number) => {
    const date = new Date(unixTime);
    const loc = date.toDateString().split(' ');
    return `${loc[1]} ${loc[2]}, ${loc[3]} @ ${date.toLocaleTimeString('en-US')}`;
  };

  const fetchLiveQueries = useCallback(
    async (idToNameMapParam?: Record<string, string>) => {
      const retrieved = await retrieveLiveQueries(core, dataSource?.id, wlmGroupId);

      if (retrieved?.response?.live_queries) {
        const mapFromOptions: Record<string, string> = Object.fromEntries(
          wlmGroupOptions.map((g) => [g.id, g.name])
        );
        const idToName = { ...mapFromOptions, ...(idToNameMapParam ?? {}) };

        const tempNodeCount: Record<string, number> = {};
        const indexCount: Record<string, number> = {};

        const parsed: LiveQueryRow[] = retrieved.response.live_queries.map((q) => {
          const indexMatch = q.description?.match(/indices\[(.*?)\]/);
          const searchTypeMatch = q.description?.match(/search_type\[(.*?)\]/);

          const wlmDisplay =
            typeof q.wlm_group_id === 'string' && q.wlm_group_id.trim() !== ''
              ? idToName[q.wlm_group_id] ?? q.wlm_group_id
              : 'N/A';

          return {
            ...q,
            index: indexMatch ? indexMatch[1] : 'N/A',
            search_type: searchTypeMatch ? searchTypeMatch[1] : 'N/A',
            coordinator_node: q.node_id,
            node_label: q.node_id,
            wlm_group: wlmDisplay,
          };
        });

        setQuery({ ...retrieved, response: { live_queries: parsed } });

        parsed.forEach((liveQuery) => {
          const nodeId = liveQuery.node_id;
          tempNodeCount[nodeId] = (tempNodeCount[nodeId] || 0) + 1;
          const index = liveQuery.index;
          if (index && typeof index === 'string') {
            indexCount[index] = (indexCount[index] || 0) + 1;
          }
        });

        const sortedNodes = Object.entries(tempNodeCount).sort(([, a], [, b]) => b - a);
        const nodeCount: Record<string, number> = {};
        let othersCount = 0;
        sortedNodes.forEach(([nodeId, count], i) => {
          if (i < TOP_N_DISPLAY_LIMIT) nodeCount[nodeId] = count;
          else othersCount += count;
        });
        if (othersCount > 0) nodeCount.others = othersCount;
        setNodeCounts(nodeCount);

        const sortedIndices = Object.entries(indexCount).sort(([, a], [, b]) => b - a);
        const topIndexCount: Record<string, number> = {};
        let indexOthersCount = 0;
        sortedIndices.forEach(([indexName, count], i) => {
          if (i < TOP_N_DISPLAY_LIMIT) topIndexCount[indexName] = count;
          else indexOthersCount += count;
        });
        if (indexOthersCount > 0) topIndexCount.others = indexOthersCount;
        setIndexCounts(topIndexCount);
      }
    },
    // deps for react-hooks/exhaustive-deps
    [core, dataSource?.id, wlmGroupId, wlmGroupOptions]
  );

  function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => reject(new Error('Timed out')), ms);
      promise
        .then((res) => {
          clearTimeout(timeoutId);
          resolve(res);
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          reject(err);
        });
    });
  }

  const fetchLiveQueriesSafe = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      const budget = Math.max(2000, refreshInterval - 500);
      const map = await withTimeout(fetchActiveWlmGroups(), budget).catch(() => undefined);
      await fetchLiveQueries(map);
    } finally {
      isFetching.current = false;
    }
  }, [refreshInterval, fetchActiveWlmGroups, fetchLiveQueries]);

  useEffect(() => {
    void fetchLiveQueriesSafe();

    if (!autoRefreshEnabled) return;
    const interval = setInterval(() => {
      void fetchLiveQueriesSafe();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, refreshInterval, fetchLiveQueriesSafe]);

  const [pagination, setPagination] = useState({ pageIndex: 0 });
  const [tableQuery, setTableQuery] = useState('');
  const [tableFilters, setTableFilters] = useState([]);

  const formatTime = (seconds: number): string => {
    if (seconds < 1e-3) return `${(seconds * 1e6).toFixed(2)} µs`;
    if (seconds < 1) return `${(seconds * 1e3).toFixed(2)} ms`;

    const duration = Duration.fromObject({ seconds }).shiftTo(
      'days',
      'hours',
      'minutes',
      'seconds'
    );
    const parts = [];

    if (duration.days) parts.push(`${duration.days} d`);
    if (duration.hours) parts.push(`${duration.hours} h`);
    if (duration.minutes) parts.push(`${duration.minutes} m`);
    if (duration.seconds) parts.push(`${duration.seconds.toFixed(2)} s`);

    return parts.join(' ');
  };

  const formatMemory = (bytes: number): string => {
    return filesize(bytes, { base: 2, standard: 'jedec' });
  };

  const chartOptions = [
    { id: 'donut', label: 'Donut', iconType: 'visPie' },
    { id: 'bar', label: 'Bar', iconType: 'visBarHorizontal' },
  ];

  const [selectedChartIdByIndex, setSelectedChartIdByIndex] = useState('donut');
  const [selectedChartIdByNode, setSelectedChartIdByNode] = useState('donut');

  const onChartChangeByIndex = (optionId: string) => {
    setSelectedChartIdByIndex(optionId);
  };

  const onChartChangeByNode = (optionId: string) => {
    setSelectedChartIdByNode(optionId);
  };

  const [selectedItems, setSelectedItems] = useState<any[]>([]);

  const selection = {
    selectable: (item: any) => item.is_cancelled !== true,
    onSelectionChange: (selected: any[]) => {
      setSelectedItems(selected);
    },
  };

  const Legend = ({ data }: { data: Record<string, number> }) => (
    <EuiFlexGroup direction="row" wrap responsive={false} gutterSize="s">
      {Object.entries(data).map(([label, value], idx) => (
        <EuiFlexItem key={label} grow={false}>
          <EuiText size="xs">
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                marginRight: 6,
              }}
            />
            {label}: {value}
          </EuiText>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );

  const metrics = React.useMemo(() => {
    if (!query || !query.response?.live_queries?.length) return null;

    const queries = query.response.live_queries;

    const activeQueries = queries.length;
    let totalLatency = 0;
    let totalCPU = 0;
    let totalMemory = 0;
    let longestLatency = 0;
    let longestQueryId = '';

    queries.forEach((q) => {
      const latency = q.measurements?.latency?.number ?? 0;
      const cpu = q.measurements?.cpu?.number ?? 0;
      const memory = q.measurements?.memory?.number ?? 0;

      totalLatency += latency;
      totalCPU += cpu;
      totalMemory += memory;

      if (latency > longestLatency) {
        longestLatency = latency;
        longestQueryId = q.id;
      }
    });

    return {
      activeQueries,
      avgElapsedSec: totalLatency / activeQueries / 1000000000,
      longestElapsedSec: longestLatency / 1000000000,
      longestQueryId,
      totalCPUSec: totalCPU / 1000000000,
      totalMemoryBytes: totalMemory,
    };
  }, [query]);

  const getReactVisChartData = (counts: Record<string, number>) => {
    return Object.entries(counts).map(([label, value], index) => ({
      x: value, // value for horizontal bar
      y: label, // category
      angle: value,
      label,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  };

  return (
    <div>
      <QueryInsightsDataSourceMenu
        coreStart={core}
        depsStart={depsStart}
        params={params}
        dataSourceManagement={dataSourceManagement}
        setDataSource={setDataSource}
        selectedDataSource={dataSource}
        onManageDataSource={() => {}}
        onSelectedDataSource={() => {
          fetchLiveQueries(); // re-fetch queries when data source changes
        }}
        dataSourcePickerReadOnly={false}
      />
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" gutterSize="m" justifyContent="spaceBetween">
        {/* LEFT: WLM status + optional selector */}

        <EuiFlexGroup gutterSize="none" alignItems="center">
          <EuiBadge
            color="default"
            style={{
              padding: '6px 12px',
              height: 32,
              display: 'flex',
              alignItems: 'center',
              fontWeight: 'bold',
            }}
          >
            Workload group
          </EuiBadge>
          <EuiFlexItem grow={false}>
            <EuiSelect
              id="wlm-group-select"
              options={[
                { value: '', text: ALL_WORKLOAD_GROUPS_TEXT },
                ...wlmGroupOptions.map((g) => ({ value: g.id, text: g.name })),
              ]}
              value={wlmGroupId ?? ''}
              onChange={(e) => {
                const value = e.target.value || undefined;
                setWlmGroupId(value);
              }}
              aria-label="Workload group selector"
              compressed
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        {/* </EuiFlexGroup>*/}

        {/* RIGHT: refresh / auto-refresh */}
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiSwitch
                label="Auto-refresh"
                checked={autoRefreshEnabled}
                onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                data-test-subj="live-queries-autorefresh-toggle"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow display="columnCompressed">
                <EuiSelect
                  value={String(refreshInterval)}
                  onChange={(e) => setRefreshInterval(parseInt(e.target.value, 10))}
                  options={REFRESH_INTERVAL_OPTIONS}
                  disabled={!autoRefreshEnabled}
                  data-test-subj="live-queries-refresh-interval"
                  compressed
                  style={{ minWidth: 140 }}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="refresh"
                onClick={async () => {
                  await fetchLiveQueries();
                }}
                data-test-subj="live-queries-refresh-button"
              >
                Refresh
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />

      <EuiFlexGroup>
        {/* Active Queries */}
        <EuiFlexItem>
          <EuiPanel paddingSize="m" data-test-subj="panel-active-queries">
            <EuiFlexItem>
              <EuiTextAlign textAlign="center">
                <EuiText size="s">
                  <p>Active queries</p>
                </EuiText>
                <EuiTitle size="l">
                  <h2>
                    <b>{metrics?.activeQueries ?? 0}</b>
                  </h2>
                </EuiTitle>
                <EuiIcon type="visGauge" />
              </EuiTextAlign>
            </EuiFlexItem>
          </EuiPanel>
        </EuiFlexItem>

        {/* Avg. elapsed time */}
        <EuiFlexItem>
          <EuiPanel paddingSize="m" data-test-subj="panel-avg-elapsed-time">
            <EuiFlexItem>
              <EuiTextAlign textAlign="center">
                <EuiText size="s">
                  <p>Avg. elapsed time</p>
                </EuiText>
                <EuiTitle size="l">
                  <h2>
                    <b>{metrics ? formatTime(metrics.avgElapsedSec) : 0}</b>
                  </h2>
                </EuiTitle>
                <EuiText size="s">
                  <p>(Avg. across {metrics?.activeQueries ?? 0})</p>
                </EuiText>
              </EuiTextAlign>
            </EuiFlexItem>
          </EuiPanel>
        </EuiFlexItem>

        {/* Longest running query */}
        <EuiFlexItem>
          <EuiPanel paddingSize="m" data-test-subj="panel-longest-query">
            <EuiFlexItem>
              <EuiTextAlign textAlign="center">
                <EuiText size="s">
                  <p>Longest running query</p>
                </EuiText>
                <EuiTitle size="l">
                  <h2>
                    <b>{metrics ? formatTime(metrics.longestElapsedSec) : 0}</b>
                  </h2>
                </EuiTitle>
                {metrics?.longestQueryId && (
                  <EuiText size="s">
                    <p>ID: {metrics.longestQueryId}</p>
                  </EuiText>
                )}
              </EuiTextAlign>
            </EuiFlexItem>
          </EuiPanel>
        </EuiFlexItem>

        {/* Total CPU usage */}
        <EuiFlexItem>
          <EuiPanel paddingSize="m" data-test-subj="panel-total-cpu">
            <EuiFlexItem>
              <EuiTextAlign textAlign="center">
                <EuiText size="s">
                  <p>Total CPU usage</p>
                </EuiText>
                <EuiTitle size="l">
                  <h2>
                    <b>{metrics ? formatTime(metrics.totalCPUSec) : 0}</b>
                  </h2>
                </EuiTitle>
                <EuiText size="s">
                  <p>(Sum across {metrics?.activeQueries ?? 0})</p>
                </EuiText>
              </EuiTextAlign>
            </EuiFlexItem>
          </EuiPanel>
        </EuiFlexItem>

        {/* Total memory usage */}
        <EuiFlexItem>
          <EuiPanel paddingSize="m" data-test-subj="panel-total-memory">
            <EuiFlexItem>
              <EuiTextAlign textAlign="center">
                <EuiText size="s">
                  <p>Total memory usage</p>
                </EuiText>
                <EuiTitle size="l">
                  <h2>
                    <b>{metrics ? formatMemory(metrics.totalMemoryBytes) : 0}</b>
                  </h2>
                </EuiTitle>
                <EuiText size="s">
                  <p>(Sum across {metrics?.activeQueries ?? 0})</p>
                </EuiText>
              </EuiTextAlign>
            </EuiFlexItem>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        {/* Queries by Node */}
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiTitle size="xs">
                <p>Queries by Node</p>
              </EuiTitle>
              <EuiButtonGroup
                legend="Chart Type"
                options={chartOptions}
                idSelected={selectedChartIdByNode}
                onChange={onChartChangeByNode}
                color="primary"
              />
            </EuiFlexGroup>
            <EuiSpacer size="l" />
            {Object.keys(nodeCounts).length > 0 ? (
              selectedChartIdByNode === 'donut' ? (
                <>
                  <RadialChart
                    data={getReactVisChartData(nodeCounts)}
                    width={300}
                    height={300}
                    innerRadius={80}
                    radius={140}
                    colorType="literal"
                    data-test-subj="chart-node-donut"
                  />
                  <EuiSpacer size="s" />
                  <Legend data={nodeCounts} />
                </>
              ) : (
                <XYPlot
                  yType="ordinal"
                  width={400}
                  height={300}
                  margin={{ left: 180 }}
                  colorType="literal"
                  data-test-subj="chart-node-bar"
                >
                  <HorizontalGridLines />
                  <XAxis />
                  <YAxis />
                  <HorizontalBarSeries
                    data={getReactVisChartData(nodeCounts)}
                    getColor={(d) => d.color}
                  />
                </XYPlot>
              )
            ) : (
              <EuiTextAlign textAlign="center">
                <EuiSpacer size="xl" />
                <EuiText color="subdued">
                  <p>No data available</p>
                </EuiText>
                <EuiSpacer size="xl" />
              </EuiTextAlign>
            )}
          </EuiPanel>
        </EuiFlexItem>

        {/* Queries by Index */}
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiTitle size="xs">
                <p>Queries by Index</p>
              </EuiTitle>
              <EuiButtonGroup
                legend="Chart Type"
                options={chartOptions}
                idSelected={selectedChartIdByIndex}
                onChange={onChartChangeByIndex}
                color="primary"
              />
            </EuiFlexGroup>
            <EuiSpacer size="l" />
            {Object.keys(indexCounts).length > 0 ? (
              selectedChartIdByIndex === 'donut' ? (
                <>
                  <RadialChart
                    data={getReactVisChartData(indexCounts)}
                    width={300}
                    height={300}
                    innerRadius={80}
                    radius={140}
                    colorType="literal"
                    data-test-subj="chart-index-donut"
                  />
                  <EuiSpacer size="s" />
                  <Legend data={indexCounts} />
                </>
              ) : (
                <XYPlot
                  yType="ordinal"
                  width={500}
                  height={300}
                  margin={{ left: 180 }}
                  data-test-subj="chart-index-bar"
                >
                  <HorizontalGridLines />
                  <XAxis />
                  <YAxis />
                  <HorizontalBarSeries
                    data={getReactVisChartData(indexCounts)}
                    colorType="literal"
                    getColor={(d) => d.color}
                  />
                </XYPlot>
              )
            ) : (
              <EuiTextAlign textAlign="center">
                <EuiSpacer size="xl" />
                <EuiText color="subdued">
                  <p>No data available</p>
                </EuiText>
                <EuiSpacer size="xl" />
              </EuiTextAlign>
            )}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        {/* WLM Group Stats Panels */}
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTextAlign textAlign="center">
              <EuiText size="s">
                <p>Total completions</p>
              </EuiText>
              <EuiTitle size="l">
                <h2>{workloadGroupStats.total_completions}</h2>
              </EuiTitle>
            </EuiTextAlign>
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTextAlign textAlign="center">
              <EuiText size="s">
                <p>Total cancellations</p>
              </EuiText>
              <EuiTitle size="l">
                <h2>{workloadGroupStats.total_cancellations}</h2>
              </EuiTitle>
            </EuiTextAlign>
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTextAlign textAlign="center">
              <EuiText size="s">
                <p>Total rejections</p>
              </EuiText>
              <EuiTitle size="l">
                <h2>{workloadGroupStats.total_rejections}</h2>
              </EuiTitle>
            </EuiTextAlign>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      <EuiPanel paddingSize="m">
        <EuiInMemoryTable
          items={liveQueries}
          search={{
            query: tableQuery,
            onChange: ({ queryText }) => {
              setTableQuery(queryText || '');
            },
            box: {
              placeholder: 'Search queries',
              schema: false,
            },
            filters: tableFilters,
            toolsLeft: selectedItems.length > 0 && [
              <EuiButton
                key="delete-button"
                color="danger"
                iconType="trash"
                disabled={selectedItems.length === 0}
                onClick={async () => {
                  const httpClient = dataSource?.id
                    ? depsStart.data.dataSources.get(dataSource.id)
                    : core.http;

                  await Promise.allSettled(
                    selectedItems.map((item) =>
                      httpClient.post(API_ENDPOINTS.CANCEL_TASK(item.id)).then(
                        () => ({ status: 'fulfilled', id: item.id }),
                        (err) => ({ status: 'rejected', id: item.id, error: err })
                      )
                    )
                  );
                  setSelectedItems([]);
                }}
              >
                Cancel {selectedItems.length} {selectedItems.length !== 1 ? 'queries' : 'query'}
              </EuiButton>,
            ],
            toolsRight: [
              <EuiButton
                key="refresh-button"
                iconType="refresh"
                onClick={async () => {
                  await fetchLiveQueries();
                }}
              >
                Refresh
              </EuiButton>,
            ],
            filters: [
              {
                type: 'field_value_selection',
                field: 'index',
                name: 'Index',
                multiSelect: 'or',
                options: [...new Set(liveQueries.map((q) => q.index))].map((val) => ({
                  value: val,
                  name: val,
                  view: val,
                })),
              },
              {
                type: 'field_value_selection',
                field: 'search_type',
                name: 'Search type',
                multiSelect: 'or',
                options: [...new Set(liveQueries.map((q) => q.search_type))].map((val) => ({
                  value: val,
                  name: val,
                  view: val,
                })),
              },
              {
                type: 'field_value_selection',
                field: 'coordinator_node',
                name: 'Coordinator Node ID',
                multiSelect: 'or',
                options: [...new Set(liveQueries.map((q) => q.node_id))].map((val) => ({
                  value: val,
                  name: val,
                  view: val,
                })),
              },
            ],
            onFiltersChange: (filters) => {
              setTableFilters(filters);
            },
          }}
          columns={[
            { name: 'Timestamp', render: (item) => convertTime(item.timestamp) },
            { field: 'id', name: 'Task ID' },
            { field: 'index', name: 'Index' },
            { field: 'coordinator_node', name: 'Coordinator node' },
            {
              name: 'Time elapsed',
              render: (item) => formatTime(item.measurements?.latency?.number / 1e9),
            },
            {
              name: 'CPU usage',
              render: (item) => formatTime(item.measurements?.cpu?.number / 1e9),
            },
            {
              name: 'Memory usage',
              render: (item) => formatMemory(item.measurements?.memory?.number),
            },
            { field: 'search_type', name: 'Search type' },

            {
              name: 'Status',
              render: (item) =>
                item.is_cancelled === true ? (
                  <EuiText color="danger">
                    <b>Cancelled</b>
                  </EuiText>
                ) : (
                  <EuiText style={{ color: '#0073e6' }}>
                    <b>Running</b>
                  </EuiText>
                ),
            },

            {
              name: 'WLM Group',
              render: (item: any) => {
                if (!item.wlm_group || item.wlm_group === 'N/A') {
                  return 'N/A';
                }

                const displayName = wlmIdToNameMap[item.wlm_group] ?? item.wlm_group;

                if (getWlmAvailable()) {
                  // Plugin enabled → clickable link
                  return (
                    <EuiLink
                      onClick={() => {
                        core.application.navigateToApp('workloadManagement', {
                          path: `#/wlm-details?name=${encodeURIComponent(displayName)}`,
                        });
                      }}
                      color="primary"
                    >
                      {displayName} <EuiIcon type="popout" size="s" />
                    </EuiLink>
                  );
                }

                // Plugin not available → simple text
                return <span>{displayName}</span>;
              },
            },

            {
              name: 'Actions',
              actions: [
                {
                  name: 'Cancel',
                  description: 'Cancel this query',
                  icon: 'trash',
                  color: 'danger',
                  type: 'icon',
                  available: (item) => item.is_cancelled !== true,
                  onClick: async (item) => {
                    try {
                      const httpClient = dataSource?.id
                        ? depsStart.data.dataSources.get(dataSource.id)
                        : core.http;

                      await httpClient.post(API_ENDPOINTS.CANCEL_TASK(item.id));
                      await new Promise((r) => setTimeout(r, 300));
                      await fetchLiveQueries();
                    } catch (err) {
                      console.error('Failed to cancel task', err);
                    }
                  },
                },
              ],
            },
          ]}
          selection={selection}
          pagination={{
            pageIndex: pagination.pageIndex,
            pageSize: 10,
            pageSizeOptions: [10, 20, 50],
          }}
          onTableChange={(e: { page?: { index: number } }) =>
            setPagination({ pageIndex: e.page?.index ?? 0 })
          }
          itemId={(row) => `${row.id}-${row.timestamp}`}
          loading={!query}
        />
      </EuiPanel>
    </div>
  );
};
