/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiInMemoryTable,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { filesize } from 'filesize';
import { RichLiveQueryRecord, TaskDetailRecord } from '../../../types/types';

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

interface Props {
  task: RichLiveQueryRecord;
  onClose: () => void;
  onViewTopN?: (topNId: string) => void;
  onRefresh: () => void;
  onKillQuery?: () => void;
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
  const querySource = (task as any)._source || (sourceMatch ? sourceMatch[1] : null);
  const totalShards = (task as any)._totalShards;
  const taskResourceUsages = (task as any)._taskResourceUsages;

  const isFinished = task.status === 'completed' || task.status === 'failed';
  const endTime = coord ? coord.start_time + coord.running_time_nanos / 1e6 : 0;

  const shardColumns = [
    { field: 'task_id', name: 'Task ID' },
    { field: 'node_id', name: 'Node ID', truncateText: true },
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

  return (
    <EuiFlyout onClose={onClose} size="l" ownFocus>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2>Task ID - {task.id}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty iconType="refresh" onClick={onRefresh} size="s">
                  Refresh
                </EuiButtonEmpty>
              </EuiFlexItem>
              {!isFinished && onKillQuery && (
                <EuiFlexItem grow={false}>
                  <EuiButton color="danger" onClick={onKillQuery} size="s" iconType="cross">
                    Kill Query
                  </EuiButton>
                </EuiFlexItem>
              )}
              {onViewTopN && (task as any)._topNId && (
                <EuiFlexItem grow={false}>
                  <EuiButton onClick={() => onViewTopN((task as any)._topNId)} size="s">
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
        <EuiTitle size="s">
          <h3>Task Summary</h3>
        </EuiTitle>
        <EuiHorizontalRule margin="xs" />
        <EuiFlexGrid columns={3}>
          <PanelItem label="Status" value={isFinished ? task.status : task.status} />
          <PanelItem label="Start Time" value={convertTime(task.start_time)} />
          {isFinished && endTime > 0 && <PanelItem label="End Time" value={convertTime(endTime)} />}
          <PanelItem label="Coordinator Node" value={coordinatorNode} />
          <PanelItem label="Search Type" value={searchType} />
          <PanelItem label="Indices" value={indices} />
          {(task as any)._topNId && <PanelItem label="Top N ID" value={(task as any)._topNId} />}
          {task.wlm_group_id && <PanelItem label="WLM Group" value={task.wlm_group_id} />}
          <PanelItem label="Time Elapsed" value={`${task.total_latency_millis} ms`} />
          <PanelItem label="CPU Usage" value={formatCpu(task.total_cpu_nanos)} />
          <PanelItem label="Memory Usage" value={formatMem(task.total_memory_bytes)} />
          {totalShards != null && <PanelItem label="Total Shards" value={totalShards} />}
        </EuiFlexGrid>

        <EuiSpacer size="l" />

        {/* Task Resource Usage */}
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

        {task.shard_tasks.length > 0 && (
          <>
            <EuiTitle size="xs">
              <h4>Shard Tasks</h4>
            </EuiTitle>
            <EuiHorizontalRule margin="xs" />
            <EuiInMemoryTable
              items={task.shard_tasks}
              columns={shardColumns}
              itemId="task_id"
              pagination={{ initialPageSize: 10, showPerPageOptions: false }}
            />
          </>
        )}

        {task.shard_tasks.length === 0 && !taskResourceUsages?.length && (
          <p>No active shard tasks at this moment. Refresh to update.</p>
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
                { name: 'Memory (bytes)', render: (t: any) => t.taskResourceUsage.memory_in_bytes },
              ]}
              itemId="taskId"
              pagination={{ initialPageSize: 10, showPerPageOptions: false }}
            />
          </>
        )}

        {/* Query Source */}
        {querySource && (
          <>
            <EuiSpacer size="l" />
            <EuiTitle size="s">
              <h3>Query Source</h3>
            </EuiTitle>
            <EuiHorizontalRule margin="xs" />
            <EuiCodeBlock
              language="json"
              paddingSize="m"
              fontSize="s"
              overflowHeight={400}
              isCopyable
            >
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(querySource), null, 2);
                } catch {
                  return querySource;
                }
              })()}
            </EuiCodeBlock>
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
