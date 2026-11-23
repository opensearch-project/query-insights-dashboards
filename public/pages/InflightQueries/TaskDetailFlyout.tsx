/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiBadge,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiInMemoryTable,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { filesize } from 'filesize';
import { RichLiveQueryRecord, SearchQueryRecord, TaskDetailRecord } from '../../../types/types';
import { QUERY_SOURCE_BADGE_COLORS, SEARCH_ACTION } from '../../utils/live-query-utils';

const PanelItem = ({ label, value }: { label: string; value: string | number }) => (
  <EuiFlexItem>
    <EuiDescriptionList compressed listItems={[{ title: <h4>{label}</h4>, description: value }]} />
  </EuiFlexItem>
);

const convertTime = (ms: number) => {
  const date = new Date(ms);
  const loc = date.toDateString().split(' ');
  return `${loc[1]} ${loc[2]}, ${loc[3]} @ ${date.toLocaleTimeString('en-US')}`;
};

const formatCpu = (nanos: number) => {
  if (!nanos) return '-';
  return `${(nanos / 1e6).toFixed(2)} ms`;
};

const formatMem = (bytes: number) => {
  if (!bytes) return '-';
  return filesize(bytes, { standard: 'jedec' }) as string;
};

// The task a finished query's search ran on its coordinator, and the tasks that search ran on
// shards, as Top N recorded them.
interface FinishedSearchTask {
  id: string;
  task_id: string;
  node_id: string;
  indices: string;
  latency_millis: number;
  cpu_nanos: number;
  memory_bytes: number;
}

interface FinishedShardTask {
  task_id: string;
  search_task_id: string;
  node_id: string;
  action: string;
  cpu_nanos: number;
  memory_bytes: number;
}

// A search's coordinator task is the one whose parent isn't listed: its parent is the query's own
// task. The rest are its shard tasks.
const tasksOfSearches = (searches: SearchQueryRecord[]) => {
  const searchTasks: FinishedSearchTask[] = [];
  const shardTasks: FinishedShardTask[] = [];
  searches.forEach((search) => {
    const tasks = search.task_resource_usages || [];
    const listed = new Set(tasks.map((t) => t.taskId));
    const coordinator = tasks.find((t) => !listed.has(t.parentTaskId));
    const searchTaskId = coordinator ? `${coordinator.nodeId}:${coordinator.taskId}` : '-';
    searchTasks.push({
      id: search.id,
      task_id: searchTaskId,
      node_id: coordinator?.nodeId || search.node_id || '-',
      indices: (search.indices || []).join(', ') || '-',
      latency_millis: search.measurements?.latency?.number ?? 0,
      cpu_nanos: coordinator?.taskResourceUsage.cpu_time_in_nanos ?? 0,
      memory_bytes: coordinator?.taskResourceUsage.memory_in_bytes ?? 0,
    });
    tasks
      .filter((t) => t !== coordinator)
      .forEach((t) =>
        shardTasks.push({
          task_id: `${t.nodeId}:${t.taskId}`,
          search_task_id: searchTaskId,
          node_id: t.nodeId,
          action: t.action,
          cpu_nanos: t.taskResourceUsage.cpu_time_in_nanos,
          memory_bytes: t.taskResourceUsage.memory_in_bytes,
        })
      );
  });
  return { searchTasks, shardTasks };
};

interface Props {
  task: RichLiveQueryRecord;
  onClose: () => void;
  onViewTopN?: (topNId: string) => void;
  onRefresh: () => void;
  onKillQuery?: () => void;
  // Whether the cluster version supports user info (Username / User Roles / Backend Roles).
  // Gates the user-info panel items so the flyout matches the table's version gate.
  userInfoSupported?: boolean;
  // The searches a finished PPL query ran, which Top N recorded with their tasks, and whether they
  // are still loading.
  finishedSearches?: SearchQueryRecord[];
  finishedSearchesLoading?: boolean;
}

const PHASE_DISPLAY: Record<string, string> = {
  query: 'Query',
  fetch: 'Fetch',
  'fetch/id': 'Fetch (ID)',
  'fetch/scroll': 'Fetch (Scroll)',
  dfs: 'DFS',
  dfs_pre_query: 'DFS Pre-Query',
  dfs_query: 'DFS Query',
  expand: 'Expand',
  can_match: 'Can Match',
};

