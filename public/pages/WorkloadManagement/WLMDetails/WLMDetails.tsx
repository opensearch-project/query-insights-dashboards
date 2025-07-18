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
  EuiTextArea,
  EuiButtonIcon,
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
  totalCompletions?: number;
  totalRejections?: number;
  totalCancellations?: number;
}

interface WorkloadGroupDetails {
  name: string;
  cpuLimit: number | undefined;
  memLimit: number | undefined;
  resiliencyMode: 'soft' | 'enforced';
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

interface Rule {
  index: string;
  indexId: string;
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
  const [currentId, setCurrentId] = useState<string>();
  const [groupDetails, setGroupDetails] = useState<WorkloadGroupDetails | null>(null);
  const [resiliencyMode, setResiliencyMode] = useState<ResiliencyMode>(ResiliencyMode.SOFT);
  const [cpuLimit, setCpuLimit] = useState<number | undefined>();
  const [memoryLimit, setMemoryLimit] = useState<number | undefined>();
  const [originalCpuLimit, setOriginalCpuLimit] = useState<number | undefined>(undefined);
  const [originalMemoryLimit, setOriginalMemoryLimit] = useState<number | undefined>(undefined);
  const [description, setDescription] = useState<string>();
  const [rules, setRules] = useState<Rule[]>([{ index: '', indexId: '' }]);
  const [existingRules, setExistingRules] = useState<Rule[]>([{ index: '', indexId: '' }]);
  const [indexErrors, setIndexErrors] = useState<Array<string | null>>([]);
  const [isSaved, setIsSaved] = useState(true);
  const isCpuInvalid = cpuLimit !== undefined && (cpuLimit <= 0 || cpuLimit > 100);
  const isMemInvalid = memoryLimit !== undefined && (memoryLimit <= 0 || memoryLimit > 100);
  const isInvalid = isCpuInvalid || isMemInvalid || indexErrors.some((e) => e != null);
  const [nodesData, setNodesData] = useState<NodeUsageData[]>([]);
  const [sortedData, setSortedData] = useState<NodeUsageData[]>([]);
  const [pageIndex, setPageIndex] = useState(DEFAULT_PAGE_INDEX);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortField, setSortField] = useState<SortField>('cpuUsage');
  const [selectedTab, setSelectedTab] = useState<WLMTabs>(WLMTabs.RESOURCES);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
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
    // Initial fetch
    fetchGroupDetails();
    updateStats();

    // Set up interval to refresh every 60 seconds
    const interval = setInterval(() => {
      fetchGroupDetails();
      updateStats();
    }, 60000);

