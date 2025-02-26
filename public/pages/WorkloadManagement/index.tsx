import React, { useState, useEffect } from 'react';
import {
  EuiTitle,
  EuiSpacer,
  EuiTabs,
  EuiTab,
  EuiPanel,
  EuiStat,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBasicTable,
  Criteria,
} from '@elastic/eui';
import QueryGroupDetails from './QueryGroupDetails';

export const WORKLOAD_MANAGEMENT = '/workloadManagement';

interface QueryGroupData {
  queryGroup: string;
  avgUsage: string;
  limit: string;
  rejections: number;
  cancellations: number;
}

// Function to sort by avgUsage in descending order
const sortByAvgUsageDesc = (data: QueryGroupData[]) =>
  [...data].sort((a, b) => parseInt(b.avgUsage) - parseInt(a.avgUsage));

// Mock Data for CPU Usage
const initialCpuData: QueryGroupData[] = sortByAvgUsageDesc(
  Array.from({ length: 25 }, (_, i) => ({
    queryGroup: `Group ${i + 1}`,
    avgUsage: `${Math.floor(Math.random() * 100)}`,
    limit: `${Math.floor(Math.random() * 100)}%`,
    rejections: Math.floor(Math.random() * 50),
    cancellations: Math.floor(Math.random() * 10),
  }))
);

// Mock Data for Memory Usage
const initialMemoryData: QueryGroupData[] = sortByAvgUsageDesc(
  Array.from({ length: 25 }, (_, i) => ({
    queryGroup: `Group ${i + 1}`,
    avgUsage: `${Math.floor(Math.random() * 100)}`,
    limit: `${Math.floor(Math.random() * 100)}%`,
    rejections: Math.floor(Math.random() * 50),
    cancellations: Math.floor(Math.random() * 10),
  }))
);

// Sample Node Usage Data
interface NodeUsageData {
  nodeId: string;
  cpuUsage: number;
  memoryUsage: number;
}

const nodeUsageData: NodeUsageData[] = [
  { nodeId: 'TSpmh9W4boYB_Dw', cpuUsage: 50, memoryUsage: 80 },
  { nodeId: 'Spmh9W4boYB_Dw', cpuUsage: 40, memoryUsage: 40 },
  { nodeId: 'Upmh9W4boYB_Dw', cpuUsage: 40, memoryUsage: 90 },
  { nodeId: 'TSpmh9W4boYB_Dw', cpuUsage: 40, memoryUsage: 90 },
  { nodeId: 'Spmh9W4boYB_Dw', cpuUsage: 40, memoryUsage: 40 },
  { nodeId: 'Upmh9W4boYB_Dw', cpuUsage: 40, memoryUsage: 40 },
  { nodeId: 'TSpmh9W4boYB_Dw', cpuUsage: 40, memoryUsage: 90 },
  { nodeId: 'Spmh9W4boYB_Dw', cpuUsage: 40, memoryUsage: 40 },
  { nodeId: 'Upmh9W4boYB_Dw', cpuUsage: 40, memoryUsage: 40 },
  { nodeId: 'TSpmh9W4boYB_Dw', cpuUsage: 40, memoryUsage: 90 },
  { nodeId: 'Spmh9W4boYB_Dw', cpuUsage: 40, memoryUsage: 40 },
  { nodeId: 'Upmh9W4boYB_Dw', cpuUsage: 40, memoryUsage: 40 },
];


