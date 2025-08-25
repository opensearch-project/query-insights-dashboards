/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useContext, useEffect, useState } from 'react';
import { EuiBasicTableColumn, EuiInMemoryTable, EuiLink, EuiSuperDatePicker } from '@elastic/eui';
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
} from '../../../common/constants';
import { calculateMetric, calculateMetricNumber } from '../../../common/utils/MetricUtils';
import { parseDateString } from '../../../common/utils/DateUtils';
import { QueryInsightsDataSourceMenu } from '../../components/DataSourcePicker';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';

const TIMESTAMP_FIELD = 'timestamp';
const MEASUREMENTS_FIELD = 'measurements';
const LATENCY_FIELD = 'measurements.latency';
const CPU_FIELD = 'measurements.cpu';
const MEMORY_FIELD = 'measurements.memory';
const INDICES_FIELD = 'indices';
const SEARCH_TYPE_FIELD = 'search_type';
const NODE_ID_FIELD = 'node_id';
const TOTAL_SHARDS_FIELD = 'total_shards';
const METRIC_DEFAULT_MSG = 'Not enabled';
const GROUP_BY_FIELD = 'group_by';

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
  const [pagination, setPagination] = useState({ pageIndex: 0 });

  const [searchText, setSearchText] = useState('');
  const [selectedGroupBy, setSelectedGroupBy] = useState<string[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<string[]>([]);
  const [selectedSearchTypes, setSelectedSearchTypes] = useState<string[]>([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);

  const from = parseDateString(currStart);
  const to = parseDateString(currEnd);
  const { dataSource, setDataSource } = useContext(DataSourceContext)!;

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

  const QueryTypeSpecificColumns: Array<EuiBasicTableColumn<SearchQueryRecord>> = [
    {
      field: INDICES_FIELD as keyof SearchQueryRecord,
      name: INDICES,
      render: (indices: string[] = [], q: SearchQueryRecord) =>
        q.group_by === 'SIMILARITY' ? '-' : Array.from(new Set(indices)).join(', '),
      sortable: true,
      truncateText: true,
    },
    {
      field: SEARCH_TYPE_FIELD as keyof SearchQueryRecord,
      name: SEARCH_TYPE,
      render: (st: string, q: SearchQueryRecord) =>
        q.group_by === 'SIMILARITY' ? '-' : (st || '').replaceAll('_', ' '),
      sortable: true,
      truncateText: true,
    },
    {
      field: NODE_ID_FIELD as keyof SearchQueryRecord,
      name: NODE_ID,
      render: (nid: string, q: SearchQueryRecord) => (q.group_by === 'SIMILARITY' ? '-' : nid),
      sortable: true,
      truncateText: true,
    },
    {
      field: TOTAL_SHARDS_FIELD as keyof SearchQueryRecord,
      name: TOTAL_SHARDS,
      render: (ts: number, q: SearchQueryRecord) => (q.group_by === 'SIMILARITY' ? '-' : ts),
      sortable: true,
      truncateText: true,
    },
  ];
  const items = useMemo(() => {
    const nonGroupActive =
      selectedIndices.length > 0 ||
      selectedSearchTypes.length > 0 ||
      selectedNodeIds.length > 0 ||
      !!searchText;

    return queries.filter((q: SearchQueryRecord) => {
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

      if (searchText) {
        const id = (q.id ?? '').toLowerCase();
        if (!id.includes(searchText.toLowerCase())) return false;
      }

      if (selectedGroupBy.length > 0 && selectedGroupBy.length < 2) {
        if (!selectedGroupBy.includes(q.group_by)) return false;
      }

      return true;
    });
  }, [queries, selectedIndices, selectedSearchTypes, selectedNodeIds, searchText, selectedGroupBy]);

  const forView = items.length ? items : queries;
  const effectiveView = useMemo<'query' | 'group' | 'mixed'>(() => {
    if (selectedGroupBy.length === 1) {
      return selectedGroupBy[0] === 'SIMILARITY' ? 'group' : 'query';
    }
    const hasQuery = forView.some((q: SearchQueryRecord) => q.group_by === 'NONE');
    const hasGroup = forView.some((q: SearchQueryRecord) => q.group_by === 'SIMILARITY');
    if (hasQuery && hasGroup) return 'mixed';
    return hasGroup ? 'group' : 'query';
  }, [selectedGroupBy, forView]);

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
            1000000,
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

  const columnsToShow = useMemo(() => {
    const nonGroupActive =
      selectedIndices.length > 0 ||
      selectedSearchTypes.length > 0 ||
      selectedNodeIds.length > 0 ||
      !!searchText;

    if (selectedGroupBy.length === 1) {
      return selectedGroupBy[0] === 'SIMILARITY' ? groupTypeColumns : queryTypeColumns;
    }

    if (nonGroupActive && (selectedGroupBy.length === 0 || selectedGroupBy.length === 2)) {
      return queryTypeColumns;
    }

    const hasAnyQuery = items.some((q: SearchQueryRecord) => q.group_by === 'NONE');
    const hasAnyGroup = items.some((q: SearchQueryRecord) => q.group_by === 'SIMILARITY');

    if (items.length === 0) return defaultColumns; // empty & no filters → neutral
    if (hasAnyQuery && hasAnyGroup) return defaultColumns;
    if (hasAnyGroup) return groupTypeColumns;
    return queryTypeColumns;
  }, [
    items,
    selectedGroupBy,
    selectedIndices,
    selectedSearchTypes,
    selectedNodeIds,
    searchText,
    defaultColumns,
    groupTypeColumns,
    queryTypeColumns,
  ]);

  const arraysEqualAsSets = (a: string[], b: string[]) =>
    a.length === b.length && a.every((x) => b.includes(x));

  const parseList = (s: string) =>
    s
      .split(/\s+or\s+/i)
      .map((x) => x.trim())
      .filter(Boolean);

  const extractField = (text: string, field: string): string[] => {
    const rx = new RegExp(`${field}:\\(([^)]+)\\)`, 'i');
    const m = rx.exec(text || '');
    return m ? parseList(m[1]) : [];
  };

  const onSearchChange = ({ query }: { query: any }) => {
    const text: string = query?.text || '';

    // free text (unchanged)
    const fieldChunks = [...text.matchAll(/\b[\w.]+:\([^)]+\)/g)].map((m) => m[0]);
    let free = text;
    fieldChunks.forEach((chunk) => (free = free.replace(chunk, '')));
    const nextText = free.trim().toLowerCase();
    if (nextText !== searchText) setSearchText(nextText);

    const gb = extractField(text, GROUP_BY_FIELD);
    if (!arraysEqualAsSets(gb, selectedGroupBy)) setSelectedGroupBy(gb);

    // others (unchanged)
    const idx = extractField(text, INDICES_FIELD);
    if (!arraysEqualAsSets(idx, selectedIndices)) setSelectedIndices(idx);

    const st = extractField(text, SEARCH_TYPE_FIELD);
    if (!arraysEqualAsSets(st, selectedSearchTypes)) setSelectedSearchTypes(st);

    const nid = extractField(text, NODE_ID_FIELD);
    if (!arraysEqualAsSets(nid, selectedNodeIds)) setSelectedNodeIds(nid);
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

      <EuiInMemoryTable<SearchQueryRecord>
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
              noOptionsMessage: 'No data available for the selected type',
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
          ],
          onChange: onSearchChange,
          toolsRight: [
            <EuiSuperDatePicker
              key="date-picker"
              start={currStart}
              end={currEnd}
              onTimeChange={onTimeChange}
              recentlyUsedRanges={recentlyUsedRanges}
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
            TOTAL_SHARDS_FIELD,
          ],
        }}
        allowNeutralSort={false}
        itemId={(q: SearchQueryRecord) => q.id}
      />
    </>
  );
};
// eslint-disable-next-line import/no-default-export
export default QueryInsights;
