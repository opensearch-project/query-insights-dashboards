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
  EuiSelect,
  EuiFormRow,
} from '@elastic/eui';
import { useHistory, useLocation } from 'react-router-dom';
import { CoreStart } from 'opensearch-dashboards/public';
import {PageHeader} from "../../../components/PageHeader";
import {QueryInsightsDashboardsPluginStartDependencies} from "../../../types";
import ReactECharts from 'echarts-for-react';



export const WLM = '/workloadManagement';

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

interface GroupStats {
  total_completions?: number;
  total_rejections?: number;
  total_cancellations?: number;
  cpu?: { current_usage?: number };
  memory?: { current_usage?: number };
}

const WorkloadManagement = ({
  core,
  depsStart,
}: {
  core: CoreStart;
  depsStart: QueryInsightsDashboardsPluginStartDependencies;
}) => {
  const history = useHistory();
  const location = useLocation();

  // === State ===
  const [data, setData] = useState<WorkloadGroupData[]>([]);
  const [filteredData, setFilteredData] = useState<WorkloadGroupData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<keyof WorkloadGroupData>('cpuUsage');

  const [nodeIds, setNodeIds] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<string>('');
  const [summaryStats, setSummaryStats] = useState({
    totalGroups: "-" as string | number,
    totalCompletions: "-" as string | number,
    totalRejections: "-" as string | number,
    totalCancellations: "-" as string | number,
    groupsExceedingLimits: "-" as string | number,
  });

  // === Table Sorting / Pagination ===
  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: filteredData.length,
    pageSizeOptions: [5, 10, 15],
  };

  const onTableChange = (criteria: Criteria<WorkloadGroupData>) => {
    const { sort, page } = criteria;

    let updated = [...filteredData];
    if (sort) {
      const field = sort.field as keyof WorkloadGroupData;
      updated.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        return typeof aVal === 'number' && typeof bVal === 'number'
          ? (bVal as number) - (aVal as number)
          : String(bVal).localeCompare(String(aVal));
      });
      setSortField(field);
    }

    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }

    setFilteredData(updated);
  };

  // === API Calls ===
  const fetchDataFromBackend = async () => {
    setLoading(true);
    try {
      const res = await core.http.get('/api/_wlm/stats');
      const response = res.body ?? res;
      const nodes: string[] = [];

      for (const nodeId in response) {
        if (nodeId === "_nodes" || nodeId === "cluster_name") continue;
        nodes.push(nodeId);
      }

      setNodeIds(nodes);

      if (nodes.length > 0) {
        const defaultNode = selectedNode || nodes[0];
        setSelectedNode(defaultNode);
        await fetchStatsForNode(defaultNode);
      }
    } catch (err) {
      console.error('Error fetching WLM stats:', err);
    }
    setLoading(false);
  };

  const fetchStatsForNode = async (nodeId: string) => {
    setLoading(true);

    try {
      const idToName = await fetchQueryGroupNameMap();
      const queryGroups = await fetchQueryGroupsForNode(nodeId);
      const allStats = await fetchAllNodeStats();
      allStats[nodeId] = { ...allStats[nodeId], query_groups: queryGroups };

      const result: WorkloadGroupData[] = [];

      let totalGroups = 0,
        totalCompletions = 0,
        totalRejections = 0,
        totalCancellations = 0,
        overLimit = 0;

      for (const [groupId, groupStats] of Object.entries(queryGroups) as [string, GroupStats][]) {
        const {
          cpuUsage,
          memoryUsage,
          cpuLimit,
          memLimit,
          cpuStats,
          memStats,
        } = await processGroupStats(groupId, groupStats, idToName, allStats);

        totalGroups += 1;
        totalCompletions += groupStats.total_completions ?? 0;
        totalRejections += groupStats.total_rejections ?? 0;
        totalCancellations += groupStats.total_cancellations ?? 0;
        if (cpuUsage > cpuLimit || memoryUsage > memLimit) overLimit++;

        const name = groupId === 'DEFAULT_QUERY_GROUP' ? groupId : idToName[groupId];
        result.push({
          name,
          cpuUsage,
          memoryUsage,
          totalCompletion: groupStats.total_completions ?? 0,
          totalRejections: groupStats.total_rejections ?? 0,
          totalCancellations: groupStats.total_cancellations ?? 0,
          topQueriesLink: `/query-group-details?id=${groupId}`,
          cpuStats,
          memStats,
          cpuLimit,
          memLimit,
        });
      }

      setData(result);
      setFilteredData(result);
      setSummaryStats({
        totalGroups,
        totalCompletions,
        totalRejections,
        totalCancellations,
        groupsExceedingLimits: overLimit,
      });
    } catch (err) {
      console.error(`Failed to fetch node stats:`, err);
    }

    setLoading(false);
  };

  // === Helpers ===
  const fetchQueryGroupNameMap = async (): Promise<Record<string, string>> => {
    const res = await core.http.get('/api/_wlm/query_group');
    const groups = res.body?.query_groups ?? res.query_groups ?? [];
    const map: Record<string, string> = {};
    for (const group of groups) {
      map[group._id] = group.name;
    }
    return map;
  };

  const fetchQueryGroupsForNode = async (nodeId: string): Promise<Record<string, GroupStats>> => {
    const res = await core.http.get(`/api/_wlm/${nodeId}/stats`);
    return (res.body ?? res)[nodeId]?.query_groups ?? {};
  };

  const fetchAllNodeStats = async (): Promise<any> => {
    return await core.http.get('/api/_wlm/stats');
  };

  const fetchResourceLimits = async (groupId: string, idToName: Record<string, string>) => {
    let cpuLimit = 100, memLimit = 100;
    if (groupId === 'DEFAULT_QUERY_GROUP') return { cpuLimit, memLimit };

    try {
      const res = await core.http.get(`/api/_wlm/query_group/${idToName[groupId]}`);
      const limits = res.body?.query_groups?.[0]?.resource_limits;
      cpuLimit = limits?.cpu ? Math.round(limits.cpu * 100) : cpuLimit;
      memLimit = limits?.memory ? Math.round(limits.memory * 100) : memLimit;
    } catch (err) {
      console.warn(`Limit fetch failed for ${groupId}:`, err);
    }

    return { cpuLimit, memLimit };
  };

  const computeBoxStats = (arr: number[]): number[] => {
    if (arr.length === 0) return [0, 0, 0, 0, 0];
    const sorted = [...arr].sort((a, b) => a - b);
    return [
      sorted[0],
      sorted[Math.floor(sorted.length * 0.25)],
      sorted[Math.floor(sorted.length * 0.5)],
      sorted[Math.floor(sorted.length * 0.75)],
      sorted[sorted.length - 1],
    ];
  };

  const gatherUsageAcrossNodes = (
    allStats: any,
    groupId: string
  ): { cpuStats: number[]; memStats: number[] } => {
    const cpuUsages: number[] = [];
    const memUsages: number[] = [];

    for (const nodeId in allStats) {
      if (nodeId === '_nodes' || nodeId === 'cluster_name') continue;
      const stats = allStats[nodeId]?.query_groups?.[groupId];
      if (stats) {
        cpuUsages.push((stats.cpu?.current_usage ?? 0) * 100);
        memUsages.push((stats.memory?.current_usage ?? 0) * 100);
      }
    }

    return {
      cpuStats: computeBoxStats(cpuUsages),
      memStats: computeBoxStats(memUsages),
    };
  };

  const processGroupStats = async (
    groupId: string,
    groupStats: GroupStats,
    idToName: Record<string, string>,
    allStats: any
  ) => {
    const cpuUsage = Math.round((groupStats.cpu?.current_usage ?? 0) * 100);
    const memoryUsage = Math.round((groupStats.memory?.current_usage ?? 0) * 100);

    const { cpuLimit, memLimit } = await fetchResourceLimits(groupId, idToName);
    const { cpuStats, memStats } = gatherUsageAcrossNodes(allStats, groupId);

    return { cpuUsage, memoryUsage, cpuLimit, memLimit, cpuStats, memStats };
  };

  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    if (!query) setFilteredData(data);
    else setFilteredData(data.filter((g) => g.name.toLowerCase().includes(query)));
  };

  const getBoxplotOption = (box: number[], limit: number) => {
    const sorted = [...box].sort((a, b) => a - b);
    const [min, q1, median, q3, max] = sorted;
    return {
      tooltip: {
        trigger: 'item',
        appendToBody: true,
        className: 'echarts-tooltip',
        formatter: (params: any) => {
          if (params.seriesType !== 'boxplot') return '';
          const [min, q1, median, q3, max] = params.data.slice(1, 6).map((v: number) => v.toFixed(2));
          const formattedLimit = Number(limit).toFixed(2);
          return `<strong>Usage across nodes</strong><br/>
                  Min: ${min}%<br/>
                  Q1: ${q1}%<br/>
                  Median: ${median}%<br/>
                  Q3: ${q3}%<br/>
                  Max: ${max}%<br/>
                  <span style="color:#dc3545;">Limit: ${formattedLimit}%</span>`;
                      }
      },
      grid: { left: '0%', right: '10%', top: '0%', bottom: '0%' },
      xAxis: { type: 'value', min: Math.min(min, limit) - 5, max: Math.max(max, limit) + 5, show: false },
      yAxis: { type: 'category', data: ['Boxplot'], show: false },
      series: [
        {
          name: 'Boxplot',
          type: 'boxplot',
          data: [[min, q1, median, q3, max]],
          itemStyle: { color: '#0268BC', borderColor: 'black' },
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

  // === Lifecycle ===
  useEffect(() => {
    fetchDataFromBackend();
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchDataFromBackend();
      core.notifications.toasts.addSuccess({
        title: 'Data refreshed',
        text: 'Workload stats have been updated automatically every 1 minute.',
      });
    }, 600000);

    return () => clearInterval(intervalId);
  }, [selectedNode]);

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

  // === Columns ===
  const columns = [
    {
      field: 'name',
      name: <EuiText size="m">Workload group name</EuiText>,
      sortable: true,
      render: (name: string) => (
        <EuiLink onClick={() => history.push(`/wlm-details?name=${name}`)} style={{ color: '#0073e6' }}>
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
        {/* Left: Title */}
        <EuiFlexItem grow={false}>
          <EuiTitle size="l">
            <h1>Workload groups</h1>
          </EuiTitle>
        </EuiFlexItem>

        {/* Right: Dropdown + Button */}
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiFormRow label="Data source" display="columnCompressed">
                <EuiSelect
                  options={nodeIds.map((id) => ({ value: id, text: id }))}
                  value={selectedNode || ''}
                  onChange={(e) => {
                    const nodeId = e.target.value;
                    setSelectedNode(nodeId);
                    fetchStatsForNode(nodeId);
                  }}
                  compressed
                />
              </EuiFormRow>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                style={{
                  backgroundColor: '#0268BC',
                  borderColor: '#0268BC',
                  color: 'white',
                }}
              >
                + Create workload group
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      {/* Statistics Panel */}
      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem><EuiPanel paddingSize="m"><EuiStat title={summaryStats.totalGroups} description="Total workload groups" /></EuiPanel></EuiFlexItem>
        <EuiFlexItem><EuiPanel paddingSize="m"><EuiStat title={summaryStats.groupsExceedingLimits} description="Total groups exceeding limits" titleColor="danger" /></EuiPanel></EuiFlexItem>
        <EuiFlexItem><EuiPanel paddingSize="m"><EuiStat title={summaryStats.totalCompletions} description="Total completion" /></EuiPanel></EuiFlexItem>
        <EuiFlexItem><EuiPanel paddingSize="m"><EuiStat title={summaryStats.totalRejections} description="Total rejections" /></EuiPanel></EuiFlexItem>
        <EuiFlexItem><EuiPanel paddingSize="m"><EuiStat title={summaryStats.totalCancellations} description="Total cancellations" /></EuiPanel></EuiFlexItem>
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