const WorkloadManagement = () => {
  const [cpuData, setCpuData] = useState<QueryGroupData[]>(initialCpuData);
  const [memoryData, setMemoryData] = useState<QueryGroupData[]>(initialMemoryData);
  const [sortField, setSortField] = useState<keyof QueryGroupData>('avgUsage');
  const [sortDirection, setSortDirection] = useState<'desc'>('desc'); // Always descending
  const [selectedTab, setSelectedTab] = useState(WORKLOAD_MANAGEMENT);
  const [selectedQueryGroup, setSelectedQueryGroup] = useState<QueryGroupData | null>(null);

  const onQueryGroupClick = (queryGroup: QueryGroupData) => {
    setSelectedQueryGroup(queryGroup);
  };



  // Pagination State
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Sort data on mount
  useEffect(() => {
    setCpuData(sortByAvgUsageDesc(cpuData));
    setMemoryData(sortByAvgUsageDesc(memoryData));
  }, []);

  // Handle sorting and pagination
  const onTableChange = (
    criteria: Criteria<QueryGroupData>,
    setData: React.Dispatch<React.SetStateAction<QueryGroupData[]>>
  ) => {
    const { sort, page } = criteria;

    if (sort) {
      const { field } = sort;
      const sortedData = [...cpuData].sort((a, b) =>
        parseInt(b[field as keyof QueryGroupData] as string) -
        parseInt(a[field as keyof QueryGroupData] as string)
      );

      setSortField(field);
      setSortDirection('desc');
      setData(sortedData);
    }

    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  };

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: cpuData.length,
    pageSizeOptions: [5, 10, 15, 20],
  };

  const tabs = [{ id: 'workloadManagement', name: 'Overview', route: WORKLOAD_MANAGEMENT }];

  const onSelectedTabChanged = (route: string) => {
    setSelectedTab(route);
  };

  const renderTab = (tab: { route: string; id: string; name: string }) => (
    <EuiTab
      onClick={() => onSelectedTabChanged(tab.route)}
      isSelected={selectedTab === tab.route}
      key={tab.id}
    >
      {tab.name}
    </EuiTab>
  );

  return (
    <div style={{ padding: '35px 35px' }}>
      <EuiTitle size="l">
        <h1>Workload Management</h1>
      </EuiTitle>
      <EuiSpacer size="l" />

      {/* Tabs */}
      <EuiTabs>{tabs.map(renderTab)}</EuiTabs>
      <EuiSpacer size="l" />

      {/* Statistics Panel */}
      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiStat title="4" description="Total query groups" />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiStat title="14" description="Total completion" />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiStat title="148" description="Total rejections" />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiStat title="34" description="Total cancellations" />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xl" />

      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTitle size="m">
              <h3>Groups Over CPU Usage Limit</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiBasicTable
              items={cpuData.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)}
              rowProps={() => ({
                style: { height: '50px' },
              })}
              columns={[
                {
                  field: 'queryGroup',
                  name: 'Query Group',
                  render: (name: string, record: QueryGroupData) => (
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        onQueryGroupClick(record);
                      }}
                      style={{ color: 'blue', textDecoration: 'underline' }}
                    >
                      {name}
                    </a>
                  ),
                },
                { field: 'avgUsage', name: 'Average CPU Usage', sortable: true },
                { field: 'limit', name: 'Usage Limit', sortable: true },
                { field: 'rejections', name: 'Rejections', sortable: true },
                { field: 'cancellations', name: 'Cancellations', sortable: true },
              ]}
              sorting={{ sort: { field: sortField, direction: sortDirection } }}
              onChange={(criteria) => onTableChange(criteria, setCpuData)}
              pagination={pagination}
            />
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTitle size="m">
              <h3>Groups Over Memory Usage Limit</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiBasicTable
              items={memoryData.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)}
              rowProps={() => ({
                style: { height: '50px' },
              })}
              columns={[
                {
                  field: 'queryGroup',
                  name: 'Query Group',
                  render: (name: string, record: QueryGroupData) => (
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        onQueryGroupClick(record);
                      }}
                      style={{ color: 'blue', textDecoration: 'underline' }}
                    >
                      {name}
                    </a>
                  ),
                },
                { field: 'avgUsage', name: 'Average Memory Usage', sortable: true },
                { field: 'limit', name: 'Usage Limit', sortable: true },
                { field: 'rejections', name: 'Rejections', sortable: true },
                { field: 'cancellations', name: 'Cancellations', sortable: true },
              ]}
              sorting={{ sort: { field: sortField, direction: sortDirection } }}
              onChange={(criteria) => onTableChange(criteria, setMemoryData)}
              pagination={pagination}
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      {selectedQueryGroup && (
        <QueryGroupDetails
          queryGroup={selectedQueryGroup.queryGroup}
          cpuUsageLimit={parseInt(selectedQueryGroup.limit)}
          memoryUsageLimit={parseInt(selectedQueryGroup.limit)}
          totalCompletion={14}
          totalRejections={selectedQueryGroup.rejections}
          totalCancellations={selectedQueryGroup.cancellations}
          nodeData={nodeUsageData}
          onClose={() => setSelectedQueryGroup(null)}
        />
      )}

    </div>
  );
};

export default WorkloadManagement;

