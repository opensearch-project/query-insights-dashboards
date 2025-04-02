import React, { useEffect, useState } from 'react';
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
import { CoreStart } from 'opensearch-dashboards/public';
import { PageHeader } from '../../../components/PageHeader';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../../types';
import { WLM_MAIN } from '../WorkloadManagement';

// Node Data Interface
interface NodeUsageData {
  nodeId: string;
  cpuUsage: number;
  memoryUsage: number;
}

// Mock Node Data


const WLMDetails = ({
  core,
  depsStart,
}: {
  core: CoreStart;
  depsStart: QueryInsightsDashboardsPluginStartDependencies;
}) => {
  const location = useLocation();
  const history = useHistory();

  // Extract Workload Group ID from URL
  const searchParams = new URLSearchParams(location.search);
  const groupName = searchParams.get('name');
  const [groupDetails, setGroupDetails] = useState<any>(null);

  // Get workload group details or fallback
  const workloadGroup = groupDetails || {
    name: groupName || 'Unknown',
    cpuLimit: '-',
    memLimit: '-',
    resiliencyMode: '-',
    description: '-',
  };

  // Tabs Data
  const tabs = [
    { id: 'resources', name: 'Resources' },
    { id: 'settings', name: 'Settings' },
  ];

  const [resiliencyMode, setResiliencyMode] = useState(
    workloadGroup.resiliencyMode.toLowerCase()
  );
  const [cpuLimit, setCpuLimit] = useState(workloadGroup.cpuLimit);
  const [memoryLimit, setMemoryLimit] = useState(workloadGroup.memLimit);
  const [isSaved, setIsSaved] = useState(true);

  const resiliencyOptions = [
    { id: 'soft', label: 'Soft' },
    { id: 'enforced', label: 'Enforced' },
  ];

  // Function to Save Changes
  const saveChanges = async () => {
    try {
      await core.http.put(`/api/_wlm/query_group/${groupName}`, {
        body: JSON.stringify({
          resiliency_mode: resiliencyMode,
          resource_limits: {
            cpu: cpuLimit / 100,
            memory: memoryLimit / 100,
          },
        }),
      });

      setIsSaved(true);
      core.notifications.toasts.addSuccess(`Saved changes for "${groupName}"`);
      fetchGroupDetails();
    } catch (err) {
      console.error('Failed to save changes:', err);
      core.notifications.toasts.addDanger(`Failed to save changes: ${err.body?.message || err.message}`);
    }
  };

  const deleteGroup = async () => {
    try {
      await core.http.delete(`/api/_wlm/query_group/${groupName}`);
      core.notifications.toasts.addSuccess(`Deleted workload group "${groupName}"`);
      history.push(WLM_MAIN);
    } catch (err) {
      console.error('Failed to delete group:', err);
      core.notifications.toasts.addDanger(`Failed to delete group: ${err.body?.message || err.message}`);
    }
  };

  const [nodesData, setNodesData] = useState<NodeUsageData[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<keyof NodeUsageData>('cpuUsage');
  const [sortedData, setSortedData] = useState<NodeUsageData[]>([]);
  const [selectedTab, setSelectedTab] = useState('resources');
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

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

  const getGroupIdFromName = async (groupName: string) => {
    try {
      const res = await core.http.get('/api/_wlm/query_group');
      const groups = res.body?.query_groups ?? res.query_groups ?? [];
      const match = groups.find((g: any) => g.name === groupName);
      return match?._id;
    } catch (e) {
      console.error('Failed to find groupId from name:', e);
      return null;
    }
  };

  const fetchGroupDetails = async () => {
    if (!groupName) return;
    if (groupName === 'DEFAULT_QUERY_GROUP') return; // Need to fix the exception later
    try {
      const response = await core.http.get(`/api/_wlm/query_group/${groupName}`);
      const queryGroup = response?.body?.query_groups?.[0];
      if (queryGroup) {
        setGroupDetails({
          name: queryGroup.name,
          cpuLimit: Math.round((queryGroup.resource_limits.cpu ?? 0) * 100),
          memLimit: Math.round((queryGroup.resource_limits.memory ?? 0) * 100),
          resiliencyMode: queryGroup.resiliency_mode,
          description: '-', // Set later
        });
        setResiliencyMode(queryGroup.resiliency_mode.toLowerCase());
        setCpuLimit(Math.round((queryGroup.resource_limits.cpu ?? 0) * 100));
        setMemoryLimit(Math.round((queryGroup.resource_limits.memory ?? 0) * 100));
      }
    } catch (err) {
      console.error('Failed to fetch workload group details:', err);
    }
  };

  useEffect(() => {
    fetchGroupDetails();
  }, [groupName]);

  useEffect(() => {
    const updateStats = async () => {
      if (!groupName) return;

      const groupId = await getGroupIdFromName(groupName);
      if (!groupId) return;

      try {
        const statsRes = await core.http.get(`/api/_wlm/stats/${groupId}`);
        const nodeStatsList = Object.entries(statsRes.body)
          .filter(([key]) => key !== '_nodes' && key !== 'cluster_name')
          .map(([nodeId, data]: [string, any]) => {
            const stats = data.query_groups?.[groupId];
            if (!stats) return null;

            return {
              nodeId,
              cpuUsage: Math.round((stats.cpu?.current_usage ?? 0) * 100),
              memoryUsage: Math.round((stats.memory?.current_usage ?? 0) * 100),
            };
          })
          .filter(Boolean) as NodeUsageData[];

        setNodesData(nodeStatsList);

      } catch (err) {
        console.error('Failed to fetch group stats', err);
      }
    };

    updateStats();
  }, [groupName]);

  const onTableChange = (criteria: Criteria<NodeUsageData>) => {
    const { sort, page } = criteria;

    if (sort) {
      const sorted = [...sortedData].sort((a, b) => {
        const valA = a[sort.field];
        const valB = b[sort.field];

        if (typeof valA === 'number' && typeof valB === 'number') {
          return valB - valA;
        }
        return String(valB).localeCompare(String(valA));
      });

      setSortField(sort.field);
      setSortedData(sorted);
    }

    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  };

  const pagination: Pagination = {
    pageIndex,
    pageSize,
    totalItemCount: sortedData.length,
    pageSizeOptions: [5, 10, 15, 20],
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
          <p>The following workload group will be permanently deleted. This action cannot be undone.</p>
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
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
              <EuiFlexItem>
                <EuiTitle size="l">
                  <h1>{workloadGroup.name}</h1>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton color="danger" iconType="trash" onClick={() => setIsDeleteModalVisible(true)}>
                  Delete
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="l" />
          </>
        }
      />

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
            <EuiText size="m">{workloadGroup.description}</EuiText>
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
            <EuiText size="m">{workloadGroup.cpuLimit}%</EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>Memory usage limit</strong>
            </EuiText>
            <EuiText size="m">{workloadGroup.memLimit}%</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiSpacer size="m" />
      <EuiHorizontalRule />

      {/* Tabs Section */}
      <EuiTabs>
        {tabs.map((tab) => (
          <EuiTab
            key={tab.id}
            isSelected={selectedTab === tab.id}
            onClick={() => setSelectedTab(tab.id)}
          >
            {tab.name}
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
                  <div style={{ marginLeft: '10px', width: '100px', height: '10px', background: '#ccc' }}>
                    <div style={{ width: `${cpuUsage}%`, height: '100%', background: cpuUsage > 80 ? '#C43D35' : '#0268BC' }} />
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
                  <div style={{ marginLeft: '10px', width: '100px', height: '10px', background: '#ccc' }}>
                    <div style={{ width: `${memoryUsage}%`, height: '100%', background: memoryUsage > 80 ? '#C43D35' : '#0268BC' }} />
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
          <EuiTitle size="m">
            <h2>Workload group settings</h2>
          </EuiTitle>
          <EuiSpacer size="m" />

          {/* Index Wildcard */}
          <EuiFormRow
            label={<strong>Associate queries by index wild card</strong>}
            helpText="You can use (*) to define a wildcard."
          >
            <EuiFieldText placeholder="security_logs*" />
          </EuiFormRow>

          <EuiSpacer size="m" />

          {/* Resiliency Mode */}
          <EuiFormRow label={<strong>Resiliency mode</strong>} helpText="Select resiliency mode">
            <EuiRadioGroup
              options={resiliencyOptions}
              idSelected={resiliencyMode}
              onChange={(id) => {
                setResiliencyMode(id);
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
          <EuiFormRow label="Reject queries when CPU usage is over">
            <EuiFieldNumber
              value={cpuLimit}
              onChange={(e) => {
                setCpuLimit(Number(e.target.value));
                setIsSaved(false);
              }}
              append="%"
              min={0}
              max={100}
            />
          </EuiFormRow>

          <EuiSpacer size="m" />

          {/* Memory Usage Limit */}
          <EuiFormRow label="Reject queries when memory usage is over">
            <EuiFieldNumber
              value={memoryLimit}
              onChange={(e) => {
                setMemoryLimit(Number(e.target.value));
                setIsSaved(false);
              }}
              append="%"
              min={0}
              max={100}
            />
          </EuiFormRow>

          <EuiSpacer size="m" />

          {/* Apply Changes Button */}
          <EuiButton
            onClick={saveChanges}
            color="primary"
            isDisabled={isSaved}
          >
            Apply Changes
          </EuiButton>
        </EuiPanel>
      )}
    </div>
  );
};

export default WLMDetails;
