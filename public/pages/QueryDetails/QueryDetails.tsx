/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  EuiBadge,
  EuiBasicTableColumn,
  EuiButton,
  EuiInMemoryTable,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useHistory, useLocation } from 'react-router-dom';
import { AppMountParameters, CoreStart } from 'opensearch-dashboards/public';
import { DataSourceManagementPluginSetup } from 'src/plugins/data_source_management/public';
import { Task } from '../../../types/types';
import QuerySummary from './Components/QuerySummary';
import { DataSourceContext, QUERY_INSIGHTS } from '../TopNQueries/TopNQueries';
import { SearchQueryRecord } from '../../../types/types';
import { PageHeader } from '../../components/PageHeader';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';
import { retrieveQueryWithSearches } from '../../../common/utils/QueryUtils';
import { calculateMemory, calculateMetric } from '../../../common/utils/MetricUtils';
import {
  CPU_TIME,
  INDICES,
  LATENCY,
  MEMORY_USAGE,
  TIMESTAMP,
  TOTAL_SHARDS,
} from '../../../common/constants';
import { QueryInsightsDataSourceMenu } from '../../components/DataSourcePicker';
import { formatQueryDisplay, isDslQuery } from '../../utils/query-formatter-utils';
import { getDataSourceFromUrl } from '../../utils/datasource-utils';
import {
  getVersionOnce,
  isVersion33OrHigher,
  isVersion35OrHigher,
  isVersion36OrHigher,
} from '../../utils/version-utils';

