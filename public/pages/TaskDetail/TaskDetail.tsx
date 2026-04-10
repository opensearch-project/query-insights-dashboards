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
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { useHistory, useLocation } from 'react-router-dom';
import { AppMountParameters, CoreStart } from 'opensearch-dashboards/public';
import { DataSourceManagementPluginSetup } from 'src/plugins/data_source_management/public';
import { Duration } from 'luxon';
import { filesize } from 'filesize';
import { LiveSearchQueryRecord } from '../../../types/types';
import { retrieveLiveQueries } from '../../../common/utils/QueryUtils';
import { API_ENDPOINTS } from '../../../common/utils/apiendpoints';
import { DataSourceContext, QUERY_INSIGHTS } from '../TopNQueries/TopNQueries';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';
import { QueryInsightsDataSourceMenu } from '../../components/DataSourcePicker';
import { PageHeader } from '../../components/PageHeader';

interface TaskDetailRow {
  label: string;
  value: string | number;
}

const PanelItem = ({ label, value }: { label: string; value: string | number }) => (
  <EuiFlexItem>
    <EuiDescriptionList compressed listItems={[{ title: <h4>{label}</h4>, description: value }]} />
  </EuiFlexItem>
);

const formatTime = (seconds: number | undefined): string => {
  if (seconds == null || isNaN(seconds)) return '-';
  if (seconds < 0.001) return '< 1 ms';
  const dur = Duration.fromMillis(seconds * 1000);
  if (seconds < 1) return `${dur.toFormat('S')} ms`;
  if (seconds < 60) return `${dur.toFormat('s.SS')} s`;
  return dur.toFormat("m 'min' s 's'");
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

  const [task, setTask] = useState<LiveSearchQueryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const history = useHistory();
  const { dataSource, setDataSource } = useContext(DataSourceContext)!;

  const fetchTask = useCallback(async () => {
    setLoading(true);
    try {
      const response = await retrieveLiveQueries(core, dataSource?.id);
      const liveQueries = response?.response?.live_queries || [];
      const found = liveQueries.find((q) => q.id === taskId);
      setTask(found || null);
    } catch (e) {
      console.error('Failed to fetch task details:', e);
      setTask(null);
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

  const handleRefresh = () => fetchTask();

  // Parse description to extract index, search type, and source
  const parseDescription = (desc: string) => {
    const indexMatch = desc.match(/indices\[([^\]]+)\]/);
    const searchTypeMatch = desc.match(/search_type\[([^\]]+)\]/);
    const sourceMatch = desc.match(/source\[(.+)\]/s);
    return {
      indices: indexMatch ? indexMatch[1] : '-',
      searchType: searchTypeMatch ? searchTypeMatch[1] : '-',
      source: sourceMatch ? sourceMatch[1] : '-',
    };
  };

  const parsed = task ? parseDescription(task.description || '') : null;

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
          <EuiButtonEmpty iconType="refresh" onClick={handleRefresh}>
            Refresh
          </EuiButtonEmpty>
        </EuiFlexItem>
        {task && !task.is_cancelled && (
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

      {!loading && !task && (
        <EuiPanel>
          <EuiTitle size="s">
            <h2>Task not found</h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          <p>The task may have completed. Check the Top N queries for historical details.</p>
          <EuiSpacer size="m" />
          <EuiButton onClick={() => history.push(QUERY_INSIGHTS)}>View Top N Queries</EuiButton>
        </EuiPanel>
      )}

      {!loading && task && (
        <>
          <EuiPanel data-test-subj="task-detail-summary">
            <EuiTitle size="s">
              <h2>Task Summary</h2>
            </EuiTitle>
            <EuiHorizontalRule margin="xs" />
            <EuiFlexGrid columns={4}>
              <PanelItem label="Status" value={task.is_cancelled ? 'Cancelled' : 'Running'} />
              <PanelItem label="Start Time" value={convertTime(task.timestamp)} />
              <PanelItem label="Coordinator Node" value={task.node_id} />
              <PanelItem label="Indices" value={parsed?.indices || '-'} />
              <PanelItem
                label="Search Type"
                value={(parsed?.searchType || '-').replace(/_/g, ' ')}
              />
              <PanelItem
                label="Time Elapsed"
                value={formatTime((task.measurements?.latency?.number || 0) / 1e9)}
              />
              <PanelItem
                label="CPU Usage"
                value={formatTime((task.measurements?.cpu?.number || 0) / 1e9)}
              />
              <PanelItem
                label="Memory Usage"
                value={formatMemory(task.measurements?.memory?.number)}
              />
              {task.wlm_group_id && <PanelItem label="WLM Group" value={task.wlm_group_id} />}
            </EuiFlexGrid>
          </EuiPanel>

          <EuiSpacer size="m" />

          <EuiPanel data-test-subj="task-detail-resource-usage">
            <EuiTitle size="s">
              <h2>Task Resource Usage</h2>
            </EuiTitle>
            <EuiHorizontalRule margin="xs" />
            <EuiTitle size="xs">
              <h3>Coordinator Task</h3>
            </EuiTitle>
            <EuiHorizontalRule margin="xs" />
            <EuiFlexGrid columns={4}>
              <PanelItem label="Task ID" value={task.id} />
              <PanelItem label="Node ID" value={task.node_id} />
              <PanelItem
                label="CPU Time (ms)"
                value={((task.measurements?.cpu?.number || 0) / 1e6).toFixed(2)}
              />
              <PanelItem label="Memory (bytes)" value={task.measurements?.memory?.number || 0} />
            </EuiFlexGrid>
          </EuiPanel>

          <EuiSpacer size="m" />

          {parsed?.source && parsed.source !== '-' && (
            <EuiPanel data-test-subj="task-detail-query-source">
              <EuiTitle size="s">
                <h2>Query Source</h2>
              </EuiTitle>
              <EuiHorizontalRule margin="xs" />
              <EuiSpacer size="xs" />
              <EuiCodeBlock
                language="json"
                paddingSize="m"
                fontSize="s"
                overflowHeight={600}
                isCopyable
              >
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(parsed.source), null, 2);
                  } catch {
                    return parsed.source;
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
