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
} from '@elastic/eui';
import { useHistory, useLocation } from 'react-router-dom';
import { AppMountParameters, CoreStart } from 'opensearch-dashboards/public';
import { DataSourceManagementPluginSetup } from 'src/plugins/data_source_management/public';
import { PageHeader } from '../../../components/PageHeader';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../../types';
import { WLM_MAIN } from '../WorkloadManagement';

// Node Data Interface
interface NodeUsageData {
  nodeId: string;
  cpuUsage: number;
  memoryUsage: number;
}

// Mock Data for Workload Groups
const workloadGroups = {
  group1: { name: 'group1', cpuLimit: 75, memLimit: 75, resiliencyMode: 'Soft', description: '-' },
  group2: { name: 'group2', cpuLimit: 80, memLimit: 85, resiliencyMode: 'Enforced', description: 'Critical workloads' },
  group3: { name: 'group3', cpuLimit: 60, memLimit: 70, resiliencyMode: 'Soft', description: 'Low priority' },
};

// Mock Node Data
const mockNodesData: NodeUsageData[] = [
  { nodeId: 'TSpmh9W4boYB_Dw', cpuUsage: 40, memoryUsage: 90 },
  { nodeId: 'Spmh9W4boYB_Dw', cpuUsage: 40, memoryUsage: 40 },
  { nodeId: 'Upmh9W4boYB_Dw', cpuUsage: 40, memoryUsage: 40 },
  { nodeId: 'GSpmh9W4boYB_Dw', cpuUsage: 40, memoryUsage: 40 },
];

const WLMDetails = ({
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
  const history = useHistory();

  // Extract Workload Group ID from URL
  const searchParams = new URLSearchParams(location.search);
  const groupId = searchParams.get('id');

  // Get workload group details or fallback
  const workloadGroup = workloadGroups[groupId as keyof typeof workloadGroups] || {
    name: groupId || 'Unknown',
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
    workloadGroup.resiliencyMode.toLowerCase() // Convert to lowercase to match radio group IDs
  );
  const [cpuLimit, setCpuLimit] = useState(workloadGroup.cpuLimit);
  const [memoryLimit, setMemoryLimit] = useState(workloadGroup.memLimit);
  const [isSaved, setIsSaved] = useState(true);

  const resiliencyOptions = [
    { id: 'soft', label: 'Soft' },
    { id: 'enforced', label: 'Enforced' },
  ];

  // Function to Save Changes
  const saveChanges = () => {
    workloadGroup.resiliencyMode = resiliencyMode.charAt(0).toUpperCase() + resiliencyMode.slice(1);
    workloadGroup.cpuLimit = cpuLimit;
    workloadGroup.memLimit = memoryLimit;

    // backend API to send updated values
    // Example: core.http.put('/api/workload-group/update', { resiliencyMode, cpuLimit, memoryLimit });

    setIsSaved(true); // Indicate changes have been saved
  };

  const [nodesData, setNodesData] = useState<NodeUsageData[]>(mockNodesData);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<keyof NodeUsageData>('cpuUsage');
  const [sortedData, setSortedData] = useState<NodeUsageData[]>([]);
  const [selectedTab, setSelectedTab] = useState('resources');

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
                <EuiButton color="danger" iconType="trash">
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
