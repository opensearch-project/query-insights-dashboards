/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiBasicTable,
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
  EuiPanel,
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

  const queryLanguage = (task as any).labels?.['parent_id'] ? undefined : (task as any).labels?.['x-query-source'];
  const originalQuery = (task as any).labels?.['parent_id'] ? undefined : (task as any).labels?.['x-original-query'];

  const isFinished =
    task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled';
  const endTime = coord ? coord.start_time + coord.running_time_nanos / 1e6 : 0;

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
            <PanelItem label="Search Type" value={searchType} />
            <PanelItem label="Indices" value={indices} />
            <EuiFlexItem>
              <EuiDescriptionList
                compressed
                listItems={[{
                  title: <h4>Query Type</h4>,
                  description: (() => {
                    const parentId = (task as any).labels?.['parent_id'];
                    const source = (task as any).labels?.['x-query-source'];
                    if (parentId) return <EuiBadge color="hollow">DSL (Derived)</EuiBadge>;
                    if (source === 'sql') return <EuiBadge color="#0079A5">SQL</EuiBadge>;
                    if (source === 'ppl') return <EuiBadge color="#7B61FF">PPL</EuiBadge>;
                    return <EuiBadge color="hollow">DSL</EuiBadge>;
                  })(),
                }]}
              />
            </EuiFlexItem>
            {(task as any).labels?.['parent_id'] && (
              <EuiFlexItem>
                <EuiDescriptionList
                  compressed
                  listItems={[{
                    title: <h4>Derived From</h4>,
                    description: (() => {
                      const parentId = (task as any).labels['parent_id'];
                      const source = (task as any).labels?.['x-query-source'];
                      const badge = source === 'sql' ? 'SQL' : source === 'ppl' ? 'PPL' : 'Query';
                      return (
                        <EuiBadge color={source === 'sql' ? '#0079A5' : source === 'ppl' ? '#7B61FF' : 'hollow'}>
                          {badge}: {parentId}
                        </EuiBadge>
                      );
                    })(),
                  }]}
                />
              </EuiFlexItem>
            )}
            {(task as any)._topNId && <PanelItem label="Top N ID" value={(task as any)._topNId} />}
            {task.wlm_group_id && <PanelItem label="WLM Group" value={task.wlm_group_id} />}
            <PanelItem label="Time Elapsed" value={`${task.total_latency_millis} ms`} />
            <PanelItem label="CPU Usage" value={formatCpu(task.total_cpu_nanos)} />
            <PanelItem label="Memory Usage" value={formatMem(task.total_memory_bytes)} />
            {totalShards != null && <PanelItem label="Total Shards" value={totalShards} />}
          </EuiFlexGrid>
        </EuiPanel>

        <EuiSpacer size="m" />

        {/* Task Resource Usage — hidden for SQL/PPL parent queries */}
        {!queryLanguage && (
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
        )}

        {/* Original SQL/PPL Query */}
        {queryLanguage && originalQuery && (
          <>
            <EuiSpacer size="m" />
            <EuiPanel>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiTitle size="s">
                    <h3>Original Query</h3>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color={queryLanguage === 'sql' ? '#0079A5' : '#7B61FF'}>
                    {queryLanguage.toUpperCase()}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiHorizontalRule margin="xs" />
              <EuiCodeBlock
                language="sql"
                paddingSize="m"
                fontSize="s"
                overflowHeight={300}
                isCopyable
              >
                {originalQuery}
              </EuiCodeBlock>
            </EuiPanel>
          </>
        )}

        {/* DSL Query Body */}
        {queryLanguage && (task as any).labels?.['x-query-phases'] && (
          <>
            <EuiSpacer size="m" />
            <EuiPanel>
              <EuiTitle size="s">
                <h3>SQL Processing Phases</h3>
              </EuiTitle>
              <EuiHorizontalRule margin="xs" />
              <EuiBasicTable
                items={(() => {
                  const phasesStr = (task as any).labels?.['x-query-phases'] || '';
                  const phases: Record<string, Record<string, number>> = {};
                  try {
                    for (const part of phasesStr.split(',')) {
                      const segments = part.split('|');
                      const [name, timeStr] = segments[0].split(':');
                      const metrics: Record<string, number> = { time: parseInt(timeStr, 10) };
                      for (let i = 1; i < segments.length; i++) {
                        const [k, v] = segments[i].split(':');
                        metrics[k] = parseInt(v, 10);
                      }
                      phases[name] = metrics;
                    }
                  } catch { /* ignore parse errors */ }
                  const rows = [];
                  if (phases.parse) rows.push({ phase: 'Parse', time: (phases.parse.time / 1e6).toFixed(2), cpu: phases.parse.cpu ? (phases.parse.cpu / 1e6).toFixed(2) : '-', memory: phases.parse.mem ? (phases.parse.mem / 1024).toFixed(2) : '-' });
                  if (phases.analyze) rows.push({ phase: 'Analyze', time: (phases.analyze.time / 1e6).toFixed(2), cpu: phases.analyze.cpu ? (phases.analyze.cpu / 1e6).toFixed(2) : '-', memory: phases.analyze.mem ? (phases.analyze.mem / 1024).toFixed(2) : '-' });
                  if (phases.plan) rows.push({ phase: 'Plan', time: (phases.plan.time / 1e6).toFixed(2), cpu: phases.plan.cpu ? (phases.plan.cpu / 1e6).toFixed(2) : '-', memory: phases.plan.mem ? (phases.plan.mem / 1024).toFixed(2) : '-' });
                  // Execution row: total measurements minus SQL overhead
                  const totalLatency = (task as any).total_latency_millis || ((task as any).measurements?.latency?.number) || 0;
                  const totalCpu = (task as any).total_cpu_nanos || ((task as any).measurements?.cpu?.number) || 0;
                  const totalMem = (task as any).total_memory_bytes || ((task as any).measurements?.memory?.number) || 0;
                  const sqlOverhead = phases.total?.time ? phases.total.time / 1e6 : 0;
                  const sqlCpu = (phases.parse?.cpu || 0) + (phases.analyze?.cpu || 0) + (phases.plan?.cpu || 0);
                  const sqlMem = (phases.parse?.mem || 0) + (phases.analyze?.mem || 0) + (phases.plan?.mem || 0);
                  rows.push({ phase: 'Execution (DSL)', time: Math.max(0, totalLatency - sqlOverhead).toFixed(2), cpu: (Math.max(0, totalCpu - sqlCpu) / 1e6).toFixed(2), memory: (Math.max(0, totalMem - sqlMem) / 1024).toFixed(2) });
                  // Total row
                  const parseT = phases.parse?.time ? phases.parse.time / 1e6 : 0;
                  const analyzeT = phases.analyze?.time ? phases.analyze.time / 1e6 : 0;
                  const planT = phases.plan?.time ? phases.plan.time / 1e6 : 0;
                  const execT = Math.max(0, totalLatency - sqlOverhead);
                  rows.push({ phase: 'Total', time: (parseT + analyzeT + planT + execT).toFixed(2), cpu: (totalCpu / 1e6).toFixed(2), memory: (totalMem / 1024).toFixed(2) });
                  return rows;
                })()}
                columns={[
                  { field: 'phase', name: 'Phase' },
                  { field: 'time', name: 'Latency (ms)' },
                  { field: 'cpu', name: 'CPU (ms)' },
                  { field: 'memory', name: 'Memory (KB)' },
                ]}
                itemId="phase"
              />
            </EuiPanel>
          </>
        )}
        {querySource && (!queryLanguage) && (
          <>
            <EuiSpacer size="m" />
            <EuiPanel>
              <EuiTitle size="s">
                <h3>DSL Query</h3>
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
