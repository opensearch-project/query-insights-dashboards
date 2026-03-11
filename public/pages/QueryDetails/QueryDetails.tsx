/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useContext, useEffect, useState } from 'react';
// @ts-ignore
import Plotly from 'plotly.js-dist';
import {
  EuiInMemoryTable,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
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
import { retrieveQueryById } from '../../../common/utils/QueryUtils';
import { QueryInsightsDataSourceMenu } from '../../components/DataSourcePicker';
import { formatQueryDisplay } from '../../utils/query-formatter-utils';
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
    const retrievedQuery = await retrieveQueryById(
      core,
      getDataSourceFromUrl().id,
      from,
      to,
      id,
      verbose
    );
    setQuery(retrievedQuery);
  };

  useEffect(() => {
    if (id && from && to && verbose != null) {
      fetchQueryDetails();
    }
  }, [id, from, to, verbose]);

  useEffect(() => {
    getVersionOnce(getDataSourceFromUrl().id || '').then((version) => {
      setWlmSupported(isVersion33OrHigher(version));
      setStatusSupported(isVersion36OrHigher(version));
      setUserInfoSupported(isVersion35OrHigher(version));
    });
  }, [dataSource?.id]);

  // Initialize the Plotly chart
  const initPlotlyChart = useCallback(() => {
    const latencies: number[] = Object.values(query?.phase_latency_map || [0, 0, 0]);
    const data = [
      {
        x: latencies.reverse(),
        y: ['Fetch    ', 'Query    ', 'Expand    '],
        type: 'bar',
        orientation: 'h',
        width: 0.5,
        marker: { color: ['#F990C0', '#1BA9F5', '#7DE2D1'] },
        base: [latencies[2] + latencies[1], latencies[2], 0],
        text: latencies.map((value) => `${value}ms`),
        textposition: 'outside',
        cliponaxis: false,
      },
    ];
    const layout = {
      autosize: true,
      margin: { l: 80, r: 80, t: 25, b: 15, pad: 0 },
      height: 120,
      xaxis: {
        side: 'top',
        zeroline: false,
        ticksuffix: 'ms',
        autorangeoptions: { clipmin: 0 },
        tickfont: { color: '#535966' },
        linecolor: '#D4DAE5',
        gridcolor: '#D4DAE5',
      },
      yaxis: { linecolor: '#D4DAE5' },
    };
    const config = { responsive: true };
    Plotly.newPlot('latency', data, layout, config);
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
      initPlotlyChart();
    }
  }, [query, history, core.chrome, convertTime, initPlotlyChart]);

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
                .filter((t) => t.parentTaskId === -1)
                .map((t) => renderCoordinatorSummary(t))}
              <EuiSpacer size="m" />
              <EuiTitle size="xs">
                <h3>Shard Tasks</h3>
              </EuiTitle>
              <EuiHorizontalRule margin="xs" />
              <EuiInMemoryTable
                items={query.task_resource_usages.filter((t) => t.parentTaskId !== -1)}
                columns={shardColumns}
                itemId="taskId"
                pagination={{ initialPageSize: 10, showPerPageOptions: false }}
              />
            </EuiPanel>
            <EuiSpacer size="m" />
          </>
        )}
        <EuiFlexGrid columns={2}>
          <EuiFlexItem grow={1}>
            <EuiPanel data-test-subj={'query-details-source-section'}>
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h2>Query</h2>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiHorizontalRule margin="xs" />
              <EuiSpacer size="xs" />
              <EuiCodeBlock
                language="jsx"
                paddingSize="m"
                fontSize="s"
                overflowHeight={600}
                isCopyable
              >
                {queryDisplay}
              </EuiCodeBlock>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem grow={1} style={{ alignSelf: 'start' }}>
            <EuiPanel data-test-subj={'query-details-latency-chart'}>
              <EuiTitle size="xs">
                <h2>Latency</h2>
              </EuiTitle>
              <EuiHorizontalRule margin="xs" />
              <div id="latency" />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGrid>
      </EuiFlexItem>
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default QueryDetails;
