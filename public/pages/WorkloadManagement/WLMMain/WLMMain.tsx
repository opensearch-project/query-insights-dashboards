import React, { useState, useEffect } from 'react';
import {
  EuiTitle,
  EuiSpacer,
  EuiButton,
  EuiPanel,
  EuiStat,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBasicTable,
  Criteria,
  EuiIcon,
  EuiText,
  EuiFieldSearch,
  EuiLink,
} from '@elastic/eui';
import { useHistory, useLocation } from 'react-router-dom';
import { AppMountParameters, CoreStart } from 'opensearch-dashboards/public';
import { DataSourceManagementPluginSetup } from '../../../../../../src/plugins/data_source_management/public';
import {PageHeader} from "../../../components/PageHeader";
import {QueryInsightsDashboardsPluginStartDependencies} from "../../../types";
import ReactECharts from 'echarts-for-react';



interface WorkloadGroupData {
  name: string;
  cpuUsage: number;
  memoryUsage: number;
  totalCompletion: number;
  totalRejections: number;
  totalCancellations: number;
  topQueriesLink: string;
  cpuStats: number[];
  memStats: number[];
  cpuLimit: number;
  memLimit: number;
}

export const WLM = '/workloadManagement';

const workloadGroups: WorkloadGroupData[] = [
  {
    name: 'group1',
    cpuUsage: 80,
    memoryUsage: 80,
    totalCompletion: 23,
    totalRejections: 1,
    totalCancellations: 0,
    topQueriesLink: '#',
    cpuStats: [60, 70, 80, 85, 95],
    memStats: [50, 70, 80, 90, 100],
    cpuLimit: 8,
    memLimit: 90,
  },
  {
    name: 'group2',
    cpuUsage: 85,
    memoryUsage: 70,
    totalCompletion: 45,
    totalRejections: 0,
    totalCancellations: 30,
    topQueriesLink: '#',
    cpuStats: [55, 65, 85, 90, 100],
    memStats: [40, 55, 65, 85, 95],
    cpuLimit: 88,
    memLimit: 85,
  },
  {
    name: 'group3',
    cpuUsage: 76,
    memoryUsage: 65,
    totalCompletion: 20,
    totalRejections: 4,
    totalCancellations: 10,
    topQueriesLink: '#',
    cpuStats: [50, 60, 76, 80, 90],
    memStats: [45, 60, 70, 75, 85],
    cpuLimit: 80,
    memLimit: 80,
  },
  {
    name: 'group4',
    cpuUsage: 90,
    memoryUsage: 90,
    totalCompletion: 17,
    totalRejections: 0,
    totalCancellations: 16,
    topQueriesLink: '#',
    cpuStats: [70, 80, 90, 95, 100],
    memStats: [60, 75, 85, 90, 95],
    cpuLimit: 92,
    memLimit: 95,
  },
  {
    name: 'group5',
    cpuUsage: 60,
    memoryUsage: 80,
    totalCompletion: 5,
    totalRejections: 0,
    totalCancellations: 3,
    topQueriesLink: '#',
    cpuStats: [40, 50, 60, 65, 75],
    memStats: [45, 55, 65, 75, 80],
    cpuLimit: 75,
    memLimit: 85,
  },
  {
    name: 'group6',
    cpuUsage: 92,
    memoryUsage: 85,
    totalCompletion: 6,
    totalRejections: 6,
    totalCancellations: 1,
    topQueriesLink: '#',
    cpuStats: [75, 80, 90, 92, 98],
    memStats: [65, 75, 85, 87, 95],
    cpuLimit: 95,
    memLimit: 90,
  },
  {
    name: 'group7',
    cpuUsage: 88,
    memoryUsage: 77,
    totalCompletion: 24,
    totalRejections: 0,
    totalCancellations: 6,
    topQueriesLink: '#',
    cpuStats: [65, 70, 88, 89, 96],
    memStats: [55, 65, 77, 80, 88],
    cpuLimit: 90,
    memLimit: 80,
  },
  {
    name: 'group8',
    cpuUsage: 78,
    memoryUsage: 66,
    totalCompletion: 34,
    totalRejections: 3,
    totalCancellations: 5,
    topQueriesLink: '#',
    cpuStats: [58, 68, 78, 79, 86],
    memStats: [52, 62, 66, 70, 76],
    cpuLimit: 85,
    memLimit: 75,
  },
  {
    name: 'group9',
    cpuUsage: 81,
    memoryUsage: 72,
    totalCompletion: 32,
    totalRejections: 23,
    totalCancellations: 0,
    topQueriesLink: '#',
    cpuStats: [60, 70, 81, 83, 92],
    memStats: [50, 60, 72, 74, 85],
    cpuLimit: 86,
    memLimit: 82,
  },
  {
    name: 'group91',
    cpuUsage: 95,
    memoryUsage: 89,
    totalCompletion: 89,
    totalRejections: 45,
    totalCancellations: 0,
    topQueriesLink: '#',
    cpuStats: [8, 85, 95, 96, 99],
    memStats: [75, 80, 89, 90, 97],
    cpuLimit: 98,
    memLimit: 94,
  },
];


