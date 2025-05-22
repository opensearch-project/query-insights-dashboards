/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useContext } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiBasicTable,
  Pagination,
  Criteria,
  EuiTab,
  EuiTabs,
  EuiFormRow,
  EuiFieldText,
  EuiRadioGroup,
  EuiFieldNumber,
  EuiConfirmModal,
} from '@elastic/eui';
import { useHistory, useLocation } from 'react-router-dom';
import { CoreStart, AppMountParameters } from 'opensearch-dashboards/public';
import { DataSourceManagementPluginSetup } from 'src/plugins/data_source_management/public';
import { PageHeader } from '../../../components/PageHeader';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../../types';
import { WLM_MAIN, DataSourceContext } from '../WorkloadManagement';
import { QueryInsightsDataSourceMenu } from '../../../components/DataSourcePicker';
import { getDataSourceEnabledUrl } from '../../../utils/datasource-utils';

// === Constants & Types ===
const DEFAULT_WORKLOAD_GROUP = 'DEFAULT_WORKLOAD_GROUP';
const DEFAULT_RESOURCE_LIMIT = 100;

// --- Pagination Constants ---
const DEFAULT_PAGE_INDEX = 0;
const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [5, 10, 15, 50];

// --- Sort Fields ---
type SortField = 'cpuUsage' | 'memoryUsage';

// --- Tabs ---
export enum WLMTabs {
  RESOURCES = 'resources',
  SETTINGS = 'settings',
}

export enum ResiliencyMode {
  SOFT = 'soft',
  ENFORCED = 'enforced',
}

interface NodeUsageData {
  nodeId: string;
  cpuUsage: number;
  memoryUsage: number;
}

interface WorkloadGroupDetails {
  name: string;
  cpuLimit: number | undefined;
  memLimit: number | undefined;
  resiliencyMode: 'soft' | 'enforced';
  description: string;
}

interface WorkloadGroup {
  _id: string;
  name: string;
  resource_limits?: {
    cpu?: number;
    memory?: number;
  };
  resiliency_mode?: string;
}

interface WorkloadGroupByNameResponse {
  body: {
    workload_groups: WorkloadGroup[];
  };
  statusCode: number;
  headers: Record<string, string>;
  meta: any;
}

interface NodeStats {
  cpu: {
    current_usage: number;
  };
  memory: {
    current_usage: number;
  };
  workload_groups: {
    [groupId: string]: GroupStats;
  };
}

interface GroupStats {
  cpu?: {
    current_usage: number;
  };
  memory?: {
    current_usage: number;
  };
  total_completions?: number;
  total_rejections?: number;
  total_cancellations?: number;
}

interface StatsResponse {
  [nodeId: string]: NodeStats;
}