    return () => clearInterval(interval);
  }, [groupName, dataSource]);


  // === Data Fetching ===
  const fetchDefaultGroupDetails = () => {
    setGroupDetails({
      name: DEFAULT_WORKLOAD_GROUP,
      cpuLimit: 100,
      memLimit: 100,
      resiliencyMode: 'soft',
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
        });
        setResiliencyMode(workload.resiliency_mode.toLowerCase());
        setOriginalCpuLimit(formatLimit(workload.resource_limits?.cpu));
        setOriginalMemoryLimit(formatLimit(workload.resource_limits?.memory));
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

    setCurrentId(groupId);

    if (groupName !== DEFAULT_WORKLOAD_GROUP) {
      try {
        const rulesRes = await core.http.get('/api/_rules/workload_group', {
          query: { dataSourceId: dataSource.id },
        });
        const allRules = rulesRes?.body?.rules ?? [];

        const matchedRules = allRules.filter((rule: any) => rule.workload_group === groupId);

        setRules(
          matchedRules.map((rule: any) => ({
            index: rule.index_pattern.join(','),
            indexId: rule.id,
          }))
        );

        setExistingRules(
          matchedRules.map((rule: any) => ({
            index: rule.index_pattern.join(','),
            indexId: rule.id,
          }))
        );

        extractDescriptionFromRules(rulesRes, groupId);
      } catch (err) {
        console.error('Failed to fetch group stats', err);
        core.notifications.toasts.addDanger('Could not load rules.');
      }
    } else {
      setDescription('System default workload group');
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
            totalCompletions: statsForGroup.total_completions,
            totalRejections: statsForGroup.total_rejections,
            totalCancellations: statsForGroup.total_cancellations,
          });
        }
      }

      setNodesData(nodeStatsList);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch group stats', err);
      core.notifications.toasts.addDanger('Could not load workload group stats.');
    }
  };

  const extractDescriptionFromRules = (
    rulesRes: any,
    groupId: string,
  ) => {
    const rules = rulesRes?.body?.rules ?? [];

    const matchedRule = rules.find((rule: any) => rule.workload_group === groupId);

    setDescription(matchedRule?.description ?? '-');
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

      const existingRuleMap = new Map(existingRules.map((r) => [r.indexId, r]));
      const newRuleIds = new Set(rules.map((r) => r.indexId).filter(Boolean));

      const rulesToCreate: Rule[] = [];
      const rulesToUpdate: Rule[] = [];
      const rulesToDelete: Rule[] = [];

      for (const rule of rules) {
        if (rule.indexId && existingRuleMap.has(rule.indexId)) {
          rulesToUpdate.push(rule);
        } else {
          rulesToCreate.push(rule);
        }
      }

      for (const existing of existingRules) {
        if (!newRuleIds.has(existing.indexId)) {
          rulesToDelete.push(existing);
        }
      }

      for (const rule of rulesToCreate) {
        const response = {
          description: description || '-',
          index_pattern: rule.index.split(',').map((s) => s.trim()),
          workload_group: currentId,
        };

        await core.http.put(`/api/_rules/workload_group`, {
          query: { dataSourceId: dataSource.id },
          body: JSON.stringify(response),
          headers: { 'Content-Type': 'application/json' },
        });
      }

      for (const rule of rulesToUpdate) {
        const response = {
          description: description || '-',
          index_pattern: rule.index.split(',').map((s) => s.trim()),
          workload_group: currentId,
        };

        await core.http.put(`/api/_rules/workload_group/${rule.indexId}`, {
          query: { dataSourceId: dataSource.id },
          body: JSON.stringify(response),
          headers: { 'Content-Type': 'application/json' },
        });
      }

      for (const rule of rulesToDelete) {
        await core.http.delete(`/api/_rules/workload_group/${rule.indexId}`, {
          query: { dataSourceId: dataSource.id },
        });
      }

      setIsSaved(true);
      core.notifications.toasts.addSuccess(`Saved changes for "${groupName}"`);

      setTimeout(() => {
        window.location.reload();
      }, 1000);
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
    <div>
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
            <EuiText size="s">{description}</EuiText>
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

      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        {/* Tabs section */}
        <EuiFlexItem grow={true}>
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
        </EuiFlexItem>

        {/* Last updated text */}
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" size="s">
            <p>
              Last updated {lastUpdated?.toLocaleDateString()} @{' '}
              {lastUpdated?.toLocaleTimeString()}
            </p>
          </EuiText>
        </EuiFlexItem>

        {/* Refresh button */}
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={() => {
              fetchGroupDetails();
              updateStats();
            }}
            iconType="refresh"
          >
            Refresh
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

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
                        background:
                          cpuLimit !== undefined && cpuUsage > cpuLimit ? '#C43D35' : '#0268BC',
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
                        background:
                          memoryLimit !== undefined && memoryUsage > memoryLimit
                            ? '#C43D35'
                            : '#0268BC',
                      }}
                    />
                  </div>
                </div>
              ),
            },
            { field: 'totalCompletions', name: 'Completions', sortable: true, render: (val: number) => val.toLocaleString(), },
            { field: 'totalRejections', name: 'Rejections', sortable: true, render: (val: number) => val.toLocaleString(), },
            { field: 'totalCancellations', name: 'Cancellations', sortable: true, render: (val: number) => val.toLocaleString(), },
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

              <EuiFormRow>
                <>
                  <EuiText size="m" style={{ fontWeight: 600 }}>
                    Description – Optional
                  </EuiText>
                  <EuiText size="xs" color="subdued" style={{ marginBottom: 4 }}>
                    Describe the purpose of the workload group.
                  </EuiText>
                  <EuiTextArea
                    placeholder="Describe the workload group"
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      setIsSaved(false);
                    }}
                  />
                </>
              </EuiFormRow>

              {/* Resiliency Mode */}
              <EuiFormRow>
                <>
                  <EuiText size="m" style={{ fontWeight: 600 }}>
                    Resiliency mode
                  </EuiText>
                  <EuiText size="xs" color="subdued" style={{ marginBottom: 4 }}>
                    Select a resiliency mode.
                  </EuiText>
                  <EuiRadioGroup
                    options={resiliencyOptions}
                    idSelected={resiliencyMode}
                    onChange={(id) => {
                      setResiliencyMode(id as ResiliencyMode);
                      setIsSaved(false);
                    }}
                  />
                </>
              </EuiFormRow>

              <EuiSpacer size="l" />

              {/* Index Wildcard */}
              {rules.map((rule, idx) => (
                <EuiPanel
                  key={idx}
                  paddingSize="m"
                  style={{ position: 'relative', marginBottom: 16 }}
                >
                  <EuiTitle size="s">
                    <h3>Rule {idx + 1}</h3>
                  </EuiTitle>

                  <EuiText size="s" style={{ marginTop: 8, marginBottom: 16 }}>
                    {/* Define your rule using any combination of index, role, or username.*/}
                    Define your rule using index.
                  </EuiText>

                  {/* Index */}
                  <EuiFormRow isInvalid={Boolean(indexErrors[idx])} error={indexErrors[idx]}>
                    <>
                      <EuiText size="m" style={{ fontWeight: 600 }}>
                        Index wildcard
                      </EuiText>
                      <EuiSpacer size="s" />
                      <EuiFieldText
                        data-testid="indexInput"
                        value={rule.index}
                        onChange={(e) => {
                          const value = e.target.value;
                          const trimmedValue = value.trim();

                          const updatedRules = [...rules];
                          const updatedErrors = [...indexErrors];
                          updatedRules[idx].index = value;

                          let error: string | null = null;

                          // 1) Entirely empty?
                          if (trimmedValue === '') {
                            error = 'Please specify at least one index.';
                          } else {
                            // split on commas, trim each segment
                            const items = value.split(',').map((s) => s.trim());

                            // 2) Any blank item?
                            if (items.some((item) => item === '')) {
                              error = 'Index names cannot be empty.';
                            }
                            // 3) Any item too long?
                            else if (items.some((item) => item.length > 100)) {
                              error = 'Index names must be 100 characters or fewer.';
                            }
                            // 4) Too many items?
                            else if (items.length > 10) {
                              error = 'You can specify at most 10 indexes per rule.';
                            }
                          }

                          updatedErrors[idx] = error;
                          setRules(updatedRules);
                          setIndexErrors(updatedErrors);
                          setIsSaved(false);
                        }}
                        isInvalid={Boolean(indexErrors[idx])}
                      />
                      <EuiText size="xs" color="subdued" style={{ marginBottom: 4 }}>
                        You can use (,) to add multiple indexes.
                      </EuiText>
                    </>
                  </EuiFormRow>

                  {/* <EuiSpacer size="s" />*/}

                  {/* <div style={{ marginTop: 16 }}>*/}
                  {/*  <EuiText size="m" style={{ fontWeight: 600 }}>*/}
                  {/*    Role*/}
                  {/*  </EuiText>*/}
                  {/*  <EuiTextArea*/}
                  {/*    placeholder="Enter role"*/}
                  {/*    value={rule.role}*/}
                  {/*    onChange={(e) => {*/}
                  {/*      const updated = [...rules];*/}
                  {/*      updated[idx].role = e.target.value;*/}
                  {/*      setRules(updated);*/}
                  {/*    }}*/}
                  {/*  />*/}
                  {/*  <EuiText size="xs" color="subdued" style={{ marginBottom: 4 }}>*/}
                  {/*    You can use (,) to add multiple roles.*/}
                  {/*  </EuiText>*/}
                  {/* </div>*/}

                  {/* <EuiSpacer size="s" />*/}

                  {/* <div>*/}
                  {/*  <EuiText size="m" style={{ fontWeight: 600 }}>*/}
                  {/*    Username*/}
                  {/*  </EuiText>*/}
                  {/*  <EuiTextArea*/}
                  {/*    placeholder="Username"*/}
                  {/*    value={rule.username}*/}
                  {/*    onChange={(e) => {*/}
                  {/*      const updated = [...rules];*/}
                  {/*      updated[idx].username = e.target.value;*/}
                  {/*      setRules(updated);*/}
                  {/*    }}*/}
                  {/*  />*/}
                  {/*  <EuiText size="xs" color="subdued" style={{ marginBottom: 4 }}>*/}
                  {/*    You can use (,) to add multiple usernames.*/}
                  {/*  </EuiText>*/}
                  {/* </div>*/}

                  <EuiButtonIcon
                    iconType="trash"
                    aria-label="Delete rule"
                    color="danger"
                    onClick={() => {
                      const updated = rules.filter((_, i) => i !== idx);
                      const errors = indexErrors.filter((_, i) => i !== idx);
                      setRules(updated);
                      setIndexErrors(errors);
                      setIsSaved(false);
                    }}
                    style={{ position: 'absolute', top: 12, right: 12 }}
                  />
                </EuiPanel>
              ))}
              <EuiButton
                onClick={() => {
                  setRules([...rules, { index: '', indexId: '' }]);
                  setIndexErrors([...indexErrors, null]);
                  setIsSaved(false);
                }}
                disabled={rules.length >= 5}
              >
                + Add another rule
              </EuiButton>

              <EuiSpacer size="l" />

              {/* Resource Thresholds */}
              <EuiTitle size="s">
                <h2>Resource thresholds</h2>
              </EuiTitle>

              <EuiSpacer size="s" />

              {/* CPU Usage Limit */}
              <EuiFormRow
                isInvalid={cpuLimit !== undefined && (cpuLimit <= 0 || cpuLimit > 100)}
                error="Value must be between 0 and 100"
              >
                <>
                  <label htmlFor="cpu-threshold-input">
                    <EuiText size="m" style={{ fontWeight: 600 }}>
                      Reject queries when CPU usage exceeds
                    </EuiText>
                  </label>
                  <EuiFieldNumber
                    id="cpu-threshold-input"
                    data-testid="cpu-threshold-input"
                    value={cpuLimit}
                    onChange={(e) => {
                      const val = e.target.value;
                      const newVal = val === '' ? undefined : Number(val);

                      // If it was originally defined, do not allow clearing it
                      if (originalCpuLimit !== undefined && newVal === undefined) {
                        core.notifications.toasts.addWarning('Once set, CPU limit cannot be cleared.');
                        return;
                      }
                      setCpuLimit(newVal);
                      setIsSaved(false);
                    }}
                    onKeyDown={(e) => {
                      if (['e', 'E', '+', '-'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    append="%"
                    min={0}
                    max={100}
                  />
                </>
              </EuiFormRow>

              <EuiSpacer size="m" />

              {/* Memory Usage Limit */}
              <EuiFormRow
                isInvalid={memoryLimit !== undefined && (memoryLimit <= 0 || memoryLimit > 100)}
                error="Value must be between 0 and 100"
              >
                <>
                  <label htmlFor="memory-threshold-input">
                    <EuiText size="m" style={{ fontWeight: 600 }}>
                      Reject queries when memory usage exceeds
                    </EuiText>
                  </label>
                  <EuiFieldNumber
                    id="memory-threshold-input"
                    data-testid="memory-threshold-input"
                    value={memoryLimit}
                    onChange={(e) => {
                      const val = e.target.value;
                      const newVal = val === '' ? undefined : Number(val);

                      // If it was originally defined, do not allow clearing it
                      if (originalMemoryLimit !== undefined && newVal === undefined) {
                        core.notifications.toasts.addWarning('Once set, memory limit cannot be cleared.');
                        return;
                      }

                      setMemoryLimit(newVal);
                      setIsSaved(false);
                    }}
                    onKeyDown={(e) => {
                      if (['e', 'E', '+', '-'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    append="%"
                    min={0}
                    max={100}
                  />
                </>
              </EuiFormRow>

              <EuiSpacer size="m" />

              {/* Apply Changes Button */}
              <EuiButton onClick={saveChanges} color="primary" isDisabled={isSaved || isInvalid}>
                Apply Changes
              </EuiButton>
            </>
          )}
        </EuiPanel>
      )}
    </div>
  );
};