// Initialize sorted data
const sortedData = [...workloadGroups].sort((a, b) => b.cpuUsage - a.cpuUsage);

const WorkloadManagement = ({
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
  const history = useHistory();
  const location = useLocation();
  const [data, setData] = useState<WorkloadGroupData[]>(sortedData);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<keyof WorkloadGroupData>('cpuUsage');
  const [sortDirection, setSortDirection] = useState<'desc'>('desc');
  const [filteredData, setFilteredData] = useState<WorkloadGroupData[]>(sortedData);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: filteredData.length,
    pageSizeOptions: [5, 10, 15],
  };

  const onTableChange = (criteria: Criteria<WorkloadGroupData>) => {
    const { sort, page } = criteria;

    let updatedData = [...filteredData];

    if (sort) {
      const field = sort.field as keyof WorkloadGroupData;

      updatedData.sort((a, b) => {
        const fieldA = a[field];
        const fieldB = b[field];

        if (typeof fieldA === 'number' && typeof fieldB === 'number') {
          return fieldB - fieldA; // Always descending
        }
        return String(fieldB).localeCompare(String(fieldA));
      });

      setSortField(field);
      setSortDirection('desc'); // Always descending
      setFilteredData(updatedData);
    }

    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  };


  // Fetch Data from Backend
  const fetchDataFromBackend = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/workload-groups'); // Replace with actual API endpoint
      const freshData = await response.json();
      setData(freshData);
      setFilteredData(freshData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  // Initial Fetch
  // useEffect(() => {
  //   fetchDataFromBackend();
  // }, []);

  useEffect(() => {
    core.chrome.setBreadcrumbs([
      {
        text: 'Data Administration',
        href: WLM,
        onClick: (e) => {
          e.preventDefault();
          history.push(WLM);
        },
      },
    ]);
  }, [core.chrome, history, location]);

  // Handle Search Filtering
  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    if (!query) {
      setFilteredData(data);
    } else {
      setFilteredData(
        data.filter((group) => group.name.toLowerCase().includes(query))
      );
    }
  };

// Function to generate Boxplot Config with Red Limit Line
  const getBoxplotOption = (boxData: number[], limit: number) => {
    if (!boxData) return {};

    const sortedData = [...boxData].sort((a, b) => a - b);
    const minValue = sortedData[0];
    const q1 = sortedData[1];
    const median = sortedData[2];
    const q3 = sortedData[3];
    const maxValue = sortedData[4];

    return {
      tooltip: {
        trigger: 'item',
        formatter: function (params) {
          if (params.seriesType === 'boxplot') {
            return `
            Min: ${params.data[1]}<br/>
            Q1: ${params.data[2]}<br/>
            Median: ${params.data[3]}<br/>
            Q3: ${params.data[4]}<br/>
            Max: ${params.data[5]}<br/>
            <span style="color:#dc3545;">Limit: ${limit}</span>
          `;
          }
          return '';
        },
      },
      grid: { left: '0%', right: '10%', top: '0%', bottom: '0%' },
      xAxis: {
        type: 'value',
        min: Math.min(minValue, limit) - 5,
        max: Math.max(maxValue, limit) + 5,
        show: false,
      },
      yAxis: {
        type: 'category',
        data: ['Boxplot'],
        show: false,
      },
      series: [
        {
          name: 'Boxplot',
          type: 'boxplot',
          data: [[minValue, q1, median, q3, maxValue]],
          itemStyle: { color: '#0268BC', borderColor: '#2A5EBA' },
          boxWidth: ['40%', '50%'],
        },
        {
          name: 'Limit',
          type: 'scatter',
          symbol: 'rect',
          symbolSize: [3, 35],
          data: [[limit, 0]],
          itemStyle: { color: '#dc3545' },
        },
      ],
    };
  };

  const columns = [
    {
      field: 'name',
      name: <EuiText size="m">Workload group name</EuiText>,
      sortable: true,
      render: (name: string) => (
        <EuiLink
          onClick={() => {
            history.push(`/wlm-details?id=${name}`);
          }}
          style={{ color: '#0073e6', textDecoration: 'none' }}
        >
          {name}
        </EuiLink>
      ),
    },
    {
      field: 'cpuUsage',
      name: <EuiText size="m">CPU usage</EuiText>,
      sortable: true,
      render: (cpuUsage: number, item: WorkloadGroupData) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ReactECharts
            option={getBoxplotOption(item.cpuStats, item.cpuLimit)}
            style={{ width: 120, height: 50 }}
          />
          {cpuUsage}%
        </div>
      ),
    },
    {
      field: 'memoryUsage',
      name: <EuiText size="m">Memory usage</EuiText>,
      sortable: true,
      render: (memoryUsage: number, item: WorkloadGroupData) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ReactECharts
            option={getBoxplotOption(item.memStats, item.memLimit)}
            style={{ width: 120, height: 50 }}
          />
          {memoryUsage}%
        </div>
      ),
    },
    {
      field: 'totalCompletion',
      name: <EuiText size="m">Total completion</EuiText>,
      sortable: true,
    },
    {
      field: 'totalRejections',
      name: <EuiText size="m">Total rejections</EuiText>,
      sortable: true,
    },
    {
      field: 'totalCancellations',
      name: <EuiText size="m">Total cancellations</EuiText>,
      sortable: true,
    },
    {
      field: 'topQueriesLink',
      name: <EuiText size="m">Top N Queries</EuiText>,
      render: (link: string) => (
        <a href={link} style={{ color: '#0073e6', display: 'flex', alignItems: 'center', gap: '5px' }} target="_blank" rel="noopener noreferrer">
          View <EuiIcon type="popout" size="s" />
        </a>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        coreStart={core}
        depsStart={depsStart}
        fallBackComponent={
          <>
            <EuiSpacer size="l" />
          </>
        }
      />

      {/* Page Title and Create Button */}
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="l">
            <h1>Workload groups</h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton fill style={{ backgroundColor: '#0268BC', borderColor: '#0268BC', color: 'white' }}>
            + Create workload group
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />

      {/* Statistics Panel */}
      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem><EuiPanel paddingSize="m"><EuiStat title="10" description="Total workload groups" /></EuiPanel></EuiFlexItem>
        <EuiFlexItem><EuiPanel paddingSize="m"><EuiStat title="6" description="Total groups exceeding limits" titleColor="danger" /></EuiPanel></EuiFlexItem>
        <EuiFlexItem><EuiPanel paddingSize="m"><EuiStat title="14" description="Total completion" /></EuiPanel></EuiFlexItem>
        <EuiFlexItem><EuiPanel paddingSize="m"><EuiStat title="148" description="Total rejections" /></EuiPanel></EuiFlexItem>
        <EuiFlexItem><EuiPanel paddingSize="m"><EuiStat title="34" description="Total cancellations" /></EuiPanel></EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xl" />

      {/* Table Panel */}
      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            {/* Search Bar & Refresh Button */}
            <EuiFlexGroup gutterSize="m" alignItems="center" style={{ marginBottom: '20px' }}>
              <EuiFlexItem>
                <EuiFieldSearch
                  placeholder="Search workload groups"
                  value={searchQuery}
                  onChange={onSearchChange}
                  fullWidth
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton onClick={fetchDataFromBackend} iconType="refresh" isLoading={loading}>
                  Refresh
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
            <EuiBasicTable<WorkloadGroupData>
              items={filteredData.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)}
              columns={columns}
              sorting={{ sort: { field: sortField as keyof WorkloadGroupData, direction: 'desc' } }} // Always descending
              onChange={onTableChange}
              pagination={pagination}
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

export default WorkloadManagement;