export const TaskDetailFlyout: React.FC<Props> = ({
  task,
  onClose,
  onViewTopN,
  onRefresh,
  onKillQuery,
  userInfoSupported = false,
  finishedSearches,
  finishedSearchesLoading = false,
}) => {
  const coord = task.coordinator_task;
  const desc = coord?.description || '';
  const indexMatch = desc.match(/indices\[([^\]]+)\]/);
  const searchTypeMatch = desc.match(/search_type\[([^\]]+)\]/);
  const sourceMatch = desc.match(/source\[(.+)\]/s);

  const indices = (task as any)._indices || (indexMatch ? indexMatch[1] : '-');
  const searchType =
    (task as any)._searchType?.replace(/_/g, ' ') ||
    (searchTypeMatch ? searchTypeMatch[1].replace(/_/g, ' ') : '-');
  const coordinatorNode = (task as any)._nodeId || coord?.node_id || '-';
  // A PPL query's source is its query text. Its tasks are the searches it runs and their shard
  // tasks, which the flyout lists apart.
  const { _querySource, _queryText } = task as RichLiveQueryRecord & {
    _querySource?: string;
    _queryText?: string;
  };
  const isPpl = _querySource === 'PPL';
  // As in the table: a query that names no source is a DSL search. The badge sits by the title, as
  // the flyout's Query Source panel holds a search's body.
  const querySourceLabel = _querySource || 'DSL';
  const querySource = isPpl
    ? _queryText || null
    : (task as any)._source || (sourceMatch ? sourceMatch[1] : null);
  const childSearchTasks = isPpl ? task.shard_tasks.filter((t) => t.action === SEARCH_ACTION) : [];
  const shardTasks = isPpl
    ? task.shard_tasks.filter((t) => t.action !== SEARCH_ACTION)
    : task.shard_tasks;
  const totalShards = (task as any)._totalShards;
  const taskResourceUsages = (task as any)._taskResourceUsages;

  const isFinished =
    task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled';
  const endTime = coord ? coord.start_time + coord.running_time_nanos / 1e6 : 0;

  // A running PPL query runs its searches one at a time, with gaps between them, and a search's tasks
  // are listed only while it runs. The ones it has finished are counted apart.
  const searchesSoFar = isPpl && !isFinished ? task.finished_searches : undefined;

  // A finished PPL query's searches no longer run; the flyout lists the tasks Top N recorded.
  const finishedPpl = isPpl && isFinished;
  const finishedTasks = useMemo(() => tasksOfSearches(finishedSearches || []), [finishedSearches]);
  const searchCount = finishedTasks.searchTasks.length;
  const finishedNote =
    searchCount > 0
      ? `This query has finished. Its CPU and memory include the ${
          searchCount === 1 ? 'search' : `${searchCount.toLocaleString()} searches`
        } it ran.`
      : `This query has finished. Its CPU and memory include the searches it ran.${
          finishedSearches && !finishedSearchesLoading ? ' Top N has no record of them.' : ''
        }`;

  const shardColumns = [
    { field: 'task_id', name: 'Task ID' },
    { field: 'node_id', name: 'Node ID', truncateText: true },
    {
      name: 'Shard',
      render: (t: TaskDetailRecord) => {
        const match = t.description?.match(/shardId\[\[([^\]]+)\]\[(\d+)\]\]/);
        return match ? `${match[1]}[${match[2]}]` : '-';
      },
    },
    {
      name: 'Phase',
      render: (t: TaskDetailRecord) => {
        const match = t.action.match(/\[([^\]]+)\]/);
        const raw = match ? match[1].replace('phase/', '') : t.action;
        return PHASE_DISPLAY[raw] ?? raw;
      },
    },
    { name: 'CPU Time (ms)', render: (t: TaskDetailRecord) => (t.cpu_nanos / 1e6).toFixed(2) },
    { name: 'Memory (bytes)', render: (t: TaskDetailRecord) => t.memory_bytes },
  ];

  // A PPL query's searches have no shard or phase; each shows the indices it reads.
  const childSearchColumns = [
    { field: 'task_id', name: 'Task ID' },
    { field: 'node_id', name: 'Node ID', truncateText: true },
    {
      name: 'Indices',
      render: (t: TaskDetailRecord) => t.description?.match(/indices\[([^\]]+)\]/)?.[1] ?? '-',
    },
    { name: 'CPU Time (ms)', render: (t: TaskDetailRecord) => (t.cpu_nanos / 1e6).toFixed(2) },
    { name: 'Memory (bytes)', render: (t: TaskDetailRecord) => t.memory_bytes },
  ];

  // A finished search also has its latency. Its shard tasks name the search task they ran for,
  // since Top N doesn't record their shards.
  const finishedSearchColumns = [
    { field: 'task_id', name: 'Task ID' },
    { field: 'node_id', name: 'Node ID', truncateText: true },
    { field: 'indices', name: 'Indices' },
    { field: 'latency_millis', name: 'Latency (ms)', sortable: true },
    {
      field: 'cpu_nanos',
      name: 'CPU Time (ms)',
      sortable: true,
      render: (nanos: number) => (nanos / 1e6).toFixed(2),
    },
    { field: 'memory_bytes', name: 'Memory (bytes)', sortable: true },
  ];

  const finishedShardColumns = [
    { field: 'task_id', name: 'Task ID' },
    { field: 'search_task_id', name: 'Search Task ID' },
    { field: 'node_id', name: 'Node ID', truncateText: true },
    {
      field: 'action',
      name: 'Phase',
      render: (action: string) => {
        const match = action.match(/\[([^\]]+)\]/);
        const raw = match ? match[1].replace('phase/', '') : action;
        return PHASE_DISPLAY[raw] ?? raw;
      },
    },
    {
      field: 'cpu_nanos',
      name: 'CPU Time (ms)',
      sortable: true,
      render: (nanos: number) => (nanos / 1e6).toFixed(2),
    },
    { field: 'memory_bytes', name: 'Memory (bytes)', sortable: true },
  ];

  return (
    <EuiFlyout onClose={onClose} size="l" ownFocus>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="m">
                  <h2>Task ID - {task.id}</h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge
                  data-test-subj="task-detail-query-source"
                  color={QUERY_SOURCE_BADGE_COLORS[querySourceLabel] ?? 'hollow'}
                >
                  {querySourceLabel}
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              {!isFinished && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty iconType="refresh" onClick={onRefresh} size="s">
                    Refresh
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
              {!isFinished && onKillQuery && (
                <EuiFlexItem grow={false}>
                  <EuiButton color="danger" onClick={onKillQuery} size="s" iconType="cross">
                    Kill Query
                  </EuiButton>
                </EuiFlexItem>
              )}
              {isFinished && onViewTopN && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    onClick={() => onViewTopN((task as any)._topNId || task.id)}
                    size="s"
                    iconType="inspect"
                    fill
                  >
                    View Top N
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {/* Task Summary */}
        <EuiPanel>
          <EuiTitle size="s">
            <h3>Task Summary</h3>
          </EuiTitle>
          <EuiHorizontalRule margin="xs" />
          <EuiFlexGrid columns={3}>
            <EuiFlexItem>
              <EuiDescriptionList
                compressed
                listItems={[
                  {
                    title: <h4>Status</h4>,
                    description: (
                      <EuiBadge
                        color={
                          task.status === 'failed' || task.status === 'cancelled'
                            ? 'danger'
                            : task.status === 'completed'
                              ? 'success'
                              : 'primary'
                        }
                      >
                        {task.status}
                      </EuiBadge>
                    ),
                  },
                ]}
              />
            </EuiFlexItem>
            <PanelItem label="Start Time" value={convertTime(task.start_time)} />
            {isFinished && endTime > 0 && (
              <PanelItem label="End Time" value={convertTime(endTime)} />
            )}
            <PanelItem label="Coordinator Node" value={coordinatorNode} />
            {/* A PPL query isn't a search; each search it runs has its own type. */}
            {!isPpl && <PanelItem label="Search Type" value={searchType} />}
            <PanelItem label="Indices" value={indices} />
            {(task as any)._topNId && <PanelItem label="Top N ID" value={(task as any)._topNId} />}
            {task.wlm_group_id && <PanelItem label="WLM Group" value={task.wlm_group_id} />}
            {userInfoSupported && task.username && (
              <PanelItem label="Username" value={task.username} />
            )}
            {userInfoSupported && task.user_roles && task.user_roles.length > 0 && (
              <PanelItem label="User Roles" value={task.user_roles.join(', ')} />
            )}
            {userInfoSupported && task.backend_roles && task.backend_roles.length > 0 && (
              <PanelItem label="Backend Roles" value={task.backend_roles.join(', ')} />
            )}
            <PanelItem label="Time Elapsed" value={`${task.total_latency_millis} ms`} />
            <PanelItem label="CPU Usage" value={formatCpu(task.total_cpu_nanos)} />
            <PanelItem label="Memory Usage" value={formatMem(task.total_memory_bytes)} />
            {totalShards != null && <PanelItem label="Total Shards" value={totalShards} />}
          </EuiFlexGrid>
        </EuiPanel>

        <EuiSpacer size="m" />

        {/* Task Resource Usage */}
        <EuiPanel>
          <EuiTitle size="s">
            <h3>Task Resource Usage</h3>
          </EuiTitle>
          <EuiHorizontalRule margin="xs" />

          {coord && (
            <>
              <EuiTitle size="xs">
                <h4>Coordinator Task</h4>
              </EuiTitle>
              <EuiFlexGrid columns={4}>
                <PanelItem label="Task ID" value={coord.task_id} />
                <PanelItem label="Node ID" value={coord.node_id} />
                <PanelItem label="CPU Time (ms)" value={(coord.cpu_nanos / 1e6).toFixed(2)} />
                <PanelItem label="Memory (bytes)" value={coord.memory_bytes} />
              </EuiFlexGrid>
              <EuiSpacer size="m" />
            </>
          )}

          {searchesSoFar && searchesSoFar.count > 0 && (
            <div data-test-subj="task-detail-finished-searches">
              <EuiTitle size="xs">
                <h4>Finished Searches</h4>
              </EuiTitle>
              <p>
                {`${searchesSoFar.count.toLocaleString()} ${
                  searchesSoFar.count === 1 ? 'search has' : 'searches have'
                } finished so far. Their CPU and memory are part of this query's usage.`}
              </p>
              <EuiFlexGrid columns={4}>
                <PanelItem label="Searches" value={searchesSoFar.count.toLocaleString()} />
                <PanelItem
                  label="CPU Time (ms)"
                  value={(searchesSoFar.cpu_nanos / 1e6).toFixed(2)}
                />
                <PanelItem label="Memory (bytes)" value={searchesSoFar.memory_bytes} />
              </EuiFlexGrid>
              <EuiSpacer size="m" />
            </div>
          )}

          {childSearchTasks.length > 0 && (
            <>
              <EuiTitle size="xs">
                <h4>Child Search Tasks</h4>
              </EuiTitle>
              <EuiHorizontalRule margin="xs" />
              <EuiInMemoryTable
                tableCaption="Child search tasks"
                items={childSearchTasks}
                columns={childSearchColumns}
                itemId="task_id"
                pagination={{ initialPageSize: 10, showPerPageOptions: false }}
              />
              <EuiSpacer size="m" />
            </>
          )}

          {shardTasks.length > 0 && (
            <>
              <EuiTitle size="xs">
                <h4>Shard Tasks</h4>
              </EuiTitle>
              <EuiHorizontalRule margin="xs" />
              <EuiInMemoryTable
                tableCaption="Shard tasks"
                items={shardTasks}
                columns={shardColumns}
                itemId="task_id"
                pagination={{ initialPageSize: 10, showPerPageOptions: false }}
              />
            </>
          )}

          {task.shard_tasks.length === 0 && !taskResourceUsages?.length && !finishedPpl && (
            <p>
              {isPpl
                ? 'No searches running at this moment. Refresh to update.'
                : 'No active shard tasks at this moment. Refresh to update.'}
            </p>
          )}

          {finishedPpl && (
            <>
              <p>{finishedNote}</p>
              <EuiSpacer size="s" />
              {finishedSearchesLoading && (
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiLoadingSpinner size="m" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <p>Loading the searches it ran from Top N</p>
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}
              {!finishedSearchesLoading && searchCount > 0 && (
                <>
                  <EuiTitle size="xs">
                    <h4>Child Search Tasks</h4>
                  </EuiTitle>
                  <EuiHorizontalRule margin="xs" />
                  <EuiInMemoryTable
                    tableCaption="Child search tasks"
                    items={finishedTasks.searchTasks}
                    columns={finishedSearchColumns}
                    itemId="id"
                    sorting={true}
                    pagination={{ initialPageSize: 10, showPerPageOptions: false }}
                  />
                  <EuiSpacer size="m" />
                  {finishedTasks.shardTasks.length > 0 && (
                    <>
                      <EuiTitle size="xs">
                        <h4>Shard Tasks</h4>
                      </EuiTitle>
                      <EuiHorizontalRule margin="xs" />
                      <EuiInMemoryTable
                        tableCaption="Shard tasks"
                        items={finishedTasks.shardTasks}
                        columns={finishedShardColumns}
                        itemId="task_id"
                        sorting={true}
                        pagination={{ initialPageSize: 10, showPerPageOptions: false }}
                      />
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* Finished query task resource usages (old format) */}
          {taskResourceUsages?.length > 0 && task.shard_tasks.length === 0 && (
            <>
              <EuiTitle size="xs">
                <h4>Coordinator Task</h4>
              </EuiTitle>
              <EuiHorizontalRule margin="xs" />
              {taskResourceUsages
                .filter((t: any) => t.parentTaskId === -1)
                .map((t: any) => (
                  <EuiFlexGrid columns={4} key={t.taskId}>
                    <PanelItem label="Task ID" value={t.taskId} />
                    <PanelItem label="Node ID" value={t.nodeId} />
                    <PanelItem
                      label="CPU Time (ms)"
                      value={(t.taskResourceUsage.cpu_time_in_nanos / 1e6).toFixed(2)}
                    />
                    <PanelItem label="Memory (bytes)" value={t.taskResourceUsage.memory_in_bytes} />
                  </EuiFlexGrid>
                ))}
              <EuiSpacer size="m" />
              <EuiTitle size="xs">
                <h4>Shard Tasks</h4>
              </EuiTitle>
              <EuiHorizontalRule margin="xs" />
              <EuiInMemoryTable
                items={taskResourceUsages.filter((t: any) => t.parentTaskId !== -1)}
                columns={[
                  { field: 'taskId', name: 'Task ID' },
                  { field: 'nodeId', name: 'Node ID', truncateText: true },
                  {
                    field: 'action',
                    name: 'Phase',
                    render: (action: string) => {
                      const m = action.match(/\[([^\]]+)\]/);
                      const raw = m ? m[1].replace('phase/', '') : action;
                      return PHASE_DISPLAY[raw] ?? raw;
                    },
                  },
                  {
                    name: 'CPU Time (ms)',
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
            </>
          )}
        </EuiPanel>

        {/* Query Source */}
        {querySource && (
          <>
            <EuiSpacer size="m" />
            <EuiPanel>
              <EuiTitle size="s">
                <h3>{isPpl ? 'PPL Query' : 'Query Source'}</h3>
              </EuiTitle>
              <EuiHorizontalRule margin="xs" />
              <EuiCodeBlock
                language={isPpl ? undefined : 'json'}
                paddingSize="m"
                fontSize="s"
                overflowHeight={400}
                isCopyable
              >
                {(() => {
                  if (isPpl) return String(querySource);
                  try {
                    if (typeof querySource === 'object')
                      return JSON.stringify(querySource, null, 2);
                    return JSON.stringify(JSON.parse(querySource), null, 2);
                  } catch {
                    return String(querySource);
                  }
                })()}
              </EuiCodeBlock>
            </EuiPanel>
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
