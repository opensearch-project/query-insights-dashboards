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
} from '@elastic/eui';
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
} from '../../../common/constants';
import { calculateMetric, calculateMetricNumber } from '../../../common/utils/MetricUtils';
import { parseDateString } from '../../../common/utils/DateUtils';
import { QueryInsightsDataSourceMenu } from '../../components/DataSourcePicker';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';
import { API_ENDPOINTS } from '../../../common/utils/apiendpoints';
import { getVersionOnce, isVersion33OrHigher } from '../../utils/version-utils';
import { DEFAULT_WORKLOAD_GROUP } from '../../../common/constants';

// --- constants for field names and defaults ---
const TIMESTAMP_FIELD = 'timestamp';
const MEASUREMENTS_FIELD = 'measurements';
const LATENCY_FIELD = 'measurements.latency';
const CPU_FIELD = 'measurements.cpu';
const MEMORY_FIELD = 'measurements.memory';
const INDICES_FIELD = 'indices';
const SEARCH_TYPE_FIELD = 'search_type';
const NODE_ID_FIELD = 'node_id';
const TOTAL_SHARDS_FIELD = 'total_shards';
const WLM_GROUP_FIELD = 'wlm_group_id';
const METRIC_DEFAULT_MSG = 'Not enabled';
const GROUP_BY_FIELD = 'group_by';

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
  const [searchText, setSearchText] = useState('');
  const [selectedGroupBy, setSelectedGroupBy] = useState<string[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<string[]>([]);
  const [selectedSearchTypes, setSelectedSearchTypes] = useState<string[]>([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedWlmGroups, setSelectedWlmGroups] = useState<string[]>([]);
  const [wlmIdToNameMap, setWlmIdToNameMap] = useState<Record<string, string>>({});
  const [wlmAvailable, setWlmAvailable] = useState<boolean>(false);
  const [queryInsightWlmNavigationSupported, setQueryInsightWlmNavigationSupported] = useState<
    boolean
  >(false);
  // Initialize search query based on URL parameters
  const urlParams = new URLSearchParams(location.search);
  const wlmGroupIdFromUrl = urlParams.get('wlmGroupId');
  const [searchQuery, setSearchQuery] = useState<string>(
    wlmGroupIdFromUrl ? `${WLM_GROUP_FIELD}:(${wlmGroupIdFromUrl})` : ''
  );
  const tableKey = useMemo(() => {
    const wlmId = new URLSearchParams(location.search).get('wlmGroupId');
    return wlmId ? `table-${wlmId}` : 'table-default';
  }, [location.search]);

  // Get wlmGroupId from URL parameters once and clean URL
  useEffect(() => {
    const urlSearchParams = new URLSearchParams(location.search);
    const wlmGroupIdFromSearch = urlSearchParams.get('wlmGroupId');
    if (wlmGroupIdFromSearch) {
      console.log('[QueryInsights] Navigation from WLM detected:', {
        wlmGroupId: wlmGroupIdFromSearch,
        timestamp: new Date().toISOString(),
        currentPath: location.pathname,
        fullUrl: location.pathname + location.search,
      });
      setSearchQuery(`${WLM_GROUP_FIELD}:(${wlmGroupIdFromSearch})`);
      history.replace(location.pathname);
    }
  }, [location.search, history, location.pathname]);

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

        if (versionSupported) {
          const hasWlm = await detectWlm();
          setWlmAvailable(hasWlm);
        } else {
          setWlmAvailable(false);
        }
      } catch (e) {
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

  // Log filter selection changes
  useEffect(() => {
    if (selectedIndices.length > 0) {
      console.log('[QueryInsights] Indices filter selected:', selectedIndices);
    }
  }, [selectedIndices]);

  useEffect(() => {
    if (selectedSearchTypes.length > 0) {
      console.log('[QueryInsights] Search types filter selected:', selectedSearchTypes);
    }
  }, [selectedSearchTypes]);

  useEffect(() => {
    if (selectedNodeIds.length > 0) {
      console.log('[QueryInsights] Node IDs filter selected:', selectedNodeIds);
    }
  }, [selectedNodeIds]);

  useEffect(() => {
    if (selectedWlmGroups.length > 0) {
      console.log('[QueryInsights] WLM groups filter selected:', selectedWlmGroups);
    }
  }, [selectedWlmGroups]);

  useEffect(() => {
    if (selectedGroupBy.length > 0) {
      console.log('[QueryInsights] Group by filter selected:', selectedGroupBy);
    }
  }, [selectedGroupBy]);

  useEffect(() => {
    if (searchText) {
      console.log('[QueryInsights] Search text filter applied:', searchText);
    }
  }, [searchText]);
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

  const items = useMemo(() => {
    const nonGroupActive =
      selectedIndices.length > 0 ||
      selectedSearchTypes.length > 0 ||
      selectedNodeIds.length > 0 ||
      selectedWlmGroups.length > 0 ||
      !!searchText;

    return queries.filter((q: SearchQueryRecord) => {
      // If the user applied non-group filters (indices, search_type, node_id, wlm_group, or free-text),
      // but has NOT explicitly chosen "group" (selectedGroupBy is empty or includes both),
      // then hide grouped rows (group_by = SIMILARITY).
      if (nonGroupActive && (selectedGroupBy.length === 0 || selectedGroupBy.length === 2)) {
        if (q.group_by !== 'NONE') return false;
      }

      if (selectedIndices.length) {
        const rowIdx = Array.isArray(q.indices) ? q.indices : [];
        const overlap = rowIdx.some((i) => selectedIndices.includes(i));
        if (!overlap) return false;
      }

      if (selectedSearchTypes.length && !selectedSearchTypes.includes(q.search_type)) return false;

      if (selectedNodeIds.length && !selectedNodeIds.includes(q.node_id)) return false;

      if (selectedWlmGroups.length && !selectedWlmGroups.includes(q.wlm_group_id)) return false;

      if (searchText) {
        const id = (q.id ?? '').toLowerCase();
        if (!id.includes(searchText.toLowerCase())) return false;
      }

      if (selectedGroupBy.length === 1) {
        if (!selectedGroupBy.includes(q.group_by)) return false;
      }

      return true;
    });
  }, [
    queries,
    selectedIndices,
    selectedSearchTypes,
    selectedNodeIds,
    selectedWlmGroups,
    searchText,
    selectedGroupBy,
  ]);

  // if no filtered items, show all queries
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

  const baseColumns: Array<EuiBasicTableColumn<SearchQueryRecord>> = [
    {
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

  const querycountColumn: Array<EuiBasicTableColumn<SearchQueryRecord>> = [
    {
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

  const timestampColumn: Array<EuiBasicTableColumn<SearchQueryRecord>> = [
    {
      name: TIMESTAMP,
      render: (q: SearchQueryRecord) => {
        const isQuery = q.group_by === 'NONE';
        const linkContent = isQuery ? convertTime(q.timestamp) : '-';
        const onClickHandler = () => {
          const route = `/query-details?from=${from}&to=${to}&id=${q.id}&verbose=true`;
          history.push(route);
        };
        return (
          <span>
            <EuiLink onClick={onClickHandler}>{linkContent}</EuiLink>
          </span>
        );
      },
      sortable: (q: SearchQueryRecord) => q.timestamp,
      truncateText: true,
    },
  ];

  // columns shown only for query-type records
  const QueryTypeSpecificColumns: Array<EuiBasicTableColumn<SearchQueryRecord>> = [
    {
      field: INDICES_FIELD as keyof SearchQueryRecord,
      name: INDICES,
      render: (indices: string[] = [], q: SearchQueryRecord) => (
        <span>{q.group_by === 'SIMILARITY' ? '-' : Array.from(new Set(indices)).join(', ')}</span>
      ),
      sortable: true,
      truncateText: true,
    },
    {
      field: SEARCH_TYPE_FIELD as keyof SearchQueryRecord,
      name: SEARCH_TYPE,
      render: (st: string, q: SearchQueryRecord) => (
        <span>{q.group_by === 'SIMILARITY' ? '-' : (st || '').replaceAll('_', ' ')}</span>
      ),
      sortable: true,
      truncateText: true,
    },
    {
      field: NODE_ID_FIELD as keyof SearchQueryRecord,
      name: NODE_ID,
      render: (nid: string, q: SearchQueryRecord) => (
        <span>{q.group_by === 'SIMILARITY' ? '-' : nid}</span>
      ),
      sortable: true,
      truncateText: true,
    },
    ...(queryInsightWlmNavigationSupported
      ? [
          {
            field: WLM_GROUP_FIELD as keyof SearchQueryRecord,
            name: WLM_GROUP,
            render: (wlmGroupId: string, q: SearchQueryRecord) => {
              if (q.group_by === 'SIMILARITY') return '-';
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
                    {displayName} <EuiIcon type="popout" size="s" />
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
      field: TOTAL_SHARDS_FIELD as keyof SearchQueryRecord,
      name: TOTAL_SHARDS,
      render: (ts: number, q: SearchQueryRecord) => (
        <span>{q.group_by === 'SIMILARITY' ? '-' : ts}</span>
      ),
      sortable: true,
      truncateText: true,
    },
  ];

  // metric columns (latency, cpu, memory)
  const metricColumns: Array<EuiBasicTableColumn<SearchQueryRecord>> = useMemo(
    () => [
      {
        name: latencyHeader,
        render: (q: SearchQueryRecord) =>
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
        name: cpuHeader,
        render: (q: SearchQueryRecord) =>
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
        name: memHeader,
        render: (q: SearchQueryRecord) =>
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
      ...querycountColumn,
      ...timestampColumn,
      ...metricColumns,
      ...QueryTypeSpecificColumns,
    ],
    [baseColumns, querycountColumn, timestampColumn, metricColumns, QueryTypeSpecificColumns]
  );
  const groupTypeColumns = useMemo(() => [...baseColumns, ...querycountColumn, ...metricColumns], [
    baseColumns,
    querycountColumn,
    metricColumns,
  ]);

  const queryTypeColumns = useMemo(
    () => [...baseColumns, ...timestampColumn, ...metricColumns, ...QueryTypeSpecificColumns],
    [baseColumns, timestampColumn, metricColumns, QueryTypeSpecificColumns]
  );

  /**
   * Decide which column set to show
   * based on selected filters and presence of query/group rows
   */
  const columnsToShow = useMemo(() => {
    // true if the user applied filters that only apply to queries
    // (indices, searchType, nodeId, or free text).
    // Groups don't have those fields.
    const nonGroupActive =
      selectedIndices.length > 0 ||
      selectedSearchTypes.length > 0 ||
      selectedNodeIds.length > 0 ||
      selectedWlmGroups.length > 0 ||
      !!searchText;

    // If the user explicitly picked only "group", show group columns.
    // If they explicitly picked only "query", show query columns.
    if (selectedGroupBy.length === 1) {
      return selectedGroupBy[0] === 'SIMILARITY' ? groupTypeColumns : queryTypeColumns;
    }

    // Non-group filters applied but group-by not explicitly chosen
    // If filters like indices/searchType/nodeId/wlmGroup are active,
    // and group-by is either empty (no choice) or includes both,
    // force the view into query mode (groups would look wrong here).
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
    selectedIndices,
    selectedSearchTypes,
    selectedNodeIds,
    selectedWlmGroups,
    searchText,
    defaultColumns,
    groupTypeColumns,
    queryTypeColumns,
  ]);

  const arraysEqualAsSets = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    const setB = new Set(b);
    for (const x of a) if (!setB.has(x)) return false;
    return true;
  };

  const parseList = (s: string) =>
    s
      .split(/\s*(?:\bor\b|,)\s*/i)
      .map((x) => x.trim())
      .filter(Boolean);

  const extractField = (text: string, field: string): string[] => {
    const rx = new RegExp(`${field}:\\(([^)]+)\\)`, 'i');
    const m = rx.exec(text || '');
    return m ? parseList(m[1]) : [];
  };

  const onSearchChange = ({ query }: { query: any }) => {
    const text: string = query?.text || '';
    setSearchQuery(text);

    // Find every structured filter chunk like "field:(...)" in the search text and return the full matches.
    // Regex: \b        → word boundary (start of a field name)
    //        [\w.]+    → field name (letters/digits/_ or dots, e.g. "indices", "measurements.latency")
    //        :         → literal colon
    //        \( [^)]+ \) → parentheses containing any chars except ')' (the filter values)
    // The 'g' flag finds all occurrences. matchAll() yields matches; map(m => m[0]) returns each full matched substring.
    const fieldChunks = [...text.matchAll(/\b[\w.]+:\([^)]+\)/g)].map((m) => m[0]);

    let free = text;
    fieldChunks.forEach((chunk) => (free = free.replace(chunk, '')));
    const nextText = free.trim().toLowerCase();
    if (nextText !== searchText) setSearchText(nextText);

    const gb = extractField(text, GROUP_BY_FIELD);
    if (!arraysEqualAsSets(gb, selectedGroupBy)) setSelectedGroupBy(gb);

    const idx = extractField(text, INDICES_FIELD);
    if (!arraysEqualAsSets(idx, selectedIndices)) setSelectedIndices(idx);

    const st = extractField(text, SEARCH_TYPE_FIELD);
    if (!arraysEqualAsSets(st, selectedSearchTypes)) setSelectedSearchTypes(st);

    const nid = extractField(text, NODE_ID_FIELD);
    if (!arraysEqualAsSets(nid, selectedNodeIds)) setSelectedNodeIds(nid);

    const wlm = extractField(text, WLM_GROUP_FIELD);
    if (!arraysEqualAsSets(wlm, selectedWlmGroups)) {
      setSelectedWlmGroups(wlm);
    }
  };

  const onRefresh = async ({ start, end }: { start: string; end: string }) => {
    onTimeChange({ start, end });
    retrieveQueries(start, end);
  };

  const filterDuplicates = (options: Array<{ value: string; name: string; view: string }>) =>
    options.filter(
      (value, index, self) => index === self.findIndex((t) => t.value === value.value)
    );

  const indexOptions = useMemo(() => {
    const set = new Set<string>();
    for (const q of queries) {
      const arr = (q as any)[INDICES_FIELD];
      if (Array.isArray(arr)) arr.forEach((s) => s && set.add(String(s)));
    }
    return Array.from(set).map((idx) => ({ value: idx, name: idx, view: idx }));
  }, [queries]);

  const searchTypeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const q of queries) {
      const v = (q as any)[SEARCH_TYPE_FIELD];
      if (v) set.add(String(v));
    }
    return Array.from(set).map((v) => ({ value: v, name: v, view: v }));
  }, [queries]);

  const nodeIdOptions = useMemo(() => {
    const set = new Set<string>();
    for (const q of queries) {
      const v = (q as any)[NODE_ID_FIELD];
      if (v) set.add(String(v));
    }
    return Array.from(set).map((v) => ({ value: v, name: v, view: v.replaceAll('_', ' ') }));
  }, [queries]);

  // Generate filter options for WLM groups with ID-to-name mapping
  const wlmGroupOptions = useMemo(() => {
    const set = new Set<string>();

    for (const q of queries) {
      const v = (q as any)[WLM_GROUP_FIELD];
      if (v) set.add(String(v));
    }

    return Array.from(set).map((v) => {
      const label = wlmIdToNameMap[v] || v;
      return {
        value: v,
        name: label,
        view: label,
      };
    });
  }, [queries, wlmIdToNameMap]);

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
          search={{
            box: { placeholder: 'Search queries', schema: false },
            defaultQuery: searchQuery,
            filters: [
              {
                type: 'field_value_selection',
                field: GROUP_BY_FIELD,
                name: TYPE,
                multiSelect: 'or',
                options: [
                  { value: 'NONE', name: 'query', view: 'query' },
                  { value: 'SIMILARITY', name: 'group', view: 'group' },
                ],
              },
              {
                type: 'field_value_selection',
                field: INDICES_FIELD,
                name: INDICES,
                multiSelect: 'or',
                options: filterDuplicates(indexOptions),
              },
              {
                type: 'field_value_selection',
                field: SEARCH_TYPE_FIELD,
                name: SEARCH_TYPE,
                multiSelect: 'or',
                options: filterDuplicates(searchTypeOptions),
              },
              {
                type: 'field_value_selection',
                field: NODE_ID_FIELD,
                name: NODE_ID,
                multiSelect: 'or',
                options: filterDuplicates(nodeIdOptions),
              },
              ...(queryInsightWlmNavigationSupported
                ? [
                    {
                      type: 'field_value_selection',
                      field: WLM_GROUP_FIELD,
                      name: WLM_GROUP,
                      multiSelect: 'or',
                      options: filterDuplicates(wlmGroupOptions),
                    },
                  ]
                : []),
            ],
            onChange: onSearchChange,
            toolsRight: [
              <EuiSuperDatePicker
                key="date-picker"
                start={currStart}
                end={currEnd}
                onTimeChange={onTimeChange}
                recentlyUsedRanges={recentlyUsedRanges}
                commonlyUsedRanges={commonlyUsedRanges}
                onRefresh={onRefresh}
                updateButtonProps={{ fill: false }}
              />,
            ],
          }}
          executeQueryOptions={{
            defaultFields: [
              'id',
              GROUP_BY_FIELD,
              TIMESTAMP_FIELD,
              MEASUREMENTS_FIELD,
              LATENCY_FIELD,
              CPU_FIELD,
              MEMORY_FIELD,
              INDICES_FIELD,
              SEARCH_TYPE_FIELD,
              NODE_ID_FIELD,
              ...(queryInsightWlmNavigationSupported ? [WLM_GROUP_FIELD] : []),
              TOTAL_SHARDS_FIELD,
            ],
          }}
          allowNeutralSort={false}
          itemId={(q: SearchQueryRecord) => q.id}
        />
      )}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default QueryInsights;
