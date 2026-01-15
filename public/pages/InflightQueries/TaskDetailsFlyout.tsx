/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiButton,
  EuiText,
  EuiPanel,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
} from '@elastic/eui';
import { Duration } from 'luxon';
import { filesize } from 'filesize';

interface TaskDetailsFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string | null;
  taskDetails: Record<string, unknown> | null;
  loading: boolean;
  error: string | null;
  onRefresh: (taskId: string) => void;
}

export const TaskDetailsFlyout: React.FC<TaskDetailsFlyoutProps> = ({
  isOpen,
  onClose,
  taskId,
  taskDetails,
  loading,
  error,
  onRefresh,
}) => {
  const formatTime = (seconds: number): string => {
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

  type TaskState = 'start' | 'running' | 'completed' | 'failed';

  const getTaskState = (details: Record<string, unknown> | null): TaskState => {
    if (!details) return 'start';

    if (details?.error || details?.failed === true) {
      return 'failed';
    }

    if (details?.is_cancelled === true) {
      return 'failed';
    }

    if (details?.end_time) {
      return 'completed';
    }

    return 'running';
  };

  const getStatusText = (state: TaskState, runningSeconds?: number): string => {
    if (state === 'failed') {
      return taskDetails?.is_cancelled ? 'Cancelled' : 'Failed';
    }
    if (state === 'completed') {
      return 'Completed';
    }
    if (state === 'running') {
      return runningSeconds != null
        ? `Running - ${Duration.fromObject({ seconds: runningSeconds }).toFormat('mm:ss')}`
        : 'Running';
    }
    return 'Start';
  };

  const convertTime = (unixTime: number) => {
    const date = new Date(unixTime);
    const loc = date.toDateString().split(' ');
    return `${loc[1]} ${loc[2]}, ${loc[3]} @ ${date.toLocaleTimeString('en-US')}`;
  };

  if (!isOpen) return null;

  return (
    <EuiFlyout onClose={onClose} size="l" type="overlay" ownFocus aria-labelledby="taskFlyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id="taskFlyoutTitle">Task ID - {taskId}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              {getTaskState(taskDetails) === 'running' && (
                <>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      iconType="refresh"
                      onClick={() => taskId && onRefresh(taskId)}
                      disabled={!taskId || loading}
                      size="s"
                    >
                      Refresh
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton iconType="cross" color="danger" onClick={onClose} size="s">
                      Cancel
                    </EuiButton>
                  </EuiFlexItem>
                </>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {loading ? (
          <EuiText>
            <p>Loading…</p>
          </EuiText>
        ) : error ? (
          <EuiText color="danger">
            <p>{error}</p>
          </EuiText>
        ) : taskDetails ? (
          <>
            <EuiPanel paddingSize="m">
              <EuiTitle size="s">
                <h3>Task Summary</h3>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiText>
                    <strong>Status:</strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText>
                    {getStatusText(
                      getTaskState(taskDetails),
                      getTaskState(taskDetails) === 'running' &&
                      taskDetails?.measurements?.latency?.number
                        ? taskDetails.measurements.latency.number / 1e9
                        : undefined
                    )}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiText>
                    <strong>Start Time:</strong>{' '}
                    {convertTime(taskDetails.start_time || taskDetails.timestamp)}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText>
                    <strong>End Time:</strong>{' '}
                    {taskDetails.end_time ? convertTime(taskDetails.end_time) : '-'}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText>
                    <strong>Index:</strong> {taskDetails.index}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiText>
                    <strong>Coordinator Node:</strong> {taskDetails.coordinator_node}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText>
                    <strong>Search Type:</strong> {taskDetails.search_type}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText>
                    <strong>WLM Group:</strong> {taskDetails.wlm_group}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiText>
                    <strong>Time Elapsed:</strong>{' '}
                    {formatTime(taskDetails.measurements?.latency?.number / 1e9)}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText>
                    <strong>CPU Usage:</strong>{' '}
                    {formatTime(taskDetails.measurements?.cpu?.number / 1e9)}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText>
                    <strong>Memory Usage:</strong>{' '}
                    {formatMemory(taskDetails.measurements?.memory?.number)}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
            <EuiSpacer size="m" />
            <EuiPanel paddingSize="m">
              <EuiTitle size="s">
                <h3>Task Resource Usage</h3>
              </EuiTitle>
              <EuiSpacer size="m" />
              {(() => {
                const rows = (taskDetails.task_resource_usages || []).map((item) => ({
                  action: item.action,
                  taskId: String(item.taskId),
                  parentTaskId: String(item.parentTaskId),
                  nodeId: item.nodeId,
                  cpuTimeText: formatTime(item.taskResourceUsage?.cpu_time_in_nanos / 1e9),
                  memoryText: formatMemory(item.taskResourceUsage?.memory_in_bytes),
                }));

                return (
                  <>
                    <EuiInMemoryTable
                      items={rows}
                      columns={[
                        { field: 'action', name: 'Action' },
                        { field: 'taskId', name: 'Task ID' },
                        { field: 'parentTaskId', name: 'Parent Task ID' },
                        { field: 'nodeId', name: 'Node ID' },
                        { field: 'cpuTimeText', name: 'CPU Time' },
                        { field: 'memoryText', name: 'Memory' },
                      ]}
                      pagination={false}
                    />
                  </>
                );
              })()}
            </EuiPanel>
            <EuiSpacer size="m" />
            <EuiPanel paddingSize="m">
              <EuiTitle size="s">
                <h3>Query Source</h3>
              </EuiTitle>
              <EuiSpacer size="m" />
              <pre
                style={{
                  background: '#f5f5f5',
                  padding: '12px',
                  borderRadius: '4px',
                  overflow: 'auto',
                }}
              >
                {JSON.stringify(taskDetails.source, null, 2)}
              </pre>
            </EuiPanel>
          </>
        ) : (
          <EuiText color="subdued">
            <p>No details loaded.</p>
          </EuiText>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
