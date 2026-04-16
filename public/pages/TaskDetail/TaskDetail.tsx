/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiInMemoryTable,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { useHistory, useLocation } from 'react-router-dom';
import { AppMountParameters, CoreStart } from 'opensearch-dashboards/public';
import { DataSourceManagementPluginSetup } from 'src/plugins/data_source_management/public';
import { Duration } from 'luxon';
import { filesize } from 'filesize';
import { RichLiveQueryRecord, TaskDetailRecord, FinishedQueryRecord } from '../../../types/types';
import { retrieveLiveQueries } from '../../../common/utils/QueryUtils';
import { API_ENDPOINTS } from '../../../common/utils/apiendpoints';
import { DataSourceContext, QUERY_INSIGHTS } from '../TopNQueries/TopNQueries';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';
import { QueryInsightsDataSourceMenu } from '../../components/DataSourcePicker';
import { PageHeader } from '../../components/PageHeader';

const PanelItem = ({ label, value }: { label: string; value: string | number }) => (
  <EuiFlexItem>
    <EuiDescriptionList compressed listItems={[{ title: <h4>{label}</h4>, description: value }]} />
  </EuiFlexItem>
);

const formatTime = (nanos: number | undefined): string => {
  if (nanos == null || isNaN(nanos)) return '-';
  const ms = nanos / 1e6;
  if (ms < 1) return '< 1 ms';
  const dur = Duration.fromMillis(ms);
  if (ms < 1000) return `${ms.toFixed(2)} ms`;
  return dur.toFormat("m 'min' s.SS 's'");
};

const formatMemory = (bytes: number | undefined): string => {
  if (bytes == null || isNaN(bytes)) return '-';
  return filesize(bytes, { standard: 'jedec' }) as string;
};

const convertTime = (unixTime: number) => {
  const date = new Date(unixTime);
  const loc = date.toDateString().split(' ');
  return `${loc[1]} ${loc[2]}, ${loc[3]} @ ${date.toLocaleTimeString('en-US')}`;
};