// === Main Component ===
export const WLMDetails = ({
  core,
  depsStart,
  params,
  dataSourceManagement,
}: {
  core: CoreStart;
  depsStart: QueryInsightsDashboardsPluginStartDependencies;
  params: AppMountParameters;
  dataSourceManagement?: DataSourceManagementPluginSetup;
}) => {
  // === Router & Setup ===
  const location = useLocation();
  const history = useHistory();
  const searchParams = new URLSearchParams(location.search);
  const groupName = searchParams.get('name');

  // === State ===
  const [groupDetails, setGroupDetails] = useState<WorkloadGroupDetails | null>(null);
  const [resiliencyMode, setResiliencyMode] = useState<ResiliencyMode>(ResiliencyMode.SOFT);
  const [cpuLimit, setCpuLimit] = useState<number | undefined>();
  const [memoryLimit, setMemoryLimit] = useState<number | undefined>();
  const [isSaved, setIsSaved] = useState(true);
  const [nodesData, setNodesData] = useState<NodeUsageData[]>([]);
  const [sortedData, setSortedData] = useState<NodeUsageData[]>([]);
  const [pageIndex, setPageIndex] = useState(DEFAULT_PAGE_INDEX);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortField, setSortField] = useState<SortField>('cpuUsage');
  const [selectedTab, setSelectedTab] = useState<WLMTabs>(WLMTabs.RESOURCES);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const { dataSource, setDataSource } = useContext(DataSourceContext)!;

  // === Helpers ===
  const resiliencyOptions = [
    { id: ResiliencyMode.SOFT, label: 'Soft' },
    { id: ResiliencyMode.ENFORCED, label: 'Enforced' },
  ];
  const isDefaultGroup = groupName === DEFAULT_WORKLOAD_GROUP;
  const workloadGroup: WorkloadGroupDetails = groupDetails || {
    name: groupName || 'Unknown',
    cpuLimit: 0,
    memLimit: 0,
    resiliencyMode: 'soft',
    description: '-',
  };

  const pagination: Pagination = {
    pageIndex,
    pageSize,
    totalItemCount: sortedData.length,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
  };

  // === Lifecycle Hooks ===
  useEffect(() => {
    core.chrome.setBreadcrumbs([
      {
        text: 'Data Administration',
        href: WLM_MAIN,
        onClick: (e) => {
          e.preventDefault();
          history.push(WLM_MAIN);
        },
      },
      { text: `Workload Group: ${workloadGroup.name}` },
    ]);
  }, [core.chrome, history, workloadGroup.name]);

  useEffect(() => {
    setSortedData([...nodesData].sort((a, b) => b.cpuUsage - a.cpuUsage));
  }, [nodesData]);

  useEffect(() => {
    fetchGroupDetails();
    updateStats();
  }, [groupName, dataSource]);

  // === Data Fetching ===
  const fetchDefaultGroupDetails = () => {
    setGroupDetails({
      name: DEFAULT_WORKLOAD_GROUP,
      cpuLimit: 100,
      memLimit: 100,
      resiliencyMode: 'soft',
      description: 'System default workload group',
    });
    setCpuLimit(DEFAULT_RESOURCE_LIMIT);
    setMemoryLimit(DEFAULT_RESOURCE_LIMIT);
    setResiliencyMode(ResiliencyMode.SOFT);
  };

  const fetchGroupDetails = async () => {
    if (!groupName) {
      core.notifications.toasts.addDanger('Workload group name is missing from the URL.');
      history.push(WLM_MAIN);
      return;
    }

    if (isDefaultGroup) {
      await fetchDefaultGroupDetails();
      return;
    }

    try {
      const response = await core.http.get(`/api/_wlm/workload_group/${groupName}`, {
        query: { dataSourceId: dataSource.id },
      });
      const workload = response?.body?.workload_groups?.[0];
      if (workload) {
        setGroupDetails({
          name: workload.name,
          cpuLimit: formatLimit(workload.resource_limits?.cpu),
          memLimit: formatLimit(workload.resource_limits?.memory),
          resiliencyMode: workload.resiliency_mode,
          description: '-',
        });
        setResiliencyMode(workload.resiliency_mode.toLowerCase());
        setCpuLimit(formatLimit(workload.resource_limits?.cpu));
        setMemoryLimit(formatLimit(workload.resource_limits?.memory));
      }
    } catch (err) {
      console.error('Failed to fetch workload group details:', err);
      setGroupDetails(null);
      history.push(WLM_MAIN);
      core.notifications.toasts.addDanger(`Workload group "${groupName}" not found.`);
    }
  };

  const updateStats = async () => {
    if (!groupName) return;

    let groupId: string = DEFAULT_WORKLOAD_GROUP;

    if (groupName !== DEFAULT_WORKLOAD_GROUP) {
      try {
        const response: WorkloadGroupByNameResponse = await core.http.get(
          `/api/_wlm/workload_group/${groupName}`,
          {
            query: { dataSourceId: dataSource.id },
          }
        );
        const matchedGroup = response.body?.workload_groups?.[0];

        if (!matchedGroup?._id) {
          throw new Error('Group ID not found');
        }

        groupId = matchedGroup._id;
      } catch (err) {
        console.error('Failed to get group ID by name:', err);
        core.notifications.toasts.addDanger(`Failed to find workload group "${groupName}"`);
        return;
      }
    }

    try {
      const statsRes = await core.http.get(`/api/_wlm/stats/${groupId}`, {
        query: { dataSourceId: dataSource.id },
      });
      const stats: StatsResponse = statsRes.body ?? statsRes;

      const nodeStatsList: NodeUsageData[] = [];

      for (const [nodeId, data] of Object.entries(stats)) {
        if (nodeId === '_nodes' || nodeId === 'cluster_name') continue;

        const statsForGroup = data.workload_groups[groupId];

        if (statsForGroup && statsForGroup.cpu && statsForGroup.memory) {
          nodeStatsList.push({
            nodeId,
            cpuUsage: formatUsage(statsForGroup.cpu.current_usage),
            memoryUsage: formatUsage(statsForGroup.memory.current_usage),
          });
        }
      }

      setNodesData(nodeStatsList);
    } catch (err) {
      console.error('Failed to fetch group stats', err);
      core.notifications.toasts.addDanger('Could not load workload group stats.');
    }
  };

  // === Actions ===
  const saveChanges = async () => {
    const validCpu = cpuLimit === undefined || (cpuLimit > 0 && cpuLimit <= 100);
    const validMem = memoryLimit === undefined || (memoryLimit > 0 && memoryLimit <= 100);

    if (!resiliencyMode || (!validCpu && !validMem)) {
      core.notifications.toasts.addDanger(
        'Resiliency mode is required and at least one of CPU or memory limits must be valid (1–100).'
      );
      return;
    }

    const resourceLimits: Record<string, number> = {};
    if (cpuLimit !== undefined) resourceLimits.cpu = cpuLimit / 100;
    if (memoryLimit !== undefined) resourceLimits.memory = memoryLimit / 100;

    const body: Record<string, any> = {
      resiliency_mode: resiliencyMode.toUpperCase(),
    };

    if (Object.keys(resourceLimits).length > 0) {
      body.resource_limits = resourceLimits;
    }

    try {
      await core.http.put(`/api/_wlm/workload_group/${groupName}`, {
        query: { dataSourceId: dataSource.id },
        body: JSON.stringify(body),
      });

      setIsSaved(true);
      core.notifications.toasts.addSuccess(`Saved changes for "${groupName}"`);
      fetchGroupDetails();
    } catch (err) {
      const errorMessage = err?.body?.message || err?.message || String(err);
      core.notifications.toasts.addDanger(`Failed to save changes: ${errorMessage}`);
    }
  };

  const deleteGroup = async () => {
    try {
      await core.http.delete(`/api/_wlm/workload_group/${groupName}`, {
        query: { dataSourceId: dataSource.id },
      });
      core.notifications.toasts.addSuccess(`Deleted workload group "${groupName}"`);
      history.push(WLM_MAIN);
    } catch (err) {
      console.error('Failed to delete group:', err);
      core.notifications.toasts.addDanger(
        `Failed to delete group: ${err.body?.message || err.message}`
      );
    }
  };

  const onTableChange = (criteria: Criteria<NodeUsageData>) => {
    const { sort, page } = criteria;

    if (sort) {
      const sorted = [...nodesData].sort((a, b) => {
        const valA = a[sort.field];
        const valB = b[sort.field];

        if (typeof valA === 'number' && typeof valB === 'number') {
          return valB - valA;
        }
        return String(valB).localeCompare(String(valA));
      });

      if (sort.field === 'cpuUsage' || sort.field === 'memoryUsage') {
        setSortField(sort.field);
      }
      setSortedData(sorted);
    }

    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  };

  const formatLimit = (usage?: number): number | undefined => {
    if (usage == null) return undefined;
    return Math.round(usage * 100);
  };

  const formatUsage = (usage: number): number => {
    return Math.round(usage * 100);
  };


  return (
    <div style={{ padding: '20px 40px' }}>
      {isDeleteModalVisible && (
        <EuiConfirmModal
          title="Delete workload group"
          onCancel={() => {
            setDeleteConfirmation('');
            setIsDeleteModalVisible(false);
          }}
          onConfirm={deleteGroup}
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
          buttonColor="danger"
          defaultFocusedButton="confirm"
          confirmButtonDisabled={deleteConfirmation.trim().toLowerCase() !== 'delete'}
        >
          <p>
            The following workload group will be permanently deleted. This action cannot be undone.
          </p>
          <ul>
            <li>{groupName}</li>
          </ul>
          <EuiSpacer size="s" />
          <EuiFieldText
            placeholder="delete"
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
          />
          <EuiSpacer size="s" />
          <EuiText size="s">
            To confirm your action, type <strong>delete</strong>.
          </EuiText>
        </EuiConfirmModal>
      )}

      <PageHeader
        coreStart={core}
        depsStart={depsStart}
        fallBackComponent={
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
                window.history.replaceState({}, '', getDataSourceEnabledUrl(dataSource).toString());
              }}
              dataSourcePickerReadOnly={false}
            />
          </>
        }
      />

      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiTitle size="l">
            <h1>{workloadGroup.name}</h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="danger"
            iconType="trash"
            onClick={() => setIsDeleteModalVisible(true)}
            isDisabled={groupName === 'DEFAULT_WORKLOAD_GROUP'}
          >
            Delete
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      {/* Summary Panel */}
      <EuiPanel paddingSize="m">
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>Workload group name</strong>
            </EuiText>
            <EuiText size="m">{workloadGroup.name}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>Description</strong>
            </EuiText>
            <EuiText size="s">{workloadGroup.description}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>Resiliency mode</strong>
            </EuiText>
            <EuiText size="m">{workloadGroup.resiliencyMode}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>CPU usage limit</strong>
            </EuiText>
            <EuiText size="m">
              {typeof workloadGroup.cpuLimit === 'number' ? `${workloadGroup.cpuLimit}%` : '-'}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>Memory usage limit</strong>
            </EuiText>
            <EuiText size="m">
              {typeof workloadGroup.memLimit === 'number' ? `${workloadGroup.memLimit}%` : '-'}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiSpacer size="m" />

      {/* Tabs Section */}
      <EuiTabs>
        {Object.values(WLMTabs).map((tab) => (
          <EuiTab
            key={tab}
            isSelected={selectedTab === tab}
            onClick={() => setSelectedTab(tab)}
            data-testid={`wlm-tab-${tab}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </EuiTab>
        ))}
      </EuiTabs>

      <EuiSpacer size="m" />

      {/* Table */}
      {selectedTab === 'resources' && (
        <EuiBasicTable<NodeUsageData>
          items={sortedData.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)}
          columns={[
            { field: 'nodeId', name: 'Node ID', sortable: false },
            {
              field: 'cpuUsage',
              name: 'CPU Usage',
              sortable: true,
              render: (cpuUsage: number) => (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span>{cpuUsage}%</span>
                  <div
                    style={{
                      marginLeft: '10px',
                      width: '100px',
                      height: '10px',
                      background: '#ccc',
                    }}
                  >
                    <div
                      style={{
                        width: `${cpuUsage}%`,
                        height: '100%',
                        background: cpuUsage > 80 ? '#C43D35' : '#0268BC',
                      }}
                    />
                  </div>
                </div>
              ),
            },
            {
              field: 'memoryUsage',
              name: 'Memory Usage',
              sortable: true,
              render: (memoryUsage: number) => (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span>{memoryUsage}%</span>
                  <div
                    style={{
                      marginLeft: '10px',
                      width: '100px',
                      height: '10px',
                      background: '#ccc',
                    }}
                  >
                    <div
                      style={{
                        width: `${memoryUsage}%`,
                        height: '100%',
                        background: memoryUsage > 80 ? '#C43D35' : '#0268BC',
                      }}
                    />
                  </div>
                </div>
              ),
            },
          ]}
          sorting={{ sort: { field: sortField, direction: 'desc' } }}
          pagination={pagination}
          onChange={onTableChange}
        />
      )}

      {/* Settings Panel */}
      {selectedTab === 'settings' && (
        <EuiPanel paddingSize="m">
          {isDefaultGroup ? (
            <EuiText color="subdued">
              Settings are not available for the DEFAULT_WORKLOAD_GROUP.
            </EuiText>
          ) : (
            <>
              <EuiTitle size="m">
                <h2>Workload group settings</h2>
              </EuiTitle>
              <EuiHorizontalRule />

              {/* Index Wildcard */}
              <EuiFormRow
                label={<strong>Index wildcard</strong>}
                helpText="You can use (*) to define a wildcard."
              >
                <EuiFieldText placeholder="security_logs*" />
              </EuiFormRow>

              <EuiSpacer size="m" />

              {/* Resiliency Mode */}
              <EuiFormRow
                label={<strong>Resiliency mode</strong>}
                helpText="Select resiliency mode."
              >
                <EuiRadioGroup
                  options={resiliencyOptions}
                  idSelected={resiliencyMode}
                  onChange={(id) => {
                    setResiliencyMode(id as ResiliencyMode);
                    setIsSaved(false);
                  }}
                />
              </EuiFormRow>

              <EuiSpacer size="m" />

              {/* Resource Thresholds */}
              <EuiTitle size="xs">
                <h3>Resource thresholds</h3>
              </EuiTitle>

              <EuiSpacer size="s" />

              {/* CPU Usage Limit */}
              <EuiFormRow
                label="Reject queries when CPU usage exceeds"
                isInvalid={cpuLimit !== undefined && (cpuLimit <= 0 || cpuLimit > 100)}
                error="Value must be between 0 and 100"
              >
                <EuiFieldNumber
                  value={cpuLimit}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCpuLimit(val === '' ? undefined : Number(val));
                    setIsSaved(false);
                  }}
                  append="%"
                  min={0}
                  max={100}
                />
              </EuiFormRow>

              <EuiSpacer size="m" />

              {/* Memory Usage Limit */}
              <EuiFormRow
                label="Reject queries when memory usage exceeds"
                isInvalid={memoryLimit !== undefined && (memoryLimit <= 0 || memoryLimit > 100)}
                error="Value must be between 0 and 100"
              >
                <EuiFieldNumber
                  value={memoryLimit}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMemoryLimit(val === '' ? undefined : Number(val));
                    setIsSaved(false);
                  }}
                  append="%"
                  min={0}
                  max={100}
                />
              </EuiFormRow>

              <EuiSpacer size="m" />

              {/* Apply Changes Button */}
              <EuiButton onClick={saveChanges} color="primary" isDisabled={isSaved}>
                Apply Changes
              </EuiButton>
            </>
          )}
        </EuiPanel>
      )}
    </div>
  );
};
