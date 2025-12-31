/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import './TaskDetailsFlyout.scss';
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

  const ChevronStatus: React.FC<{
    state: TaskState;
    runningSeconds?: number;
  }> = ({ state, runningSeconds }) => {
    const steps: Array<{ key: TaskState; label: string; duration?: string }> = [
      { key: 'start', label: 'Start' },
      {
        key: 'running',
        label:
          state === 'running' && runningSeconds != null
            ? `Running - ${Duration.fromObject({ seconds: runningSeconds }).toFormat('mm:ss')}`
            : 'Running',
      },
      {
        key: state === 'failed' ? 'failed' : 'completed',
        label:
          state === 'failed' ? (taskDetails?.is_cancelled ? 'Cancelled' : 'Failed') : 'Completed',
      },
    ];

    const statusOf = (step: 'start' | 'running' | 'completed' | 'failed') => {
      if (state === 'failed') {
        if (step === 'failed') return 'failed';
        return 'inactive';
      }

      if (state === 'completed') {
        if (step === 'completed') return 'complete';
        return 'inactive';
      }

      if (state === 'running') {
        if (step === 'running') return 'current';
        if (step === 'start') return 'inactive';
        return 'inactive';
      }

      return 'inactive';
    };

    return (
      <div className="qiChevronSteps">
        {steps.map((s, i) => {
          const st = statusOf(s.key);
          return (
            <div
              key={`${s.key}-${i}`}
              className={`qiChevronStep qiChevronStep--${st} ${
                i === 0 ? 'qiChevronStep--first' : ''
              } ${i === steps.length - 1 ? 'qiChevronStep--last' : ''}`}
            >
              <span className="qiChevronStep__text">
                {s.label}
                {s.duration ?? ''}
              </span>
            </div>
          );
        })}
      </div>
    );
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
                  <ChevronStatus
                    state={getTaskState(taskDetails)}
                    runningSeconds={
                      getTaskState(taskDetails) === 'running' &&
                      taskDetails?.measurements?.latency?.number
                        ? taskDetails.measurements.latency.number / 1e9
                        : undefined
                    }
                  />
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
