/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useContext, useEffect, useState, useCallback } from 'react';
import {
  EuiBasicTableColumn,
  EuiInMemoryTable,
  EuiLink,
  EuiSuperDatePicker,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiSpacer,
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiTextAlign,
  EuiIconTip,
  EuiButtonGroup,
  EuiAccordion,
  EuiToolTip,
  EuiBadge,
} from '@elastic/eui';
import 'react-vis/dist/style.css';
import ReactECharts from 'echarts-for-react';
import { useHistory, useLocation } from 'react-router-dom';
import { AppMountParameters, CoreStart } from 'opensearch-dashboards/public';
import { DataSourceManagementPluginSetup } from 'src/plugins/data_source_management/public';
import { DataSourceContext, QUERY_INSIGHTS } from '../TopNQueries/TopNQueries';
import { SearchQueryRecord } from '../../../types/types';
import {
  CPU_TIME,
  ID,
  INDICES,
  LATENCY,
  MEMORY_USAGE,
  NODE_ID,
  QUERY_COUNT,
  SEARCH_TYPE,
  TIMESTAMP,
  TOTAL_SHARDS,
  TYPE,
  WLM_GROUP,
  CHART_COLORS,
} from '../../../common/constants';
import { calculateMetric, calculateMetricNumber } from '../../../common/utils/MetricUtils';
import { parseDateString } from '../../../common/utils/DateUtils';
import { QueryInsightsDataSourceMenu } from '../../components/DataSourcePicker';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';
import { API_ENDPOINTS } from '../../../common/utils/apiendpoints';
import {
  computePerformanceChartData,
  computeHeatmapChartData,
  HeatmapAggregation,
  HeatmapGroupBy,
} from '../../../common/utils/ChartUtils';
import {
  getVersionOnce,
  isVersion33OrHigher,
  isVersion36OrHigher,
} from '../../utils/version-utils';
import {
  DynamicSearchBar,
  FieldDef,
  parseExpression,
  evaluateExpression,
} from '../../components/DynamicSearchBar';
import { DEFAULT_WORKLOAD_GROUP } from '../../../common/constants';
import { useColumnVisibility, ColumnDef } from '../../hooks/useColumnVisibility';
import { ColumnVisibilityPopover } from '../../components/ColumnVisibilityPopover';

// --- constants for field names and defaults ---
const TIMESTAMP_FIELD = 'timestamp';
const LATENCY_FIELD = 'measurements.latency';
const CPU_FIELD = 'measurements.cpu';
const MEMORY_FIELD = 'measurements.memory';
const INDICES_FIELD = 'indices';
const SEARCH_TYPE_FIELD = 'search_type';
const NODE_ID_FIELD = 'node_id';
const TOTAL_SHARDS_FIELD = 'total_shards';
const WLM_GROUP_FIELD = 'wlm_group_id';
const METRIC_DEFAULT_MSG = 'Not enabled';

/**
 * QueryInsights component
 *
 * Renders a searchable, filterable, and sortable table of query insights data
 * with metrics (latency, CPU, memory), contextual navigation, and datasource picker.
 */
