/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useCallback, useContext, useMemo } from 'react';
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
  EuiSelect,
  EuiBadge,
  EuiAccordion,
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
import { useHistory, useLocation } from 'react-router-dom';
import { LiveSearchQueryResponse } from '../../../types/types';
import { retrieveLiveQueries } from '../../../common/utils/QueryUtils';
import { API_ENDPOINTS } from '../../../common/utils/apiendpoints';
import { TaskDetailFlyout } from './TaskDetailFlyout';
import {
  DEFAULT_REFRESH_INTERVAL,
  TOP_N_DISPLAY_LIMIT,
  WLM_GROUP_ID_PARAM,
  CHART_COLORS,
  REFRESH_INTERVAL_OPTIONS,
} from '../../../common/constants';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';
import { DataSourceContext } from '../TopNQueries/TopNQueries';
import { QueryInsightsDataSourceMenu } from '../../components/DataSourcePicker';
import {
  getVersionOnce,
  isVersion33OrHigher,
  isVersion37OrHigher,
} from '../../utils/version-utils';
import {
  DynamicSearchBar,
  FieldDef,
  parseExpression,
  evaluateExpression,
} from '../../components/DynamicSearchBar';
import { SearchQueryRecord } from '../../../types/types';
import { useColumnVisibility, ColumnDef } from '../../hooks/useColumnVisibility';
import { ColumnVisibilityPopover } from '../../components/ColumnVisibilityPopover';

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
  const [showFinishedQueries, setShowFinishedQueries] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(DEFAULT_REFRESH_INTERVAL);

  const [wlmGroupOptions, setWlmGroupOptions] = useState<Array<{ id: string; name: string }>>([]);

  const location = useLocation();
  const history = useHistory();
  const urlSearchParams = new URLSearchParams(location.search);
  const initialWlmGroup = urlSearchParams.get(WLM_GROUP_ID_PARAM) || '';

  const wlmGroupId = initialWlmGroup !== '' ? initialWlmGroup : undefined;
  const wlmIdToNameMap = React.useMemo(
    () => Object.fromEntries(wlmGroupOptions.map((g) => [g.id, g.name])),
    [wlmGroupOptions]
  );

  const [wlmAvailable, setWlmAvailable] = useState<boolean>(false);
  const [queryInsightWlmNavigationSupported, setQueryInsightWlmNavigationSupported] =
    useState<boolean>(false);
  const [taskDetailSupported, setTaskDetailSupported] = useState<boolean>(false);
  const wlmCacheRef = useRef<Record<string, boolean>>({});

  const detectWlm = useCallback(async (): Promise<boolean> => {
    const cacheKey = dataSource?.id || 'default';
    if (wlmCacheRef.current[cacheKey] !== undefined) {
      return wlmCacheRef.current[cacheKey];
    }

    try {
      const httpQuery = dataSource?.id ? { dataSourceId: dataSource.id } : undefined;
      const res = await core.http.get('/api/_wlm/workload_group', { query: httpQuery });
      const hasValidStructure =
        res && typeof res === 'object' && Array.isArray(res.workload_groups);
      wlmCacheRef.current[cacheKey] = hasValidStructure;
      return hasValidStructure;
    } catch (e) {
      console.warn('[LiveQueries] WLM workload group API failed; assuming WLM unavailable', e);
      wlmCacheRef.current[cacheKey] = false;
      return false;
    }
  }, [core.http, dataSource?.id]);

  useEffect(() => {
    const checkWlmSupport = async () => {
      try {
        const version = await getVersionOnce(dataSource?.id || '');
        const versionSupported = isVersion33OrHigher(version);
        setQueryInsightWlmNavigationSupported(versionSupported);
        setTaskDetailSupported(isVersion37OrHigher(version));

        if (versionSupported) {
          const hasWlm = await detectWlm();

          setWlmAvailable(hasWlm);
        } else {
          setWlmAvailable(false);
        }
      } catch (e) {
        console.warn('Failed to check version for WLM groups support', e);
        setQueryInsightWlmNavigationSupported(false);
        setTaskDetailSupported(false);
        setWlmAvailable(false);
      }
    };

    checkWlmSupport();
  }, [detectWlm, dataSource?.id]);

  // Clean URL after extracting wlmGroupId
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get(WLM_GROUP_ID_PARAM)) {
      history.replace(location.pathname);
    }
  }, [location.search, history, location.pathname]);

  const [finishedQueryStats, setFinishedQueryStats] = useState<{
    total_completions: number;
    total_cancellations: number;
    total_failures: number;
  }>({ total_completions: 0, total_cancellations: 0, total_failures: 0 });

  const fetchActiveWlmGroups = useCallback(async () => {
    const httpQuery = dataSource?.id ? { dataSourceId: dataSource.id } : undefined;
    let statsBody: WlmStatsBody = {};
    try {
      const statsRes = await core.http.get(API_ENDPOINTS.WLM_STATS, { query: httpQuery });
      statsBody = statsRes as WlmStatsBody;
    } catch (e) {
      console.warn('[LiveQueries] Failed to fetch WLM stats', e);
      setWlmGroupOptions([]);
      return {};
    }

    const activeGroupIds = new Set<string>();

    // Sample WLM stats response:
    // {
    //   "_nodes": { "total": 2, "successful": 2, "failed": 0 },
    //   "cluster_name": "integTest",
    //   "tFvUEfRYTDq2LvVP52QKRg": {
    //     "workload_groups": {
    //       "DEFAULT_WORKLOAD_GROUP": {
    //         "total_completions": 318,
    //         "total_rejections": 0,
    //         "total_cancellations": 0
    //       }
    //     }
    //   },
    //   "kdQwbWg-RKmfaGf9K0uRFg": {
    //     "workload_groups": {
    //       "DEFAULT_WORKLOAD_GROUP": {
    //         "total_completions": 638,
    //         "total_rejections": 0,
    //         "total_cancellations": 0
    //       }
    //     }
    //   }
    // }
    for (const [key, maybeNode] of Object.entries(statsBody)) {
      // Skip metadata fields - only process actual node entries
      if (key === '_nodes' || key === 'cluster_name') continue;
      const nodeStats = maybeNode as WlmNodeStats;
      const workloadGroups = nodeStats.workload_groups ?? {};
      for (const [groupId] of Object.entries(workloadGroups)) {
        activeGroupIds.add(groupId);
      }
    }

    // fetch group NAMES only if plugin exists and version supported
    const idToNameMap: Record<string, string> = {};
    try {
      if (wlmAvailable && queryInsightWlmNavigationSupported) {
        const groupsRes = await core.http.get(API_ENDPOINTS.WLM_WORKLOAD_GROUP, {
          query: httpQuery,
        });
        const details = ((groupsRes as { body?: { workload_groups?: WlmGroupDetail[] } }).body
          ?.workload_groups ??
          (groupsRes as { workload_groups?: WlmGroupDetail[] }).workload_groups ??
          []) as WlmGroupDetail[];

        for (const g of details) idToNameMap[g._id] = g.name;
      }
    } catch (e) {
      console.warn('[LiveQueries] Failed to fetch workload groups', e);
    }

    const options = queryInsightWlmNavigationSupported
      ? Array.from(activeGroupIds).map((id) => ({ id, name: idToNameMap[id] || id }))
      : [];
    setWlmGroupOptions(options);
    return idToNameMap;
  }, [core.http, dataSource?.id, wlmGroupId, queryInsightWlmNavigationSupported]);

  const liveQueries = query?.response?.live_queries ?? [];

  const convertTime = (unixTime: number) => {
    const date = new Date(unixTime);
    const loc = date.toDateString().split(' ');
    return `${loc[1]} ${loc[2]}, ${loc[3]} @ ${date.toLocaleTimeString('en-US')}`;
  };

  const fetchLiveQueries = useCallback(
    async (idToNameMapParam?: Record<string, string>) => {
      const retrieved = await retrieveLiveQueries(
        core,
        dataSource?.id,
        wlmGroupId,
        taskDetailSupported && showFinishedQueries
      );

      if (retrieved?.response?.live_queries) {
        const mapFromOptions: Record<string, string> = Object.fromEntries(
          wlmGroupOptions.map((g) => [g.id, g.name])
        );
        const idToName = { ...mapFromOptions, ...(idToNameMapParam ?? {}) };

        const tempNodeCount: Record<string, number> = {};
        const indexCount: Record<string, number> = {};

        const parsed: LiveQueryRow[] = retrieved.response.live_queries.map((q) => {
          const desc = (q as any).coordinator_task?.description || (q as any).description || '';
          const indexMatch = desc.match(/indices\[(.*?)\]/);
          const searchTypeMatch = desc.match(/search_type\[(.*?)\]/);
          const nodeId = (q as any).coordinator_task?.node_id || (q as any).node_id || '';

          const wlmDisplay =
            typeof q.wlm_group_id === 'string' && q.wlm_group_id.trim() !== ''
              ? (idToName[q.wlm_group_id] ?? q.wlm_group_id)
              : 'N/A';

          // Normalize measurements for both old and new API formats
          // For running queries, top-level totals may be 0 — sum from shard tasks instead
          const shards = (q as any).shard_tasks || [];
          const shardCpuTotal = shards.reduce((sum: number, s: any) => sum + (s.cpu_nanos || 0), 0);
          const shardMemTotal = shards.reduce(
            (sum: number, s: any) => sum + (s.memory_bytes || 0),
            0
          );
          const measurements = (q as any).measurements || {
            latency: { number: ((q as any).total_latency_millis || 0) * 1e6 },
            cpu: { number: (q as any).total_cpu_nanos || shardCpuTotal || 0 },
            memory: { number: (q as any).total_memory_bytes || shardMemTotal || 0 },
          };

          return {
            ...q,
            timestamp: (q as any).timestamp || (q as any).start_time,
            description: desc,
            node_id: nodeId,
            measurements,
            is_cancelled: (q as any).status === 'cancelled' || (q as any).is_cancelled === true,
            index: indexMatch ? indexMatch[1] : 'N/A',
            search_type: searchTypeMatch
              ? searchTypeMatch[1].replace(/_/g, ' ')
              : ((q as any).search_type || 'N/A').replace(/_/g, ' '),
            coordinator_node: nodeId,
            node_label: nodeId,
            wlm_group: wlmDisplay,
          };
        });

        setQuery({ ...retrieved, response: { live_queries: parsed } });

        // Merge finished queries if available
        const finishedQueries = (retrieved.response as any).finished_queries || [];
        if (showFinishedQueries && finishedQueries.length > 0) {
          let completions = 0;
          let cancellations = 0;
          let failures = 0;
          const finishedRows: LiveQueryRow[] = finishedQueries.map((fq: any) => {
            const wlmDisplay =
              typeof fq.wlm_group_id === 'string' && fq.wlm_group_id.trim() !== ''
                ? (idToName[fq.wlm_group_id] ?? fq.wlm_group_id)
                : 'N/A';
            const status = fq.status || (fq.failed ? 'Failed' : 'Completed');
            const lowerStatus = status.toLowerCase();
            if (lowerStatus === 'failed') failures++;
            else if (lowerStatus === 'cancelled') cancellations++;
            else completions++;
            return {
              ...fq,
              id: fq.id,
              timestamp: fq.timestamp,
              node_id: fq.node_id || '-',
              description: '',
              is_cancelled: fq.failed || false,
              measurements: fq.measurements || {
                latency: { number: 0 },
                cpu: { number: 0 },
                memory: { number: 0 },
              },
              index: fq.indices?.join(', ') || '-',
              search_type: fq.search_type || '-',
              coordinator_node: fq.node_id || '-',
              node_label: fq.node_id || '-',
              wlm_group: wlmDisplay,
              _finished: true,
              _topNId: fq.top_n_id,
              _status: status,
            };
          });
          setFinishedQueryStats({
            total_completions: completions,
            total_cancellations: cancellations + parsed.filter((p) => p.is_cancelled).length,
            total_failures: failures,
          });
          const allRows = [...parsed, ...finishedRows];
          setQuery({ ...retrieved, response: { live_queries: allRows } });
        } else {
          setFinishedQueryStats({
            total_completions: 0,
            total_cancellations: parsed.filter((p) => p.is_cancelled).length,
            total_failures: 0,
          });
        }

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
    [core, dataSource?.id, wlmGroupId, wlmGroupOptions, showFinishedQueries, taskDetailSupported]
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
      if (queryInsightWlmNavigationSupported) {
        try {
          await withTimeout(fetchActiveWlmGroups(), refreshInterval - 500);
        } catch (e) {
          console.warn('[LiveQueries] fetchActiveWlmGroups timed out or failed', e);
        }
      }
      try {
        await withTimeout(fetchLiveQueries(), refreshInterval - 500);
      } catch (e) {
        console.warn('[LiveQueries] fetchLiveQueries timed out or failed', e);
      }
    } finally {
      isFetching.current = false;
    }
  }, [refreshInterval, fetchActiveWlmGroups, fetchLiveQueries, queryInsightWlmNavigationSupported]);

  useEffect(() => {
    void fetchLiveQueriesSafe();

    if (!autoRefreshEnabled) return;
    const interval = setInterval(() => {
      void fetchLiveQueriesSafe();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [
    autoRefreshEnabled,
    refreshInterval,
    fetchLiveQueriesSafe,
    queryInsightWlmNavigationSupported,
  ]);

  const [pagination, setPagination] = useState({ pageIndex: 0 });
  const [searchQuery, setSearchQuery] = useState('');

  // --- Field definitions for DynamicSearchBar ---
  const searchFields = useMemo<FieldDef[]>(() => {
    const fields: FieldDef[] = [
      { label: 'Task ID', key: 'id', accessor: (q) => (q as any).id, type: 'string' },
      { label: 'Index', key: 'index', accessor: (q) => (q as any).index, type: 'string' },
      {
        label: 'Search Type',
        key: 'search_type',
        accessor: (q) => (q as any).search_type,
        type: 'string',
      },
      {
        label: 'Coordinator Node',
        key: 'coordinator_node',
        accessor: (q) => (q as any).coordinator_node,
        type: 'string',
      },
      {
        label: 'Latency',
        key: 'latency',
        accessor: (q) => {
          const val = (q as any).measurements?.latency?.number;
          return val != null ? val / 1e9 : undefined;
        },
        type: 'number',
        unit: 's',
      },
      {
        label: 'CPU',
        key: 'cpu',
        accessor: (q) => {
          const val = (q as any).measurements?.cpu?.number;
          return val != null ? val / 1e9 : undefined;
        },
        type: 'number',
        unit: 's',
      },
      {
        label: 'Memory',
        key: 'memory',
        accessor: (q) => (q as any).measurements?.memory?.number,
        type: 'number',
        unit: 'B',
      },
      {
        label: 'Status',
        key: 'status',
        accessor: (q) => {
          if ((q as any)._finished) return (q as any)._status || 'Completed';
          if ((q as any).is_cancelled) return 'Cancelled';
          return 'Running';
        },
        type: 'string',
      },
      {
        label: 'WLM Group',
        key: 'wlm_group',
        accessor: (q) => (q as any).wlm_group,
        type: 'string',
      },
    ];
    return fields;
  }, []);

  const fieldMap = useMemo(() => {
    const map = new Map<string, FieldDef>();
    searchFields.forEach((f) => {
      map.set(f.key.toLowerCase(), f);
      map.set(f.label.toLowerCase(), f);
    });
    return map;
  }, [searchFields]);

  // --- Column visibility ---
  const columnDefs = useMemo<ColumnDef[]>(() => {
    const defs: ColumnDef[] = [
      { id: 'timestamp', label: 'Timestamp' },
      { id: 'task_id', label: 'Task ID', pinned: true },
      { id: 'index', label: 'Index' },
      { id: 'coordinator_node', label: 'Coordinator Node' },
      { id: 'time_elapsed', label: 'Time Elapsed' },
      { id: 'cpu_usage', label: 'CPU Usage' },
      { id: 'memory_usage', label: 'Memory Usage' },
      { id: 'search_type', label: 'Search Type' },
      { id: 'status', label: 'Status' },
    ];
    if (queryInsightWlmNavigationSupported) {
      defs.push({ id: 'wlm_group', label: 'WLM Group' });
    }
    defs.push({ id: 'actions', label: 'Actions', pinned: true });
    return defs;
  }, [queryInsightWlmNavigationSupported]);

  const {
    visibleColumnIds,
    isColumnVisible,
    toggleColumn,
    showAll,
    hideAll,
    columns: columnDefsForPopover,
  } = useColumnVisibility({
    storageKey: 'queryInsights_live_visibleColumns',
    columns: columnDefs,
  });

  // Filter live queries based on the dynamic search expression
  const filteredQueries = useMemo(() => {
    if (!searchQuery.trim()) return liveQueries;
    const parsed = parseExpression(searchQuery);
    return liveQueries.filter((q) =>
      evaluateExpression(q as unknown as SearchQueryRecord, parsed, fieldMap)
    );
  }, [liveQueries, searchQuery, fieldMap]);

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds == null) return '-';
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
    selectable: (item: any) => item.is_cancelled !== true && !item._finished,
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

    const queries = query.response.live_queries.filter(
      (q) => !(q as any)._finished && !q.is_cancelled
    );

    if (queries.length === 0) return null;

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
      <EuiFlexGroup alignItems="flexStart" gutterSize="m">
        <EuiFlexItem grow>
          <DynamicSearchBar
            fields={searchFields}
            queries={liveQueries as unknown as SearchQueryRecord[]}
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="e.g. latency >= 1 AND status = Running"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            alignItems="center"
            gutterSize="s"
            responsive={false}
            style={{ minHeight: 40 }}
          >
            <EuiFlexItem grow={false}>
              <ColumnVisibilityPopover
                columns={columnDefsForPopover}
                visibleColumnIds={visibleColumnIds}
                onToggleColumn={toggleColumn}
                onShowAll={showAll}
                onHideAll={hideAll}
              />
            </EuiFlexItem>
            {taskDetailSupported && (
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  label={<span style={{ fontSize: '16px' }}>Show finished queries</span>}
                  checked={showFinishedQueries}
                  onChange={(e) => setShowFinishedQueries(e.target.checked)}
                  data-test-subj="live-queries-show-finished-toggle"
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiSwitch
                label={<span style={{ fontSize: '16px' }}>Auto-refresh</span>}
                checked={autoRefreshEnabled}
                onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                data-test-subj="live-queries-autorefresh-toggle"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSelect
                value={String(refreshInterval)}
                onChange={(e) => setRefreshInterval(parseInt(e.target.value, 10))}
                options={REFRESH_INTERVAL_OPTIONS}
                disabled={!autoRefreshEnabled}
                data-test-subj="live-queries-refresh-interval"
                style={{ minWidth: 140 }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="refresh"
                onClick={async () => {
                  await fetchLiveQueriesSafe();
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

      <EuiPanel>
        <EuiAccordion
          id="live-queries-visualizations"
          buttonContent={
            <EuiTitle size="s">
              <h3>Stats & Visualizations</h3>
            </EuiTitle>
          }
          initialIsOpen={true}
        >
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
                    <EuiIcon type="visGauge" aria-hidden={true} />
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
                      <p>(Avg. across {metrics?.activeQueries ?? 0} active queries)</p>
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
                        <p>
                          ID:{' '}
                          {taskDetailSupported ? (
                            <EuiLink onClick={() => setSelectedTaskId(metrics.longestQueryId)}>
                              {metrics.longestQueryId}
                            </EuiLink>
                          ) : (
                            metrics.longestQueryId
                          )}
                        </p>
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
                      <p>(Sum across {metrics?.activeQueries ?? 0} active queries)</p>
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
                      <p>(Sum across {metrics?.activeQueries ?? 0} active queries)</p>
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
                    <p>Active Queries by Node</p>
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
                    <EuiIcon type="visPie" size="xxl" color="subdued" aria-hidden={true} />
                    <EuiSpacer size="s" />
                    <EuiTitle size="s">
                      <h3>No Visualization Available</h3>
                    </EuiTitle>
                    <EuiText color="subdued" size="s">
                      <p>No active queries to display</p>
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
                    <p>Active Queries by Index</p>
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
                    <EuiIcon type="visPie" size="xxl" color="subdued" aria-hidden={true} />
                    <EuiSpacer size="s" />
                    <EuiTitle size="s">
                      <h3>No Visualization Available</h3>
                    </EuiTitle>
                    <EuiText color="subdued" size="s">
                      <p>No index data to display</p>
                    </EuiText>
                    <EuiSpacer size="xl" />
                  </EuiTextAlign>
                )}
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
          {taskDetailSupported && showFinishedQueries && (
            <EuiFlexGroup>
              {/* Finished Query Stats Panels */}
              <EuiFlexItem>
                <EuiPanel paddingSize="m">
                  <EuiTextAlign textAlign="center">
                    <EuiText size="s">
                      <p>Total completions</p>
                    </EuiText>
                    <EuiTitle size="l">
                      <h2>{finishedQueryStats.total_completions}</h2>
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
                      <h2>{finishedQueryStats.total_cancellations}</h2>
                    </EuiTitle>
                  </EuiTextAlign>
                </EuiPanel>
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiPanel paddingSize="m">
                  <EuiTextAlign textAlign="center">
                    <EuiText size="s">
                      <p>Total failures</p>
                    </EuiText>
                    <EuiTitle size="l">
                      <h2>{finishedQueryStats.total_failures}</h2>
                    </EuiTitle>
                  </EuiTextAlign>
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiAccordion>
      </EuiPanel>

      <EuiSpacer size="m" />
      <EuiPanel paddingSize="m">
        {selectedItems.length > 0 && (
          <>
            <EuiFlexGroup alignItems="center" gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="danger"
                  iconType="trash"
                  onClick={async () => {
                    const httpClient = dataSource?.id
                      ? depsStart.data.dataSources.get(dataSource.id)
                      : core.http;

                    await Promise.allSettled(
                      selectedItems.map((item) =>
                        httpClient.post(API_ENDPOINTS.CANCEL_TASK(item.id)).then(
                          () => ({ status: 'fulfilled', id: item.id }),
                          (err: any) => ({ status: 'rejected', id: item.id, error: err })
                        )
                      )
                    );
                    setSelectedItems([]);
                  }}
                >
                  Cancel {selectedItems.length} {selectedItems.length !== 1 ? 'queries' : 'query'}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
          </>
        )}
        <EuiInMemoryTable
          items={filteredQueries}
          columns={(() => {
            const allColumns = [
              ...(isColumnVisible('timestamp')
                ? [{ name: 'Timestamp', render: (item: any) => convertTime(item.timestamp) }]
                : []),
              ...(isColumnVisible('task_id')
                ? [
                    {
                      field: 'id',
                      name: 'Task ID',
                      render: taskDetailSupported
                        ? (id: string) => (
                            <EuiLink onClick={() => setSelectedTaskId(id)}>{id}</EuiLink>
                          )
                        : undefined,
                    },
                  ]
                : []),
              ...(isColumnVisible('index') ? [{ field: 'index', name: 'Index' }] : []),
              ...(isColumnVisible('coordinator_node')
                ? [{ field: 'coordinator_node', name: 'Coordinator node' }]
                : []),
              ...(isColumnVisible('time_elapsed')
                ? [
                    {
                      name: 'Time elapsed',
                      render: (item: any) => formatTime(item.measurements?.latency?.number / 1e9),
                    },
                  ]
                : []),
              ...(isColumnVisible('cpu_usage')
                ? [
                    {
                      name: 'CPU usage',
                      render: (item: any) => formatTime(item.measurements?.cpu?.number / 1e9),
                    },
                  ]
                : []),
              ...(isColumnVisible('memory_usage')
                ? [
                    {
                      name: 'Memory usage',
                      render: (item: any) => formatMemory(item.measurements?.memory?.number),
                    },
                  ]
                : []),
              ...(isColumnVisible('search_type')
                ? [{ field: 'search_type', name: 'Search type' }]
                : []),
              ...(isColumnVisible('status')
                ? [
                    {
                      name: 'Status',
                      render: (item: any) =>
                        (item as any)._finished ? (
                          <EuiBadge
                            color={
                              item.is_cancelled || (item as any)._status === 'Failed'
                                ? 'danger'
                                : 'success'
                            }
                          >
                            {(item as any)._status || 'Completed'}
                          </EuiBadge>
                        ) : item.is_cancelled === true ? (
                          <EuiBadge color="danger">Cancelled</EuiBadge>
                        ) : (
                          <EuiBadge color="primary">Running</EuiBadge>
                        ),
                    },
                  ]
                : []),
              ...(queryInsightWlmNavigationSupported && isColumnVisible('wlm_group')
                ? [
                    {
                      name: 'WLM Group',
                      render: (item: any) => {
                        if (!item.wlm_group || item.wlm_group === 'N/A') {
                          return 'N/A';
                        }

                        const displayName = wlmIdToNameMap[item.wlm_group] ?? item.wlm_group;

                        if (wlmAvailable) {
                          return (
                            <EuiLink
                              onClick={() => {
                                const dsParam = `&dataSourceId=${dataSource?.id || ''}`;
                                core.application.navigateToApp('workloadManagement', {
                                  path: `#/wlm-details?name=${encodeURIComponent(
                                    displayName
                                  )}${dsParam}`,
                                });
                              }}
                              color="primary"
                            >
                              {displayName} <EuiIcon type="popout" size="s" aria-hidden={true} />
                            </EuiLink>
                          );
                        }

                        // Plugin not available → simple text
                        return <span>{displayName}</span>;
                      },
                    },
                  ]
                : []),
              // Actions column always last
              ...(isColumnVisible('actions')
                ? [
                    {
                      name: 'Actions',
                      actions: [
                        {
                          name: 'Cancel',
                          description: 'Cancel this query',
                          icon: 'trash',
                          color: 'danger',
                          type: 'icon',
                          available: (item: any) =>
                            item.is_cancelled !== true && !(item as any)._finished,
                          onClick: async (item: any) => {
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
                  ]
                : []),
            ];
            return allColumns;
          })()}
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

      {/* Task Detail Flyout */}
      {taskDetailSupported &&
        selectedTaskId &&
        (() => {
          const flyoutQueries = query?.response?.live_queries || [];
          const selectedItem = flyoutQueries.find((q) => q.id === selectedTaskId);
          if (!selectedItem) return null;
          // Build a RichLiveQueryRecord-compatible object from the row
          const richTask = {
            id: selectedItem.id,
            status: (selectedItem as any)._finished
              ? (selectedItem as any)._status || 'completed'
              : selectedItem.is_cancelled
                ? 'cancelled'
                : 'running',
            start_time: selectedItem.timestamp || (selectedItem as any).start_time,
            wlm_group_id: selectedItem.wlm_group_id,
            total_latency_millis: (selectedItem.measurements?.latency?.number || 0) / 1e6,
            total_cpu_nanos: selectedItem.measurements?.cpu?.number || 0,
            total_memory_bytes: selectedItem.measurements?.memory?.number || 0,
            coordinator_task: (selectedItem as any).coordinator_task || null,
            shard_tasks: (selectedItem as any).shard_tasks || [],
            _topNId: (selectedItem as any)._topNId,
            // Direct fields for finished queries
            _indices: (selectedItem as any).indices?.join(', ') || selectedItem.index,
            _searchType: (selectedItem as any).search_type || selectedItem.search_type,
            _nodeId: (selectedItem as any).node_id || selectedItem.coordinator_node,
            _totalShards: (selectedItem as any).total_shards,
            _source: (selectedItem as any).source,
            _taskResourceUsages: (selectedItem as any).task_resource_usages,
          };
          return (
            <TaskDetailFlyout
              task={richTask as any}
              onClose={() => setSelectedTaskId(null)}
              onRefresh={async () => {
                await fetchLiveQueries();
              }}
              onKillQuery={
                richTask.status === 'running'
                  ? async () => {
                      try {
                        await core.http.post(API_ENDPOINTS.CANCEL_TASK(selectedTaskId));
                        await fetchLiveQueries();
                      } catch (e) {
                        console.error('Failed to cancel task:', e);
                      }
                    }
                  : undefined
              }
              onViewTopN={
                richTask._topNId || richTask.status !== 'running'
                  ? (_topNId) => {
                      const id = richTask._topNId || selectedTaskId;
                      const now = new Date().toISOString();
                      const from = new Date(Date.now() - 60 * 60 * 1000).toISOString();
                      history.push(
                        `/query-details?from=${encodeURIComponent(from)}&to=${encodeURIComponent(
                          now
                        )}&id=${encodeURIComponent(id)}&verbose=true`
                      );
                    }
                  : undefined
              }
            />
          );
        })()}
    </div>
  );
};