const TaskDetail = ({
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
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const taskId = searchParams.get('taskId');

  const [liveTask, setLiveTask] = useState<RichLiveQueryRecord | null>(null);
  const [finishedTask, setFinishedTask] = useState<FinishedQueryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const history = useHistory();
  const { dataSource, setDataSource } = useContext(DataSourceContext)!;

  const fetchTask = useCallback(async () => {
    setLoading(true);
    try {
      const response = await retrieveLiveQueries(core, dataSource?.id, undefined, true);
      const liveQueries = response?.response?.live_queries || [];
      const finishedQueries = response?.response?.finished_queries || [];

      const foundLive = liveQueries.find((q) => q.id === taskId);
      const foundFinished = finishedQueries.find((q) => q.id === taskId);

      setLiveTask(foundLive || null);
      setFinishedTask(foundFinished || null);
    } catch (e) {
      console.error('Failed to fetch task details:', e);
    }
    setLoading(false);
  }, [core, dataSource?.id, taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

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
      {
        text: 'Live queries',
        href: '/LiveQueries',
        onClick: (e) => {
          e.preventDefault();
          history.push('/LiveQueries');
        },
      },
      { text: `Task ID: ${taskId || ''}` },
    ]);
  }, [core.chrome, history, taskId]);

  const handleCancel = async () => {
    if (!taskId) return;
    try {
      await core.http.post(API_ENDPOINTS.CANCEL_TASK(taskId));
      fetchTask();
    } catch (e) {
      console.error('Failed to cancel task:', e);
    }
  };

  const navigateToTopN = (topNId: string) => {
    const now = new Date().toISOString();
    const from = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    history.push(
      `/query-details?from=${encodeURIComponent(from)}&to=${encodeURIComponent(
        now
      )}&id=${encodeURIComponent(topNId)}&verbose=true`
    );
  };

  // Shard tasks table columns
  const shardColumns = [
    { field: 'task_id', name: 'Task ID' },
    { field: 'node_id', name: 'Node ID', truncateText: true },
    {
      field: 'action',
      name: 'Phase',
      render: (action: string) => {
        const match = action.match(/\[([^\]]+)\]/);
        const raw = match ? match[1].replace('phase/', '') : action;
        const PHASE_DISPLAY: Record<string, string> = {
          query: 'Query',
          fetch: 'Fetch',
          'fetch/id': 'Fetch (ID)',
          dfs: 'DFS',
          expand: 'Expand',
          can_match: 'Can Match',
        };
        return PHASE_DISPLAY[raw] ?? raw;
      },
    },
    { field: 'status', name: 'Status' },
    { name: 'CPU Time (ms)', render: (t: TaskDetailRecord) => (t.cpu_nanos / 1e6).toFixed(2) },
    { name: 'Memory (bytes)', render: (t: TaskDetailRecord) => t.memory_bytes },
  ];

  return (
    <div>
      <PageHeader
        coreStart={core}
        depsStart={depsStart}
        fallBackComponent={
          <>
            <EuiTitle size="l">
              <h1>Task ID - {taskId}</h1>
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
        onSelectedDataSource={fetchTask}
        dataSourcePickerReadOnly={true}
      />
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType="refresh" onClick={fetchTask}>
            Refresh
          </EuiButtonEmpty>
        </EuiFlexItem>
        {liveTask && liveTask.status !== 'cancelled' && (
          <EuiFlexItem grow={false}>
            <EuiButton color="danger" onClick={handleCancel} iconType="cross">
              Kill Query
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />

      {loading && (
        <EuiTitle size="s">
          <h2>Loading...</h2>
        </EuiTitle>
      )}

      {!loading && !liveTask && !finishedTask && (
        <EuiPanel>
          <EuiTitle size="s">
            <h2>Task not found</h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          <p>
            The task may have completed and left the cache. Check Top N queries for historical
            details.
          </p>
          <EuiSpacer size="m" />
          <EuiButton onClick={() => history.push(QUERY_INSIGHTS)}>View Top N Queries</EuiButton>
        </EuiPanel>
      )}

      {/* Finished query — show summary and link to Top N */}
      {!loading && finishedTask && (
        <>
          <EuiPanel data-test-subj="task-detail-summary">
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h2>Task Summary (Completed)</h2>
                </EuiTitle>
              </EuiFlexItem>
              {finishedTask.top_n_id && (
                <EuiFlexItem grow={false}>
                  <EuiButton onClick={() => navigateToTopN(finishedTask.top_n_id!)}>
                    View in Top N Queries
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            <EuiHorizontalRule margin="xs" />
            <EuiFlexGrid columns={4}>
              <PanelItem
                label="Status"
                value={finishedTask.status || (finishedTask.failed ? 'Failed' : 'Completed')}
              />
              <PanelItem label="Timestamp" value={convertTime(finishedTask.timestamp)} />
              <PanelItem label="Indices" value={finishedTask.indices?.join(', ') || '-'} />
              <PanelItem
                label="Search Type"
                value={(finishedTask.search_type || '-').replace(/_/g, ' ')}
              />
              <PanelItem label="Node ID" value={finishedTask.node_id || '-'} />
              <PanelItem label="Total Shards" value={finishedTask.total_shards || '-'} />
              {finishedTask.wlm_group_id && (
                <PanelItem label="WLM Group" value={finishedTask.wlm_group_id} />
              )}
              {finishedTask.top_n_id && (
                <PanelItem label="Top N Query ID" value={finishedTask.top_n_id} />
              )}
            </EuiFlexGrid>
          </EuiPanel>
          <EuiSpacer size="m" />
          {finishedTask.task_resource_usages?.length > 0 && (
            <EuiPanel>
              <EuiTitle size="s">
                <h2>Task Resource Usage</h2>
              </EuiTitle>
              <EuiHorizontalRule margin="xs" />
              <EuiInMemoryTable
                items={finishedTask.task_resource_usages}
                columns={[
                  { field: 'taskId', name: 'Task ID' },
                  { field: 'nodeId', name: 'Node ID', truncateText: true },
                  { field: 'action', name: 'Action' },
                  {
                    name: 'CPU (ms)',
                    render: (t: any) => (t.taskResourceUsage.cpu_time_in_nanos / 1e6).toFixed(2),
                  },
                  {
                    name: 'Memory (bytes)',
                    render: (t: any) => t.taskResourceUsage.memory_in_bytes,
                  },
                ]}
                itemId="taskId"
                pagination={{ initialPageSize: 10, showPerPageOptions: false }}
              />
            </EuiPanel>
          )}
        </>
      )}

      {/* Live query — show real-time task details */}
      {!loading && liveTask && !finishedTask && (
        <>
          <EuiPanel data-test-subj="task-detail-summary">
            <EuiTitle size="s">
              <h2>Task Summary</h2>
            </EuiTitle>
            <EuiHorizontalRule margin="xs" />
            <EuiFlexGrid columns={4}>
              <PanelItem label="Status" value={liveTask.status} />
              <PanelItem label="Start Time" value={convertTime(liveTask.start_time)} />
              <PanelItem
                label="Coordinator Node"
                value={liveTask.coordinator_task?.node_id || '-'}
              />
              <PanelItem label="Time Elapsed" value={`${liveTask.total_latency_millis} ms`} />
              <PanelItem label="CPU Usage" value={formatTime(liveTask.total_cpu_nanos)} />
              <PanelItem label="Memory Usage" value={formatMemory(liveTask.total_memory_bytes)} />
              {liveTask.wlm_group_id && (
                <PanelItem label="WLM Group" value={liveTask.wlm_group_id} />
              )}
            </EuiFlexGrid>
          </EuiPanel>

          <EuiSpacer size="m" />

          <EuiPanel data-test-subj="task-detail-resource-usage">
            <EuiTitle size="s">
              <h2>Task Resource Usage</h2>
            </EuiTitle>
            <EuiHorizontalRule margin="xs" />
            {liveTask.coordinator_task && (
              <>
                <EuiTitle size="xs">
                  <h3>Coordinator Task</h3>
                </EuiTitle>
                <EuiHorizontalRule margin="xs" />
                <EuiFlexGrid columns={4}>
                  <PanelItem label="Task ID" value={liveTask.coordinator_task.task_id} />
                  <PanelItem label="Node ID" value={liveTask.coordinator_task.node_id} />
                  <PanelItem
                    label="CPU Time (ms)"
                    value={(liveTask.coordinator_task.cpu_nanos / 1e6).toFixed(2)}
                  />
                  <PanelItem
                    label="Memory (bytes)"
                    value={liveTask.coordinator_task.memory_bytes}
                  />
                </EuiFlexGrid>
                <EuiSpacer size="m" />
              </>
            )}
            {liveTask.shard_tasks.length > 0 ? (
              <>
                <EuiTitle size="xs">
                  <h3>Shard Tasks</h3>
                </EuiTitle>
                <EuiHorizontalRule margin="xs" />
                <EuiInMemoryTable
                  items={liveTask.shard_tasks}
                  columns={shardColumns}
                  itemId="task_id"
                  pagination={{ initialPageSize: 10, showPerPageOptions: false }}
                />
              </>
            ) : (
              <p>No active shard tasks at this moment. Refresh to update.</p>
            )}
          </EuiPanel>

          <EuiSpacer size="m" />

          {liveTask.coordinator_task?.description && (
            <EuiPanel data-test-subj="task-detail-query-source">
              <EuiTitle size="s">
                <h2>Query Source</h2>
              </EuiTitle>
              <EuiHorizontalRule margin="xs" />
              <EuiCodeBlock
                language="json"
                paddingSize="m"
                fontSize="s"
                overflowHeight={600}
                isCopyable
              >
                {(() => {
                  const desc = liveTask.coordinator_task!.description;
                  const sourceMatch = desc.match(/source\[(.+)\]/s);
                  if (!sourceMatch) return desc;
                  try {
                    return JSON.stringify(JSON.parse(sourceMatch[1]), null, 2);
                  } catch {
                    return sourceMatch[1];
                  }
                })()}
              </EuiCodeBlock>
            </EuiPanel>
          )}
        </>
      )}
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default TaskDetail;