const QueryInsights = ({
  queries,
  loading,
  onTimeChange,
  recentlyUsedRanges,
  currStart,
  currEnd,
  core,
  depsStart,
  params,
  retrieveQueries,
  dataSourceManagement,
}: {
  queries: SearchQueryRecord[];
  loading: boolean;
  onTimeChange: any;
  recentlyUsedRanges: any[];
  currStart: string;
  currEnd: string;
  core: CoreStart;
  params: AppMountParameters;
  dataSourceManagement?: DataSourceManagementPluginSetup;
  retrieveQueries?: any;
  depsStart: QueryInsightsDashboardsPluginStartDependencies;
}) => {
  const history = useHistory();
  const location = useLocation();

  // --- state for pagination and filters ---
  const [pagination, setPagination] = useState({ pageIndex: 0 });
  const [wlmIdToNameMap, setWlmIdToNameMap] = useState<Record<string, string>>({});
  const [wlmAvailable, setWlmAvailable] = useState<boolean>(false);
  const [statusSupported, setStatusSupported] = useState<boolean>(false);
  const [queryInsightWlmNavigationSupported, setQueryInsightWlmNavigationSupported] =
    useState<boolean>(false);
  // Initialize search query based on URL parameters
  const urlParams = new URLSearchParams(location.search);
  const wlmGroupIdFromUrl = urlParams.get('wlmGroupId');
  const [searchQuery, setSearchQuery] = useState<string>(
    wlmGroupIdFromUrl ? `wlm_group_id = ${wlmGroupIdFromUrl}` : ''
  );
  const [chartGroupBy, setChartGroupBy] = useState<'node' | 'index' | 'username' | 'wlm'>('node');
  const [performanceMetric, setPerformanceMetric] = useState<
    'latency' | 'cpu' | 'memory' | 'count'
  >('latency');
  const [performanceChartType, setPerformanceChartType] = useState<'line' | 'heatmap'>('line');

  useEffect(() => {
    if (performanceChartType === 'line' && performanceMetric === 'count') {
      setPerformanceMetric('latency');
    }
  }, [performanceChartType]);
  const [heatmapAggregation, setHeatmapAggregation] = useState<HeatmapAggregation>('max');
  const [heatmapGroupBy, setHeatmapGroupBy] = useState<HeatmapGroupBy>('index');
  const [chartTablePage, setChartTablePage] = useState(0);
  const [chartTableSort, setChartTableSort] = useState<{
    field: string;
    direction: 'asc' | 'desc';
  }>({
    field: 'value',
    direction: 'desc',
  });
  const [visualizationsOpen, setVisualizationsOpen] = useState<boolean>(() => {
    const saved = sessionStorage.getItem('queryInsights_visualizationsOpen');
    return saved !== null ? saved === 'true' : true;
  });
  const [visualizationMode, setVisualizationMode] = useState<'query' | 'group'>('query');
  const tableKey = useMemo(() => {
    const wlmId = new URLSearchParams(location.search).get('wlmGroupId');
    return wlmId ? `table-${wlmId}` : 'table-default';
  }, [location.search]);

  // Clean URL after extracting wlmGroupId
  useEffect(() => {
    const urlSearchParams = new URLSearchParams(location.search);
    if (urlSearchParams.get('wlmGroupId')) {
      history.replace(location.pathname);
    }
  }, [location.search, history, location.pathname]);

  // --- Column visibility definitions ---
  const columnDefs = useMemo<ColumnDef[]>(() => {
    const defs: ColumnDef[] = [
      { id: 'id', label: 'ID', pinned: true },
      { id: 'type', label: 'Type' },
      { id: 'query_source', label: 'Query Source' },
      { id: 'query_count', label: 'Query Count' },
      { id: 'timestamp', label: 'Timestamp' },
      ...(statusSupported ? [{ id: 'status', label: 'Status' }] : []),
      { id: 'latency', label: 'Latency' },
      { id: 'cpu', label: 'CPU Time' },
      { id: 'memory', label: 'Memory Usage' },
      { id: 'indices', label: 'Indices' },
      { id: 'search_type', label: 'Search Type', defaultVisible: false },
      { id: 'node_id', label: 'Node ID', defaultVisible: false },
      ...(queryInsightWlmNavigationSupported ? [{ id: 'wlm_group', label: 'WLM Group' }] : []),
      { id: 'total_shards', label: 'Total Shards', defaultVisible: false },
    ];
    return defs;
  }, [statusSupported, queryInsightWlmNavigationSupported]);

  const {
    visibleColumnIds,
    isColumnVisible,
    toggleColumn,
    showAll,
    hideAll,
    columns: columnVisibilityColumns,
  } = useColumnVisibility({
    storageKey: 'queryInsights_topn_visibleColumns',
    columns: columnDefs,
  });

  const from = parseDateString(currStart);
  const to = parseDateString(currEnd);

  const { dataSource, setDataSource } = useContext(DataSourceContext)!;

  const detectWlm = useCallback(async (): Promise<boolean> => {
    try {
      const httpQuery = dataSource?.id ? { dataSourceId: dataSource.id } : undefined;
      const res = await core.http.get(API_ENDPOINTS.WLM_WORKLOAD_GROUP, { query: httpQuery });
      return res && typeof res === 'object' && Array.isArray(res.workload_groups);
    } catch (e) {
      console.warn('[QueryInsights] Failed to detect WLM availability:', e);
      return false;
    }
  }, [core.http, dataSource?.id]);

  // Fetch workload groups to map IDs to names
  const fetchWorkloadGroups = useCallback(async () => {
    const idToNameMap: Record<string, string> = {};
    try {
      if (wlmAvailable && queryInsightWlmNavigationSupported) {
        const httpQuery = dataSource?.id ? { dataSourceId: dataSource.id } : undefined;
        const groupsRes = await core.http.get(API_ENDPOINTS.WLM_WORKLOAD_GROUP, {
          query: httpQuery,
        });
        const details = ((groupsRes as { body?: { workload_groups?: any[] } }).body
          ?.workload_groups ??
          (groupsRes as { workload_groups?: any[] }).workload_groups ??
          []) as any[];

        for (const g of details) idToNameMap[g._id] = g.name;
      }
    } catch (e) {
      console.warn('[QueryInsights] Failed to fetch workload groups', e);
    }

    setWlmIdToNameMap(idToNameMap);
    return idToNameMap;
  }, [core.http, dataSource?.id, wlmAvailable, queryInsightWlmNavigationSupported]);

  useEffect(() => {
    const checkWlmSupport = async () => {
      try {
        const version = await getVersionOnce(dataSource?.id || '');
        const versionSupported = isVersion33OrHigher(version);
        setQueryInsightWlmNavigationSupported(versionSupported);
        setStatusSupported(isVersion36OrHigher(version));

        if (versionSupported) {
          const hasWlm = await detectWlm();
          setWlmAvailable(hasWlm);
        } else {
          setWlmAvailable(false);
        }
      } catch (_e) {
        setQueryInsightWlmNavigationSupported(false);
        setWlmAvailable(false);
      }
    };

    checkWlmSupport();
  }, [detectWlm, dataSource?.id]);

  // Fetch workload groups on mount and data source change
  useEffect(() => {
    fetchWorkloadGroups();
  }, [fetchWorkloadGroups]);

  const commonlyUsedRanges = [
    { label: 'Today', start: 'now/d', end: 'now' },
    { label: 'This week', start: 'now/w', end: 'now' },
    { label: 'This month', start: 'now/M', end: 'now' },
    { label: 'This year', start: 'now/y', end: 'now' },
    { label: 'Yesterday', start: 'now-1d/d', end: 'now/d' },
    { label: 'Last hour', start: 'now-1h', end: 'now' },
  ];

  useEffect(() => {
    core.chrome.setBreadcrumbs([
      {
        text: 'Query insights',
        href: QUERY_INSIGHTS,
        onClick: (e) => {
          e.preventDefault();
          history.push(QUERY_INSIGHTS);
        },
      },
    ]);
  }, [core.chrome, history, location]);

  const convertTime = (unixTime: number) => {
    const date = new Date(unixTime);
    const loc = date.toDateString().split(' ');
    return `${loc[1]} ${loc[2]}, ${loc[3]} @ ${date.toLocaleTimeString('en-US')}`;
  };
  /**
   * Builds the table rows by applying all active UI filters.
   *
   * - Prevents misleading views: when any non-group filter (indices/searchType/node/text) is active
   *   and the user hasn’t explicitly chosen a single group mode, we hide grouped aggregates
   *   (`group_by !== 'NONE'`) to avoid double counting and missing per-index/search-type/node metadata.
   */

  // --- Expression-based filtering ---
  const searchFields = useMemo<FieldDef[]>(() => {
    const fields: FieldDef[] = [
      { label: 'Id', key: 'id', accessor: (q) => q.id, type: 'string' },
      {
        label: 'Type',
        key: 'type',
        accessor: (q) => (q.group_by === 'SIMILARITY' ? 'group' : 'query'),
        type: 'string',
      },
      {
        label: 'Latency',
        key: 'latency',
        accessor: (q) => q.measurements?.latency?.number,
        type: 'number',
        unit: 'ms',
      },
      {
        label: 'CPU Time',
        key: 'cpu',
        accessor: (q) =>
          q.measurements?.cpu?.number ? q.measurements.cpu.number / 1000000 : undefined,
        type: 'number',
        unit: 'ms',
      },
      {
        label: 'Memory',
        key: 'memory',
        accessor: (q) => q.measurements?.memory?.number,
        type: 'number',
        unit: 'B',
      },
      {
        label: 'Query Count',
        key: 'query_count',
        accessor: (q) =>
          q.measurements?.latency?.count ||
          q.measurements?.cpu?.count ||
          q.measurements?.memory?.count ||
          1,
        type: 'number',
      },
      { label: 'Timestamp', key: 'timestamp', accessor: (q) => q.timestamp, type: 'number' },
      { label: 'Indices', key: 'indices', accessor: (q) => q.indices, type: 'array' },
      { label: 'Search Type', key: 'search_type', accessor: (q) => q.search_type, type: 'string' },
      { label: 'Node ID', key: 'node_id', accessor: (q) => q.node_id, type: 'string' },
      {
        label: 'Total Shards',
        key: 'total_shards',
        accessor: (q) => q.total_shards,
        type: 'number',
      },
      {
        label: 'Status',
        key: 'status',
        accessor: (q) => (q.failed ? 'failed' : 'completed'),
        type: 'string',
      },
    ];
    if (queryInsightWlmNavigationSupported) {
      fields.push({
        label: 'WLM Group',
        key: 'wlm_group_id',
        accessor: (q) => q.wlm_group_id,
        type: 'string',
      });
    }
    return fields;
  }, [queryInsightWlmNavigationSupported]);

  const fieldMap = useMemo(() => {
    const map = new Map<string, FieldDef>();
    searchFields.forEach((f) => {
      map.set(f.key.toLowerCase(), f);
      map.set(f.label.toLowerCase(), f);
    });
    return map;
  }, [searchFields]);

  const parsedExpression = useMemo(() => parseExpression(searchQuery), [searchQuery]);

  // Derive selectedGroupBy from expression for effectiveView/column logic
  const selectedGroupBy = useMemo(() => {
    const typeConds = parsedExpression.conditions.filter(
      (c) => c.field.toLowerCase() === 'type' || c.field.toLowerCase() === 'group_by'
    );
    if (typeConds.length === 0) return [] as string[];
    return typeConds.map((c) => {
      const val = c.value.toLowerCase();
      if (val === 'group' || val === 'similarity') return 'SIMILARITY';
      return 'NONE';
    });
  }, [parsedExpression]);

  const items = useMemo(() => {
    return queries.filter((q: SearchQueryRecord) =>
      evaluateExpression(q, parsedExpression, fieldMap)
    );
  }, [queries, parsedExpression, fieldMap]);

  // For metrics/visualizations, always filter out grouped queries
  const itemsForMetrics = useMemo(() => {
    return items.filter((q: SearchQueryRecord) => q.group_by === 'NONE');
  }, [items]);

  // forView is used for effectiveView calculation (table column headers)
  // Use items to determine if table has mixed content (queries + groups)
  const forView = items.length ? items : queries;

  /**
   * Decide effective view:
   * - "query" if only queries
   * - "group" if only groups
   * - "mixed" if both
   */
  const effectiveView = useMemo<'query' | 'group' | 'mixed'>(() => {
    if (selectedGroupBy.length === 1) {
      return selectedGroupBy[0] === 'SIMILARITY' ? 'group' : 'query';
    }
    const hasQuery = forView.some((q: SearchQueryRecord) => q.group_by === 'NONE');
    const hasGroup = forView.some((q: SearchQueryRecord) => q.group_by === 'SIMILARITY');
    if (hasQuery && hasGroup) return 'mixed';
    return hasGroup ? 'group' : 'query';
  }, [selectedGroupBy, forView]);

  // --- Column headers change depending on effective view ---
  const latencyHeader = useMemo(() => {
    return effectiveView === 'mixed'
      ? `Avg ${LATENCY} / ${LATENCY}`
      : effectiveView === 'group'
        ? `Average ${LATENCY}`
        : `${LATENCY}`;
  }, [effectiveView]);

  const cpuHeader = useMemo(() => {
    return effectiveView === 'mixed'
      ? `Avg ${CPU_TIME} / ${CPU_TIME}`
      : effectiveView === 'group'
        ? `Average ${CPU_TIME}`
        : `${CPU_TIME}`;
  }, [effectiveView]);

  const memHeader = useMemo(() => {
    return effectiveView === 'mixed'
      ? `Avg ${MEMORY_USAGE} / ${MEMORY_USAGE}`
      : effectiveView === 'group'
        ? `Average ${MEMORY_USAGE}`
        : MEMORY_USAGE;
  }, [effectiveView]);

  const baseColumns: Array<EuiBasicTableColumn<SearchQueryRecord> & { id?: string }> = [
    {
      id: 'id',
      name: ID,
      render: (query: SearchQueryRecord) => (
        <span>
          <EuiLink
            onClick={() => {
              const route =
                query.group_by === 'SIMILARITY'
                  ? `/query-group-details?from=${from}&to=${to}&id=${query.id}&verbose=${true}`
                  : `/query-details?from=${from}&to=${to}&id=${query.id}&verbose=${true}`;
              history.push(route);
            }}
          >
            {query.id || '-'}
          </EuiLink>
        </span>
      ),
      sortable: (q: SearchQueryRecord) => q.id || '-',
      truncateText: true,
    },
    {
      id: 'type',
      name: TYPE,
      render: (query: SearchQueryRecord) => (
        <span>
          <EuiLink
            onClick={() => {
              const route =
                query.group_by === 'SIMILARITY'
                  ? `/query-group-details?from=${from}&to=${to}&id=${query.id}&verbose=${true}`
                  : `/query-details?from=${from}&to=${to}&id=${query.id}&verbose=${true}`;
              history.push(route);
            }}
          >
            {query.group_by === 'SIMILARITY' ? 'group' : 'query'}
          </EuiLink>
        </span>
      ),
      sortable: (q: SearchQueryRecord) => q.group_by || 'query',
      truncateText: true,
    },
  ];

  const querySourceColumn: Array<EuiBasicTableColumn<SearchQueryRecord> & { id?: string }> = [
    {
      id: 'query_source',
      name: 'Query Source',
      render: (q: SearchQueryRecord) => {
        const source = q.labels?.['x-query-source'];
        if (source === 'sql') return <EuiBadge color="#0079A5">SQL</EuiBadge>;
        if (source === 'ppl') return <EuiBadge color="#7B61FF">PPL</EuiBadge>;
        return <EuiBadge color="hollow">DSL</EuiBadge>;
      },
      sortable: (q: SearchQueryRecord) => q.labels?.['x-query-source'] || 'dsl',
      truncateText: true,
    },
  ];

  const querycountColumn: Array<EuiBasicTableColumn<SearchQueryRecord> & { id?: string }> = [
    {
      id: 'query_count',
      name: QUERY_COUNT,
      render: (q: SearchQueryRecord) =>
        `${
          q.measurements?.latency?.count ||
          q.measurements?.cpu?.count ||
          q.measurements?.memory?.count ||
          1
        }`,
      sortable: (q: SearchQueryRecord) =>
        q.measurements?.latency?.count ||
        q.measurements?.cpu?.count ||
        q.measurements?.memory?.count ||
        1,
      truncateText: true,
    },
  ];

  const timestampColumn: Array<EuiBasicTableColumn<SearchQueryRecord> & { id?: string }> = [
    {
      id: 'timestamp',
      name: TIMESTAMP,
      render: (q: SearchQueryRecord) => {
        const isQuery = q.group_by === 'NONE';
        if (!isQuery) return <EuiBadge color="hollow">Aggregated</EuiBadge>;
        const onClickHandler = () => {
          const route = `/query-details?from=${from}&to=${to}&id=${q.id}&verbose=true`;
          history.push(route);
        };
        return (
          <span>
            <EuiLink onClick={onClickHandler}>{convertTime(q.timestamp)}</EuiLink>
          </span>
        );
      },
      sortable: (q: SearchQueryRecord) => q.timestamp,
      truncateText: true,
    },
  ];

  const statusColumn: Array<EuiBasicTableColumn<SearchQueryRecord> & { id?: string }> = [
    {
      id: 'status',
      name: 'Status',
      render: (q: SearchQueryRecord) => {
        if (q.group_by === 'SIMILARITY') return <EuiBadge color="hollow">Aggregated</EuiBadge>;
        return q.failed ? (
          <EuiBadge color="danger">Failed</EuiBadge>
        ) : (
          <EuiBadge color="success">Completed</EuiBadge>
        );
      },
      sortable: (q: SearchQueryRecord) => (q.group_by === 'SIMILARITY' ? -1 : q.failed ? 0 : 1),
      truncateText: true,
    },
  ];

  // columns shown only for query-type records
  const QueryTypeSpecificColumns: Array<EuiBasicTableColumn<SearchQueryRecord> & { id?: string }> =
    [
      {
        id: 'indices',
        field: INDICES_FIELD as keyof SearchQueryRecord,
        name: INDICES,
        render: (indices: string[] = [], q: SearchQueryRecord) => (
          <span>
            {q.group_by === 'SIMILARITY' ? (
              <EuiBadge color="hollow">Aggregated</EuiBadge>
            ) : (
              Array.from(new Set(indices)).join(', ')
            )}
          </span>
        ),
        sortable: true,
        truncateText: true,
      },
      {
        id: 'search_type',
        field: SEARCH_TYPE_FIELD as keyof SearchQueryRecord,
        name: SEARCH_TYPE,
        render: (st: string, q: SearchQueryRecord) => (
          <span>
            {q.group_by === 'SIMILARITY' ? (
              <EuiBadge color="hollow">Aggregated</EuiBadge>
            ) : (
              (st || '').replaceAll('_', ' ')
            )}
          </span>
        ),
        sortable: true,
        truncateText: true,
      },
      {
        id: 'node_id',
        field: NODE_ID_FIELD as keyof SearchQueryRecord,
        name: NODE_ID,
        render: (nid: string, q: SearchQueryRecord) => (
          <span>
            {q.group_by === 'SIMILARITY' ? <EuiBadge color="hollow">Aggregated</EuiBadge> : nid}
          </span>
        ),
        sortable: true,
        truncateText: true,
      },
      ...(queryInsightWlmNavigationSupported
        ? [
            {
              id: 'wlm_group',
              field: WLM_GROUP_FIELD as keyof SearchQueryRecord,
              name: WLM_GROUP,
              render: (wlmGroupId: string, q: SearchQueryRecord) => {
                if (q.group_by === 'SIMILARITY')
                  return <EuiBadge color="hollow">Aggregated</EuiBadge>;
                const groupId = wlmGroupId || DEFAULT_WORKLOAD_GROUP;
                const displayName =
                  groupId === DEFAULT_WORKLOAD_GROUP
                    ? DEFAULT_WORKLOAD_GROUP
                    : wlmAvailable
                      ? wlmIdToNameMap[groupId] || '-'
                      : '-';

                if (wlmAvailable && displayName !== '-') {
                  return (
                    <EuiLink
                      onClick={() => {
                        const dsParam = dataSource?.id
                          ? `&dataSource=${encodeURIComponent(JSON.stringify(dataSource))}`
                          : '';
                        core.application.navigateToApp('workloadManagement', {
                          path: `#/wlm-details?name=${encodeURIComponent(displayName)}${dsParam}`,
                        });
                      }}
                      color="primary"
                    >
                      {displayName} <EuiIcon type="popout" size="s" aria-hidden={true} />
                    </EuiLink>
                  );
                }

                return <span>{displayName}</span>;
              },
              sortable: true,
              truncateText: true,
            },
          ]
        : []),
      {
        id: 'total_shards',
        field: TOTAL_SHARDS_FIELD as keyof SearchQueryRecord,
        name: TOTAL_SHARDS,
        render: (ts: number, q: SearchQueryRecord) => (
          <span>
            {q.group_by === 'SIMILARITY' ? <EuiBadge color="hollow">Aggregated</EuiBadge> : ts}
          </span>
        ),
        sortable: true,
        truncateText: true,
      },
    ];

  // metric columns (latency, cpu, memory)
  const metricColumns: Array<EuiBasicTableColumn<SearchQueryRecord> & { id?: string }> = useMemo(
    () => [
      {
        id: 'latency',
        field: LATENCY_FIELD as keyof SearchQueryRecord,
        name: latencyHeader,
        render: (_: any, q: SearchQueryRecord) =>
          calculateMetric(
            q.measurements?.latency?.number,
            q.measurements?.latency?.count,
            'ms',
            1,
            METRIC_DEFAULT_MSG
          ),
        sortable: (q: SearchQueryRecord) =>
          calculateMetricNumber(q.measurements?.latency?.number, q.measurements?.latency?.count),
        truncateText: true,
      },
      {
        id: 'cpu',
        field: CPU_FIELD as keyof SearchQueryRecord,
        name: cpuHeader,
        render: (_: any, q: SearchQueryRecord) =>
          calculateMetric(
            q.measurements?.cpu?.number,
            q.measurements?.cpu?.count,
            'ms',
            1000000, // convert ns → ms
            METRIC_DEFAULT_MSG
          ),
        sortable: (q: SearchQueryRecord) =>
          calculateMetricNumber(q.measurements?.cpu?.number, q.measurements?.cpu?.count),
        truncateText: true,
      },
      {
        id: 'memory',
        field: MEMORY_FIELD as keyof SearchQueryRecord,
        name: memHeader,
        render: (_: any, q: SearchQueryRecord) =>
          calculateMetric(
            q.measurements?.memory?.number,
            q.measurements?.memory?.count,
            'B',
            1,
            METRIC_DEFAULT_MSG
          ),
        sortable: (q: SearchQueryRecord) =>
          calculateMetricNumber(q.measurements?.memory?.number, q.measurements?.memory?.count),
        truncateText: true,
      },
    ],
    [latencyHeader, cpuHeader, memHeader]
  );

  const defaultColumns = useMemo(
    () => [
      ...baseColumns,
      ...querySourceColumn,
      ...querycountColumn,
      ...timestampColumn,
      ...(statusSupported ? statusColumn : []),
      ...metricColumns,
      ...QueryTypeSpecificColumns,
    ],
    [
      baseColumns,
      querySourceColumn,
      querycountColumn,
      timestampColumn,
      statusSupported,
      statusColumn,
      metricColumns,
      QueryTypeSpecificColumns,
    ]
  );
  const groupTypeColumns = useMemo(
    () => [...baseColumns, ...querySourceColumn, ...querycountColumn, ...metricColumns],
    [baseColumns, querySourceColumn, querycountColumn, metricColumns]
  );

  const queryTypeColumns = useMemo(
    () => [
      ...baseColumns,
      ...querySourceColumn,
      ...timestampColumn,
      ...(statusSupported ? statusColumn : []),
      ...metricColumns,
      ...QueryTypeSpecificColumns,
    ],
    [
      baseColumns,
      querySourceColumn,
      timestampColumn,
      statusSupported,
      statusColumn,
      metricColumns,
      QueryTypeSpecificColumns,
    ]
  );

  /**
   * Decide which column set to show for the current view, based on selected
   * filters and the presence of query/group rows. This is the superset of
   * columns before any visibility preferences are applied.
   */
  const viewColumns = useMemo(() => {
    // Check if any non-type filter conditions exist in the expression
    const hasNonTypeFilter = parsedExpression.conditions.some(
      (c) => c.field.toLowerCase() !== 'type' && c.field.toLowerCase() !== 'group_by'
    );
    const hasFreeText = !!parsedExpression.freeText;
    const nonGroupActive = hasNonTypeFilter || hasFreeText;

    if (selectedGroupBy.length === 1) {
      return selectedGroupBy[0] === 'SIMILARITY' ? groupTypeColumns : queryTypeColumns;
    }
    if (nonGroupActive && (selectedGroupBy.length === 0 || selectedGroupBy.length === 2)) {
      return queryTypeColumns;
    }

    const hasAnyQuery = items.some((q: SearchQueryRecord) => q.group_by === 'NONE');
    const hasAnyGroup = items.some((q: SearchQueryRecord) => q.group_by === 'SIMILARITY');

    if (items.length === 0) return defaultColumns;
    if (hasAnyQuery && hasAnyGroup) return defaultColumns;
    if (hasAnyGroup) return groupTypeColumns;
    return queryTypeColumns;
  }, [
    items,
    selectedGroupBy,
    parsedExpression,
    defaultColumns,
    groupTypeColumns,
    queryTypeColumns,
  ]);

  /**
   * Filter the view's columns through visibility preferences (preserving the
   * original definition order) and strip the internal `id` marker so it does
   * not leak onto the rendered table cells as an invalid duplicate DOM id.
   */
  const columnsToShow = useMemo(() => {
    return viewColumns
      .filter((col) => (col.id ? isColumnVisible(col.id) : true))
      .map((col) => {
        const { id: _id, ...rest } = col;
        return rest;
      });
  }, [viewColumns, isColumnVisible]);

  // Column ids available in the current view (the popover only shows toggles for these)
  const activeColumnIdsForPopover = useMemo(() => {
    return new Set(viewColumns.map((col) => col.id).filter(Boolean));
  }, [viewColumns]);

  const onSearchChange = (text: string) => {
    setSearchQuery(text);
  };

  const onRefresh = async ({ start, end }: { start: string; end: string }) => {
    onTimeChange({ start, end });
    retrieveQueries(start, end);
  };

  const percentileMetrics = useMemo(() => {
    const latencies: number[] = [];
    const cpus: number[] = [];
    const memories: number[] = [];

    itemsForMetrics.forEach((q) => {
      const lat = q.measurements?.latency?.number;
      const cpu = q.measurements?.cpu?.number;
      const mem = q.measurements?.memory?.number;
      if (lat != null) latencies.push(lat);
      if (cpu != null) cpus.push(calculateMetricNumber(cpu, 1, 1000000));
      if (mem != null) memories.push(calculateMetricNumber(mem, 1, 1024 * 1024));
    });

    const percentile = (arr: number[], p: number, decimals: number = 0) => {
      if (arr.length === 0) return 'N/A';
      const sorted = [...arr].sort((a, b) => a - b);
      const idx = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[idx].toFixed(decimals);
    };

    return {
      p90Latency: percentile(latencies, 90),
      p90Cpu: percentile(cpus, 90, 1),
      p90Memory: percentile(memories, 90, 1),
      p99Latency: percentile(latencies, 99),
      p99Cpu: percentile(cpus, 99, 1),
      p99Memory: percentile(memories, 99, 1),
    };
  }, [itemsForMetrics]);

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    itemsForMetrics.forEach((q) => {
      if (chartGroupBy === 'index') {
        (q.indices || []).forEach((idx) => {
          counts[idx] = (counts[idx] || 0) + 1;
        });
      } else {
        let key: string;
        if (chartGroupBy === 'node') {
          key = q.node_id || 'Unknown';
        } else if (chartGroupBy === 'username') {
          key = q.username || 'Unknown';
        } else {
          const wlmId = q.wlm_group_id || 'Unknown';
          key = wlmIdToNameMap[wlmId] || wlmId;
        }
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    // Sort by value desc, then name asc for consistent ordering
    const sorted = Object.entries(counts).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });
    const getColor = (index: number) => {
      if (index < CHART_COLORS.length) return CHART_COLORS[index];
      // Generate additional colors using golden angle for overflow
      const hue = ((index - CHART_COLORS.length) * 137.508 + 60) % 360;
      return `hsl(${hue}, 65%, 55%)`;
    };
    return sorted.map(([name, value], idx) => ({
      name,
      value,
      percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0.0',
      angle: value,
      label: name,
      color: getColor(idx),
    }));
  }, [itemsForMetrics, chartGroupBy, wlmIdToNameMap]);

  const pieChartData = useMemo(() => {
    if (chartData.length <= 25) return chartData;
    const top25 = chartData.slice(0, 25);
    const others = chartData.slice(25);
    const othersTotal = others.reduce((sum, item) => sum + item.value, 0);
    const total = chartData.reduce((sum, item) => sum + item.value, 0);
    return [
      ...top25,
      {
        name: 'Others',
        value: othersTotal,
        percentage: total > 0 ? ((othersTotal / total) * 100).toFixed(1) : '0.0',
        angle: othersTotal,
        label: 'Others',
        color: '#999999',
      },
    ];
  }, [chartData]);

  const performanceChartData = useMemo(
    () => computePerformanceChartData(itemsForMetrics, from, to, performanceMetric),
    [itemsForMetrics, performanceMetric, from, to]
  );

  const heatmapChartData = useMemo(
    () =>
      computeHeatmapChartData(
        itemsForMetrics,
        from,
        to,
        performanceMetric,
        heatmapAggregation,
        heatmapGroupBy
      ),
    [itemsForMetrics, performanceMetric, heatmapAggregation, heatmapGroupBy, from, to]
  );

  const heatmapChartOptions = useMemo(() => {
    const { min, max } = heatmapChartData;
    // Ensure min/max are different for proper color scaling
    const visualMin = min;
    const visualMax = max === min ? min + 1 : max;

    const getUnit = () => {
      if (performanceMetric === 'count') return '';
      if (performanceMetric === 'memory') return 'MB';
      return 'ms';
    };

    const unitText = getUnit();
    const textLabels = unitText ? [`High (${unitText})`, `Low (${unitText})`] : ['High', 'Low'];

    return {
      tooltip: {
        position: 'top',
        formatter: (tooltipParams: any) => {
          const [timeIdx, indexIdx, , formatted] = tooltipParams.data;
          const indexName = heatmapChartData.indices[indexIdx];
          const startTime = heatmapChartData.times[timeIdx];
          const endTime = heatmapChartData.times[timeIdx + 1] || 'now';
          return `${indexName}<br/>${startTime} - ${endTime}<br/>${formatted}`;
        },
      },
      grid: { left: 100, right: 60, top: 30, bottom: 130 },
      xAxis: {
        type: 'category',
        data: heatmapChartData.times,
        splitArea: { show: true },
        axisLabel: { rotate: 45, fontSize: 10 },
      },
      yAxis: {
        type: 'category',
        data: heatmapChartData.indices,
        splitArea: { show: true },
      },
      dataZoom:
        heatmapChartData.indices.length > 10
          ? [
              {
                type: 'slider',
                yAxisIndex: 0,
                right: 10,
                start: 0,
                end: Math.min(100, (10 / heatmapChartData.indices.length) * 100),
                filterMode: 'none',
              },
            ]
          : [],
      visualMap: {
        min: visualMin,
        max: visualMax,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        inRange: { color: ['#d0e1f9', '#4a90d9', '#1a3a6e'] },
        seriesIndex: 0,
        dimension: 2,
        text: textLabels,
        textStyle: { fontSize: 11 },
      },
      series: [
        {
          type: 'heatmap',
          data: heatmapChartData.data.filter((d) => d[2] !== null),
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 1,
          },
          label: {
            show: true,
            formatter: (labelParams: any) => labelParams.data[3],
            fontSize: 9,
            color: '#000',
          },
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' },
          },
        },
      ],
    };
  }, [heatmapChartData, performanceMetric]);

  const performanceChartOptions = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        formatter: (tooltipParams: any) => {
          const dataIndex = tooltipParams[0].dataIndex;
          const timeRange = performanceChartData.bucketRanges[dataIndex];
          let result = `<b>${timeRange}</b><br/>`;
          const hasData = tooltipParams.some((param: any) => param.value !== null);
          if (!hasData) {
            result += 'No queries in this time bucket';
          } else {
            tooltipParams.forEach((param: any) => {
              if (param.value !== null) {
                result += `${param.marker} ${param.seriesName}: ${param.value}<br/>`;
              }
            });
          }
          return result;
        },
      },
      legend: { data: ['Max', 'Average', 'Min'], bottom: 0 },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: { type: 'category', data: performanceChartData.times, name: 'Time' },
      yAxis: {
        type: 'value',
        name:
          performanceMetric === 'latency'
            ? 'Latency (ms)'
            : performanceMetric === 'cpu'
              ? 'CPU Time (ms)'
              : 'Memory (MB)',
      },
      series: [
        {
          name: 'Max',
          type: 'line',
          data: performanceChartData.max,
          color: '#ff6b6b',
          connectNulls: true,
        },
        {
          name: 'Average',
          type: 'line',
          data: performanceChartData.avg,
          color: '#4dabf7',
          connectNulls: true,
        },
        {
          name: 'Min',
          type: 'line',
          data: performanceChartData.min,
          color: '#51cf66',
          connectNulls: true,
        },
      ],
    }),
    [performanceChartData, performanceMetric]
  );

  return (
    <>
      <QueryInsightsDataSourceMenu
        coreStart={core}
        depsStart={depsStart}
        params={params}
        dataSourceManagement={dataSourceManagement}
        setDataSource={setDataSource}
        selectedDataSource={dataSource}
        onManageDataSource={() => {}}
        onSelectedDataSource={() => {
          retrieveQueries(currStart, currEnd);
        }}
        dataSourcePickerReadOnly={false}
      />

      {!loading && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup alignItems="flexStart" gutterSize="m">
            <EuiFlexItem grow>
              <DynamicSearchBar
                fields={searchFields}
                queries={queries}
                value={searchQuery}
                onChange={onSearchChange}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ColumnVisibilityPopover
                columns={columnVisibilityColumns}
                visibleColumnIds={visibleColumnIds}
                onToggleColumn={toggleColumn}
                onShowAll={showAll}
                onHideAll={hideAll}
                unavailableColumnIds={
                  new Set(
                    columnVisibilityColumns
                      .filter((col) => !activeColumnIdsForPopover.has(col.id))
                      .map((col) => col.id)
                  )
                }
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSuperDatePicker
                start={currStart}
                end={currEnd}
                onTimeChange={onTimeChange}
                recentlyUsedRanges={recentlyUsedRanges}
                commonlyUsedRanges={commonlyUsedRanges}
                onRefresh={onRefresh}
                updateButtonProps={{ fill: false }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiPanel>
            <EuiAccordion
              id="visualizations-accordion"
              buttonContent={
                <EuiTitle size="s">
                  <h3>Stats & Visualizations</h3>
                </EuiTitle>
              }
              extraAction={
                visualizationsOpen ? (
                  <EuiButtonGroup
                    legend="Visualization mode"
                    options={[
                      { id: 'query', label: 'Query' },
                      { id: 'group', label: 'Group' },
                    ]}
                    idSelected={visualizationMode}
                    onChange={(id) => setVisualizationMode(id as 'query' | 'group')}
                    color="primary"
                    data-test-subj="visualizationModeToggle"
                  />
                ) : null
              }
              forceState={visualizationsOpen ? 'open' : 'closed'}
              onToggle={(isOpen) => {
                setVisualizationsOpen(isOpen);
                sessionStorage.setItem('queryInsights_visualizationsOpen', String(isOpen));
              }}
              paddingSize="none"
            >
              <EuiSpacer size="m" />
              {visualizationMode === 'query' ? (
                itemsForMetrics.length === 0 ? (
                  <EuiPanel color="subdued" paddingSize="xl">
                    <EuiSpacer size="xxl" />
                    <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="visLine" size="xxl" color="subdued" aria-hidden={true} />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiTitle size="s">
                          <h3>No Data Available</h3>
                        </EuiTitle>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText color="subdued" size="s">
                          <p>No queries found</p>
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiSpacer size="xxl" />
                  </EuiPanel>
                ) : (
                  <>
                    <EuiFlexGroup>
                      <EuiFlexItem>
                        <EuiPanel paddingSize="m">
                          <EuiText size="s">
                            <p>P90 LATENCY</p>
                          </EuiText>
                          <EuiTitle size="l">
                            <h2>
                              <b>
                                {percentileMetrics.p90Latency === 'N/A'
                                  ? 'N/A'
                                  : `${percentileMetrics.p90Latency} ms`}
                              </b>
                            </h2>
                          </EuiTitle>
                        </EuiPanel>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiPanel paddingSize="m">
                          <EuiText size="s">
                            <p>P90 CPU TIME</p>
                          </EuiText>
                          <EuiTitle size="l">
                            <h2>
                              <b>
                                {percentileMetrics.p90Cpu === 'N/A'
                                  ? 'N/A'
                                  : `${percentileMetrics.p90Cpu} ms`}
                              </b>
                            </h2>
                          </EuiTitle>
                        </EuiPanel>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiPanel paddingSize="m">
                          <EuiText size="s">
                            <p>P90 MEMORY</p>
                          </EuiText>
                          <EuiTitle size="l">
                            <h2>
                              <b>
                                {percentileMetrics.p90Memory === 'N/A'
                                  ? 'N/A'
                                  : `${percentileMetrics.p90Memory} MB`}
                              </b>
                            </h2>
                          </EuiTitle>
                        </EuiPanel>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiPanel paddingSize="m">
                          <EuiText size="s">
                            <p>P99 LATENCY</p>
                          </EuiText>
                          <EuiTitle size="l">
                            <h2>
                              <b>
                                {percentileMetrics.p99Latency === 'N/A'
                                  ? 'N/A'
                                  : `${percentileMetrics.p99Latency} ms`}
                              </b>
                            </h2>
                          </EuiTitle>
                        </EuiPanel>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiPanel paddingSize="m">
                          <EuiText size="s">
                            <p>P99 CPU TIME</p>
                          </EuiText>
                          <EuiTitle size="l">
                            <h2>
                              <b>
                                {percentileMetrics.p99Cpu === 'N/A'
                                  ? 'N/A'
                                  : `${percentileMetrics.p99Cpu} ms`}
                              </b>
                            </h2>
                          </EuiTitle>
                        </EuiPanel>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiPanel paddingSize="m">
                          <EuiText size="s">
                            <p>P99 MEMORY</p>
                          </EuiText>
                          <EuiTitle size="l">
                            <h2>
                              <b>
                                {percentileMetrics.p99Memory === 'N/A'
                                  ? 'N/A'
                                  : `${percentileMetrics.p99Memory} MB`}
                              </b>
                            </h2>
                          </EuiTitle>
                        </EuiPanel>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiSpacer size="m" />
                    <EuiPanel>
                      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                        <EuiFlexItem grow={false}>
                          <EuiTitle size="xs">
                            <h3>
                              {chartGroupBy === 'node'
                                ? 'Queries by Node'
                                : chartGroupBy === 'index'
                                  ? 'Queries by Index'
                                  : chartGroupBy === 'username'
                                    ? 'Queries by Username'
                                    : 'Queries by WLM Group'}
                            </h3>
                          </EuiTitle>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiSelect
                            options={[
                              { value: 'node', text: 'Node' },
                              { value: 'index', text: 'Index' },
                              { value: 'username', text: 'Username' },
                              ...(queryInsightWlmNavigationSupported
                                ? [{ value: 'wlm', text: 'WLM Group' }]
                                : []),
                            ]}
                            value={chartGroupBy}
                            onChange={(e) => {
                              setChartGroupBy(
                                e.target.value as 'node' | 'index' | 'username' | 'wlm'
                              );
                              setChartTablePage(0);
                            }}
                            compressed
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                      <EuiSpacer size="l" />
                      <EuiFlexGroup>
                        <EuiFlexItem grow={false}>
                          <ReactECharts
                            option={{
                              tooltip: {
                                trigger: 'item',
                                formatter: (pieParams: any) => {
                                  if (pieParams.name === 'Others') {
                                    return `Other<br/>Query Count: ${pieParams.value}<br/>Percentage: ${pieParams.percent}%`;
                                  }
                                  const label =
                                    chartGroupBy === 'node'
                                      ? 'Node'
                                      : chartGroupBy === 'index'
                                        ? 'Index'
                                        : chartGroupBy === 'username'
                                          ? 'Username'
                                          : 'WLM Group';
                                  return `${label}: ${pieParams.name}<br/>Query Count: ${pieParams.value}<br/>Percentage: ${pieParams.percent}%`;
                                },
                              },
                              series: [
                                {
                                  type: 'pie',
                                  radius: ['40%', '80%'],
                                  data: pieChartData.map((item) => ({
                                    name: item.name,
                                    value: item.value,
                                    itemStyle: { color: item.color },
                                  })),
                                  label: { show: false },
                                  sort: 'none',
                                  clockwise: true,
                                  startAngle: 90,
                                  emphasis: {
                                    itemStyle: {
                                      shadowBlur: 10,
                                      shadowOffsetX: 0,
                                      shadowColor: 'rgba(0, 0, 0, 0.5)',
                                    },
                                  },
                                },
                              ],
                            }}
                            style={{ height: '40vh', width: '40vh' }}
                            opts={{ renderer: 'svg' }}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiInMemoryTable
                            key={`chart-table-${chartGroupBy}`}
                            items={chartData}
                            columns={[
                              {
                                field: 'name',
                                name:
                                  chartGroupBy === 'node'
                                    ? 'Node'
                                    : chartGroupBy === 'index'
                                      ? 'Index'
                                      : chartGroupBy === 'username'
                                        ? 'Username'
                                        : 'WLM Group',
                                sortable: true,
                                render: (name: string, item: (typeof chartData)[0]) => (
                                  <EuiFlexGroup
                                    gutterSize="s"
                                    alignItems="center"
                                    responsive={false}
                                  >
                                    <EuiFlexItem grow={false}>
                                      <EuiIcon type="dot" color={item.color} aria-hidden={true} />
                                    </EuiFlexItem>
                                    <EuiFlexItem>{name}</EuiFlexItem>
                                  </EuiFlexGroup>
                                ),
                              },
                              {
                                field: 'value',
                                name: 'Query Count',
                                align: 'right',
                                sortable: true,
                              },
                              {
                                field: 'percentage',
                                name: 'Percentage',
                                render: (p: string) => `${p}%`,
                                align: 'right',
                                sortable: (item: (typeof chartData)[0]) =>
                                  parseFloat(item.percentage),
                              },
                            ]}
                            sorting={{
                              sort: chartTableSort,
                            }}
                            pagination={{
                              pageIndex: chartTablePage,
                              initialPageSize: 10,
                              pageSizeOptions: [10, 25, 50],
                            }}
                            onTableChange={({
                              page,
                              sort,
                            }: {
                              page?: { index: number };
                              sort?: { field: string; direction: 'asc' | 'desc' };
                            }) => {
                              if (page) {
                                setChartTablePage(page.index);
                              }
                              if (sort) {
                                setChartTableSort(sort);
                              }
                            }}
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiPanel>
                    <EuiSpacer size="m" />
                    <EuiPanel>
                      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                        <EuiFlexItem grow={false}>
                          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                            <EuiFlexItem grow={false}>
                              <EuiTitle size="xs">
                                <h3>Performance Analysis</h3>
                              </EuiTitle>
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <EuiIconTip
                                content="Time labels represent the start of each time bucket. Data is aggregated into buckets across the selected time range."
                                position="right"
                                type="questionInCircle"
                              />
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiFlexGroup gutterSize="s" alignItems="center">
                            {performanceChartType === 'heatmap' && (
                              <EuiFlexItem grow={false}>
                                <EuiSelect
                                  options={[
                                    { value: 'index', text: 'Index' },
                                    { value: 'node', text: 'Node' },
                                    { value: 'username', text: 'Username' },
                                    { value: 'user_roles', text: 'User Roles' },
                                    { value: 'wlm_group', text: 'WLM Group' },
                                  ]}
                                  value={heatmapGroupBy}
                                  onChange={(e) =>
                                    setHeatmapGroupBy(e.target.value as HeatmapGroupBy)
                                  }
                                  compressed
                                />
                              </EuiFlexItem>
                            )}
                            <EuiFlexItem grow={false}>
                              <EuiSelect
                                options={
                                  performanceChartType === 'heatmap'
                                    ? [
                                        { value: 'latency', text: 'Latency' },
                                        { value: 'cpu', text: 'CPU' },
                                        { value: 'memory', text: 'Memory' },
                                        { value: 'count', text: 'Count' },
                                      ]
                                    : [
                                        { value: 'latency', text: 'Latency' },
                                        { value: 'cpu', text: 'CPU' },
                                        { value: 'memory', text: 'Memory' },
                                      ]
                                }
                                value={performanceMetric}
                                onChange={(e) =>
                                  setPerformanceMetric(
                                    e.target.value as 'latency' | 'cpu' | 'memory' | 'count'
                                  )
                                }
                                compressed
                              />
                            </EuiFlexItem>
                            {performanceChartType === 'heatmap' && (
                              <EuiFlexItem grow={false}>
                                <EuiToolTip
                                  content={
                                    performanceMetric === 'count'
                                      ? 'Aggregation is not available for count metric'
                                      : undefined
                                  }
                                >
                                  <EuiSelect
                                    options={[
                                      { value: 'avg', text: 'Avg' },
                                      { value: 'max', text: 'Max' },
                                      { value: 'min', text: 'Min' },
                                    ]}
                                    value={heatmapAggregation}
                                    onChange={(e) =>
                                      setHeatmapAggregation(e.target.value as HeatmapAggregation)
                                    }
                                    compressed
                                    disabled={performanceMetric === 'count'}
                                    style={
                                      performanceMetric === 'count'
                                        ? { textDecoration: 'line-through' }
                                        : undefined
                                    }
                                  />
                                </EuiToolTip>
                              </EuiFlexItem>
                            )}
                            <EuiFlexItem grow={false}>
                              <EuiButtonGroup
                                legend="Chart type"
                                options={[
                                  { id: 'line', label: 'Line Chart' },
                                  { id: 'heatmap', label: 'Heatmap' },
                                ]}
                                idSelected={performanceChartType}
                                onChange={(id) => setPerformanceChartType(id as 'line' | 'heatmap')}
                                color="primary"
                              />
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                      <EuiSpacer size="m" />
                      {performanceChartType === 'line' &&
                        (performanceChartData.times.length > 0 ? (
                          <ReactECharts
                            key="performance-line-chart"
                            option={performanceChartOptions}
                            style={{ height: '40vh', width: '100%' }}
                            opts={{ renderer: 'svg' }}
                            notMerge={true}
                          />
                        ) : (
                          <EuiTextAlign textAlign="center">
                            <EuiText color="subdued">
                              <p>No data available</p>
                            </EuiText>
                          </EuiTextAlign>
                        ))}
                      {performanceChartType === 'heatmap' &&
                        (heatmapChartData.indices.length > 0 ? (
                          <ReactECharts
                            key="performance-heatmap-chart"
                            option={heatmapChartOptions}
                            style={{ height: '70vh', width: '100%' }}
                            opts={{ renderer: 'svg' }}
                            notMerge={true}
                          />
                        ) : (
                          <EuiTextAlign textAlign="center">
                            <EuiText color="subdued">
                              <p>No data available</p>
                            </EuiText>
                          </EuiTextAlign>
                        ))}
                    </EuiPanel>
                  </>
                )
              ) : (
                <EuiPanel color="subdued" paddingSize="xl">
                  <EuiSpacer size="xxl" />
                  <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="visLine" size="xxl" color="subdued" aria-hidden={true} />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiTitle size="s">
                        <h3>No Visualization Available</h3>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText color="subdued" size="s">
                        <p>Visualizations for grouped queries are coming soon</p>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiSpacer size="xxl" />
                </EuiPanel>
              )}
            </EuiAccordion>
          </EuiPanel>
          <EuiSpacer size="m" />
          <EuiInMemoryTable<SearchQueryRecord>
            key={tableKey}
            items={items}
            columns={columnsToShow}
            sorting={{
              sort: {
                field: TIMESTAMP_FIELD as keyof SearchQueryRecord,
                direction: 'desc',
              },
            }}
            onTableChange={({ page: { index } }) => setPagination({ pageIndex: index })}
            pagination={pagination}
            loading={loading}
            allowNeutralSort={false}
            itemId={(q: SearchQueryRecord) => q.id}
          />
        </>
      )}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default QueryInsights;