const QueryDetails = ({
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
  // Get url parameters
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const id = searchParams.get('id');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const verbose = Boolean(searchParams.get('verbose'));

  const [query, setQuery] = useState<SearchQueryRecord | null>(null);
  // For a SQL/PPL query, every search it ran.
  const [searches, setSearches] = useState<SearchQueryRecord[]>([]);
  const [wlmSupported, setWlmSupported] = useState(false);
  const [statusSupported, setStatusSupported] = useState(false);
  const [userInfoSupported, setUserInfoSupported] = useState(false);
  const history = useHistory();
  const { dataSource, setDataSource } = useContext(DataSourceContext)!;

  // Convert UNIX time to a readable format
  const convertTime = useCallback((unixTime: number) => {
    const date = new Date(unixTime);
    const [_weekDay, month, day, year] = date.toDateString().split(' ');
    return `${month} ${day}, ${year} @ ${date.toLocaleTimeString('en-US')}`;
  }, []);

  const fetchQueryDetails = async () => {
    const retrieved = await retrieveQueryWithSearches(
      core,
      getDataSourceFromUrl().id,
      from,
      to,
      id,
      verbose
    );
    setQuery(retrieved.query);
    setSearches(retrieved.searches);
  };

  useEffect(() => {
    if (id && from && to && verbose != null) {
      fetchQueryDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, from, to, verbose]);

  useEffect(() => {
    let cancelled = false;

    setWlmSupported(false);
    setStatusSupported(false);
    setUserInfoSupported(false);

    (async () => {
      try {
        const version = await getVersionOnce(getDataSourceFromUrl().id || '');
        if (cancelled) return;

        setWlmSupported(isVersion33OrHigher(version));
        setStatusSupported(isVersion36OrHigher(version));
        setUserInfoSupported(isVersion35OrHigher(version));
      } catch (_error) {
        if (!cancelled) {
          setWlmSupported(false);
          setStatusSupported(false);
          setUserInfoSupported(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dataSource?.id]);

  // ECharts options for latency chart
  const chartOptions = useMemo(() => {
    const phaseLatency = query?.phase_latency_map || { expand: 0, query: 0, fetch: 0 };
    const expand = phaseLatency.expand || 0;
    const queryVal = phaseLatency.query || 0;
    const fetch = phaseLatency.fetch || 0;
    return {
      grid: { left: 80, right: 80, top: 25, bottom: 15 },
      xAxis: {
        type: 'value',
        position: 'top',
        axisLabel: { formatter: '{value}ms', color: '#535966' },
        axisLine: { lineStyle: { color: '#D4DAE5' } },
        splitLine: { lineStyle: { color: '#D4DAE5' } },
      },
      yAxis: {
        type: 'category',
        data: ['Fetch', 'Query', 'Expand'],
        axisLine: { lineStyle: { color: '#D4DAE5' } },
      },
      series: [
        {
          type: 'bar',
          stack: 'total',
          silent: true,
          data: [expand + queryVal, expand, 0],
          itemStyle: { color: 'transparent' },
          label: { show: false },
          tooltip: { show: false },
          barWidth: '50%',
        },
        {
          type: 'bar',
          stack: 'total',
          data: [
            { value: fetch, itemStyle: { color: '#F990C0' } },
            { value: queryVal, itemStyle: { color: '#1BA9F5' } },
            { value: expand, itemStyle: { color: '#7DE2D1' } },
          ],
          label: { show: true, position: 'right', formatter: '{c}ms' },
          barWidth: '50%',
        },
      ],
    };
  }, [query]);

  useEffect(() => {
    if (query) {
      core.chrome.setBreadcrumbs([
        {
          text: 'Query insights',
          href: QUERY_INSIGHTS,
          onClick: (e) => {
            e.preventDefault();
            history.push(QUERY_INSIGHTS);
          },
        },
        { text: `Query details: ${convertTime(query.timestamp)}` },
      ]);
    }
  }, [query, history, core.chrome, convertTime]);

  const PHASE_DISPLAY: Record<string, string> = {
    can_match: 'Can Match',
    dfs_pre_query: 'DFS Pre-Query',
    dfs_query: 'DFS Query',
    dfs: 'DFS',
    query: 'Query',
    'fetch/id': 'Fetch (ID)',
    'fetch/scroll': 'Fetch (Scroll)',
    fetch: 'Fetch',
    expand: 'Expand',
  };

  const renderCoordinatorSummary = (task: Task) => (
    <EuiFlexGrid columns={4}>
      {[
        { title: 'Task ID', description: task.taskId },
        { title: 'Node ID', description: task.nodeId },
        {
          title: 'CPU Time (ms)',
          description: (task.taskResourceUsage.cpu_time_in_nanos / 1e6).toFixed(2),
        },
        { title: 'Memory (bytes)', description: task.taskResourceUsage.memory_in_bytes },
      ].map(({ title, description }) => (
        <EuiFlexItem key={title}>
          <EuiDescriptionList compressed listItems={[{ title: <h4>{title}</h4>, description }]} />
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  );

  // Each search a SQL/PPL query ran, linked to its own details.
  const searchColumns: Array<EuiBasicTableColumn<SearchQueryRecord>> = [
    {
      name: TIMESTAMP,
      render: (search: SearchQueryRecord) => (
        <EuiLink
          onClick={() =>
            history.push(
              `/query-details?from=${encodeURIComponent(from || '')}&to=${encodeURIComponent(
                to || ''
              )}&id=${encodeURIComponent(search.id)}&verbose=true`
            )
          }
        >
          {convertTime(search.timestamp)}
        </EuiLink>
      ),
      sortable: (search: SearchQueryRecord) => search.timestamp,
    },
    {
      name: INDICES,
      render: (search: SearchQueryRecord) => (search.indices || []).join(', ') || '-',
    },
    {
      name: LATENCY,
      render: (search: SearchQueryRecord) =>
        calculateMetric(
          search.measurements?.latency?.number,
          search.measurements?.latency?.count,
          'ms'
        ),
      sortable: (search: SearchQueryRecord) => search.measurements?.latency?.number ?? 0,
    },
    {
      name: CPU_TIME,
      render: (search: SearchQueryRecord) =>
        calculateMetric(
          search.measurements?.cpu?.number,
          search.measurements?.cpu?.count,
          'ms',
          1000000
        ),
      sortable: (search: SearchQueryRecord) => search.measurements?.cpu?.number ?? 0,
    },
    {
      name: MEMORY_USAGE,
      render: (search: SearchQueryRecord) =>
        calculateMemory(search.measurements?.memory?.number, search.measurements?.memory?.count),
      sortable: (search: SearchQueryRecord) => search.measurements?.memory?.number ?? 0,
    },
    {
      name: TOTAL_SHARDS,
      render: (search: SearchQueryRecord) => search.total_shards ?? '-',
    },
    {
      name: 'Status',
      render: (search: SearchQueryRecord) => (
        <EuiBadge color={search.failed ? 'danger' : 'success'}>
          {search.failed ? 'Failed' : 'Completed'}
        </EuiBadge>
      ),
    },
  ];

  const shardColumns = [
    {
      field: 'action',
      name: 'Phase',
      truncateText: true,
      render: (action: string) => {
        const match = action.match(/\[([^\]]+)\]/);
        const raw = match ? match[1].replace('phase/', '') : action;
        return PHASE_DISPLAY[raw] ?? raw;
      },
    },
    { field: 'taskId', name: 'Task ID' },
    { field: 'nodeId', name: 'Node ID', truncateText: true },
    {
      field: 'taskResourceUsage',
      name: 'CPU Time (ms)',
      render: (u: Task['taskResourceUsage']) => (u.cpu_time_in_nanos / 1e6).toFixed(2),
    },
    {
      field: 'taskResourceUsage',
      name: 'Memory (bytes)',
      render: (u: Task['taskResourceUsage']) => u.memory_in_bytes,
    },
  ];

  const queryDisplay = formatQueryDisplay(query);
  // A PPL query's source is its query text: shown as written, and not a body the profiler can run.
  const isDsl = !query || isDslQuery(query);
  // A search's coordinator task is the one whose parent isn't listed: none (-1) for a search sent on
  // its own, or the SQL/PPL query's task for a search such a query ran. Its shard tasks follow.
  const listedTaskIds = new Set((query?.task_resource_usages || []).map((t) => t.taskId));
  const isCoordinatorTask = (task: Task) => !listedTaskIds.has(task.parentTaskId);

  return (
    <div>
      <PageHeader
        coreStart={core}
        depsStart={depsStart}
        fallBackComponent={
          <>
            <EuiTitle size="l">
              <h1>Query details</h1>
            </EuiTitle>
            <EuiSpacer size="l" />
          </>
        }
      />
      <QueryInsightsDataSourceMenu
        coreStart={core}
        depsStart={depsStart}
        params={params}
        dataSourceManagement={dataSourceManagement}
        setDataSource={setDataSource}
        selectedDataSource={dataSource}
        onManageDataSource={() => {}}
        onSelectedDataSource={fetchQueryDetails}
        dataSourcePickerReadOnly={true}
      />
      <EuiFlexItem>
        <QuerySummary
          query={query}
          wlmSupported={wlmSupported}
          searchesWlmGroupId={
            Array.from(new Set(searches.map((search) => search.wlm_group_id).filter(Boolean))).join(
              ', '
            ) || undefined
          }
          statusSupported={statusSupported}
          userInfoSupported={userInfoSupported}
        />
        <EuiSpacer size="m" />
        {query?.task_resource_usages?.length > 0 && (
          <>
            <EuiPanel data-test-subj={'query-details-task-resource-usages'}>
              <EuiTitle size="s">
                <h2>Task Resource Usage</h2>
              </EuiTitle>
              <EuiHorizontalRule margin="xs" />
              <EuiTitle size="xs">
                <h3>Coordinator Task</h3>
              </EuiTitle>
              <EuiHorizontalRule margin="xs" />
              {query.task_resource_usages
                .filter(isCoordinatorTask)
                .map((t) => renderCoordinatorSummary(t))}
              <EuiSpacer size="m" />
              <EuiTitle size="xs">
                <h3>Shard Tasks</h3>
              </EuiTitle>
              <EuiHorizontalRule margin="xs" />
              <EuiInMemoryTable
                items={query.task_resource_usages.filter((t) => !isCoordinatorTask(t))}
                columns={shardColumns}
                itemId="taskId"
                pagination={{ initialPageSize: 10, showPerPageOptions: false }}
              />
            </EuiPanel>
            <EuiSpacer size="m" />
          </>
        )}
        <EuiFlexGroup>
          <EuiFlexItem grow={1} style={{ minWidth: 0 }}>
            <EuiPanel data-test-subj={'query-details-source-section'}>
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h2>Query</h2>
                  </EuiTitle>
                </EuiFlexItem>
                {isDsl && queryDisplay && !queryDisplay.includes('...truncated') && (
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      size="s"
                      onClick={() => {
                        try {
                          const { profile: _p, ...rest } = JSON.parse(queryDisplay);
                          const profilerBody = { profile: true, ...rest };
                          const indexPath = query?.indices?.join(',') || '_search';
                          const searchPath =
                            indexPath === '_search' ? '_search' : `${indexPath}/_search`;
                          const profilerQuery = `GET ${searchPath}\n${JSON.stringify(
                            profilerBody,
                            null,
                            2
                          )}`;
                          localStorage.setItem('profilerQuery', profilerQuery);
                          if (dataSource?.id) {
                            localStorage.setItem('profilerDataSourceId', dataSource.id);
                          }
                          window.location.href = core.http.basePath.prepend(
                            '/app/dev_tools#/queryProfiler'
                          );
                        } catch (e) {
                          console.error('Failed to parse query for profiler', e);
                        }
                      }}
                    >
                      Open in Profiler
                    </EuiButton>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
              <EuiHorizontalRule margin="xs" />
              <EuiSpacer size="xs" />
              <EuiCodeBlock
                language={isDsl ? 'jsx' : undefined}
                paddingSize="m"
                fontSize="s"
                overflowHeight={600}
                isCopyable
              >
                {queryDisplay}
              </EuiCodeBlock>
            </EuiPanel>
          </EuiFlexItem>
          {/* The chart shows a search's phases; a PPL query has none of its own. */}
          {isDsl && (
            <EuiFlexItem grow={1} style={{ alignSelf: 'start', minWidth: 0 }}>
              <EuiPanel data-test-subj={'query-details-latency-chart'}>
                <EuiTitle size="xs">
                  <h2>Latency</h2>
                </EuiTitle>
                <EuiHorizontalRule margin="xs" />
                <ReactECharts
                  option={chartOptions}
                  style={{ height: 120, width: '100%' }}
                  opts={{ renderer: 'svg' }}
                />
              </EuiPanel>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        {!isDsl && (
          <>
            <EuiSpacer size="m" />
            <EuiPanel data-test-subj={'query-details-searches'}>
              <EuiTitle size="s">
                <h2>Searches ({searches.length})</h2>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                <p>The searches this query ran. Its CPU time and memory usage include theirs.</p>
              </EuiText>
              <EuiHorizontalRule margin="xs" />
              <EuiInMemoryTable
                tableCaption="Searches this query ran"
                items={searches}
                columns={searchColumns}
                itemId="id"
                sorting={{ sort: { field: LATENCY, direction: 'desc' } }}
                pagination={{ initialPageSize: 10, pageSizeOptions: [10, 25, 50, 100] }}
                message="No searches were recorded for this query."
              />
            </EuiPanel>
          </>
        )}
      </EuiFlexItem>
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default QueryDetails;
