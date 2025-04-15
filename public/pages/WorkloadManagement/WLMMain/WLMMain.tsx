/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

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
import ReactECharts from 'echarts-for-react';
import { PageHeader } from '../../../components/PageHeader';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../../types';

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
  groupId: string;
}

interface GroupStats {
  total_completions?: number;
  total_rejections?: number;
  total_cancellations?: number;
  cpu?: { current_usage?: number };
  memory?: { current_usage?: number };
}

interface QueryGroup {
  _id: string;
  name: string;
  resource_limits?: {
    cpu: number;
    memory: number;
  };
}

interface NodeStats {
  cpu?: {
    current_usage?: number;
  };
  memory?: {
    current_usage?: number;
  };
  query_groups?: {
    [groupId: string]: {
      cpu?: { current_usage?: number };
      memory?: { current_usage?: number };
    };
  };
}

// --- Pagination Constants ---
const DEFAULT_PAGE_INDEX = 0;
const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [5, 10, 15, 50];

const SUMMARY_STATS_KEYS = {
  totalGroups: 'totalGroups',
  totalCompletions: 'totalCompletions',
  totalRejections: 'totalRejections',
  totalCancellations: 'totalCancellations',
  groupsExceedingLimits: 'groupsExceedingLimits',
};

enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export const WorkloadManagementMain = ({
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

  const [pageIndex, setPageIndex] = useState(DEFAULT_PAGE_INDEX);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortField, setSortField] = useState<keyof WorkloadGroupData>('cpuUsage');
  const [sortDirection, setSortDirection] = useState<SortDirection>(SortDirection.DESC);

  const [nodeIds, setNodeIds] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<string>('');
  const [summaryStats, setSummaryStats] = useState({
    [SUMMARY_STATS_KEYS.totalGroups]: '-' as string | number,
    [SUMMARY_STATS_KEYS.totalCompletions]: '-' as string | number,
    [SUMMARY_STATS_KEYS.totalRejections]: '-' as string | number,
    [SUMMARY_STATS_KEYS.totalCancellations]: '-' as string | number,
    [SUMMARY_STATS_KEYS.groupsExceedingLimits]: '-' as string | number,
  });

  // === Table Sorting / Pagination ===
  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: filteredData.length,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
  };

  const onTableChange = (criteria: Criteria<WorkloadGroupData>) => {
    const { sort, page } = criteria;

    if (sort) {
      const field = sort.field as keyof WorkloadGroupData;
      const direction = sort.direction as SortDirection;
      const sorted = sortData(data, field, direction);

      const filteredSortedData = searchQuery
        ? sorted.filter((g) => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : sorted;

      setSortField(field);
      setSortDirection(direction);
      setFilteredData(filteredSortedData);
    }

    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  };

  // === API Calls ===
  const fetchDataFromBackend = async () => {
    setLoading(true);
    try {
      // Use /_nodes to get all node IDs
      const res = await core.http.get('/api/_wlm_proxy/_nodes');
      const response = res.body;
      const nodes: string[] = Object.keys(response.nodes || {});

      setNodeIds(nodes);

      if (nodes.length > 0) {
        const defaultNode = selectedNode || nodes[0];
        setSelectedNode(defaultNode);
        await fetchStatsForNode(defaultNode);
      }
    } catch (err) {
      console.error('Error fetching node list:', err);
    }
    setLoading(false);
  };

  const fetchQueryGroupsWithLimits = async () => {
    try {
      const res = await core.http.get('/api/_wlm/query_group');
      const queryGroups: QueryGroup[] = res.body?.query_groups ?? [];

      // Map groupId to the resource limits, using NaN for unavailable limits
      const groupIdToLimits = queryGroups.reduce<Record<string, { cpuLimit: number, memLimit: number }>>(
        (acc, group) => {
          // If resource limits are available, convert them to numbers; otherwise, use NaN
          const cpuLimit = group.resource_limits?.cpu ? Math.round(group.resource_limits.cpu * 100) : NaN;
          const memLimit = group.resource_limits?.memory ? Math.round(group.resource_limits.memory * 100) : NaN;

          acc[group._id] = { cpuLimit, memLimit };
          return acc;
        },
        {}
      );

      return groupIdToLimits;
    } catch (err) {
      console.warn('Failed to fetch query groups with limits:', err);
      return {};
    }
  };

  const fetchStatsForNode = async (nodeId: string) => {
    setLoading(true);

    try {
      const idToName = await fetchQueryGroupNameMap();
      const queryGroups = await fetchQueryGroupsForNode(nodeId);
      const groupIdToLimits = await fetchQueryGroupsWithLimits();

      // Build raw group data first (skip cpuStats/memStats for now)
      const rawData: WorkloadGroupData[] = [];

      for (const [groupId, groupStats] of Object.entries(queryGroups) as Array<
        [string, GroupStats]
      >) {
        const name = groupId === 'DEFAULT_QUERY_GROUP' ? groupId : idToName[groupId];
        const cpuUsage = Math.round((groupStats.cpu?.current_usage ?? 0) * 100);
        const memoryUsage = Math.round((groupStats.memory?.current_usage ?? 0) * 100);
        const { cpuLimit = 100, memLimit = 100 } = groupIdToLimits[groupId] || {};

        rawData.push({
          name,
          cpuUsage,
          memoryUsage,
          totalCompletion: groupStats.total_completions ?? 0,
          totalRejections: groupStats.total_rejections ?? 0,
          totalCancellations: groupStats.total_cancellations ?? 0,
          topQueriesLink: "", // not available yet
          cpuStats: [],
          memStats: [],
          cpuLimit,
          memLimit,
          groupId,
        });
      }

      const filteredRawData = searchQuery
        ? rawData.filter((g) => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : rawData;

      // Sort & paginate
      const sorted = sortData(filteredRawData, sortField, sortDirection);
      const paged = sorted.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

      // Fetch only the stats needed for visible QGs (with /_wlm/stats/{queryGroupId})
      for (const group of paged) {
        const groupId = group.groupId;

        try {
          const res = await core.http.get(`/api/_wlm/stats/${groupId}`);
          const stats: Record <string, NodeStats> = res.body;

          const cpuUsages: number[] = [];
          const memUsages: number[] = [];

          for (const currentNodeId in stats) {
            if (currentNodeId === '_nodes' || currentNodeId === 'cluster_name') continue;
            const nodeStats = stats[currentNodeId]?.query_groups?.[groupId];
            if (nodeStats) {
              cpuUsages.push((nodeStats.cpu?.current_usage ?? 0) * 100);
              memUsages.push((nodeStats.memory?.current_usage ?? 0) * 100);
            }
          }

          group.cpuStats = computeBoxStats(cpuUsages);
          group.memStats = computeBoxStats(memUsages);
        } catch (err) {
          console.warn(`Failed to fetch boxplot stats for ${groupId}:`, err);
        }
      }

      const overLimit = filteredRawData.filter((g) => g.cpuUsage > g.cpuLimit || g.memoryUsage > g.memLimit)
        .length;

      setData(sorted);
      setFilteredData(sorted);
      setSummaryStats({
        totalGroups: sorted.length,
        totalCompletions: filteredRawData.reduce((sum, g) => sum + g.totalCompletion, 0),
        totalRejections: filteredRawData.reduce((sum, g) => sum + g.totalRejections, 0),
        totalCancellations: filteredRawData.reduce((sum, g) => sum + g.totalCancellations, 0),
        groupsExceedingLimits: overLimit,
      });
    } catch (err) {
      console.error(`Failed to fetch node stats:`, err);
    }

    setLoading(false);
  };

  // === Helpers ===
  const sortData = (
    rawData: WorkloadGroupData[],
    field: keyof WorkloadGroupData,
    direction: 'asc' | 'desc'
  ): WorkloadGroupData[] => {
    return [...rawData].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return direction === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  };

  const fetchQueryGroupNameMap = async (): Promise<Record<string, string>> => {
    const res = await core.http.get('/api/_wlm/query_group');
    const groups = res.body?.query_groups ?? [];
    const map: Record<string, string> = {};
    for (const group of groups) {
      map[group._id] = group.name;
    }
    return map;
  };

  const fetchQueryGroupsForNode = async (nodeId: string): Promise<Record<string, GroupStats>> => {
    const res = await core.http.get(`/api/_wlm/${nodeId}/stats`);
    return (res.body)[nodeId]?.query_groups ?? {};
  };

  const fetchResourceLimits = async (groupId: string, idToName: Record<string, string>) => {
    let cpuLimit = 100;
    let memLimit = 100;
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
    if (arr.length === 0) return [NaN, NaN, NaN, NaN, NaN];
    const sorted = [...arr].sort((a, b) => a - b);
    return [
      sorted[0],
      sorted[Math.floor(sorted.length * 0.25)],
      sorted[Math.floor(sorted.length * 0.5)],
      sorted[Math.floor(sorted.length * 0.75)],
      sorted[sorted.length - 1],
    ];
  };

  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    if (!query) setFilteredData(data);
    else setFilteredData(data.filter((g) => g.name.toLowerCase().includes(query)));
  };

  const getBoxplotOption = (box: number[], limit: number) => {
    const sorted = [...box].sort((a, b) => a - b);
    const [boxMin, boxQ1, boxMedian, boxQ3, boxMax] = sorted;
    return {
      tooltip: {
        trigger: 'item',
        appendToBody: true,
        className: 'echarts-tooltip',
        formatter: (params: any) => {
          if (params.seriesType !== 'boxplot') return '';
          const [fMin, fQ1, fMedian, fQ3, fMax] = params.data
            .slice(1, 6)
            .map((v: number) => v.toFixed(2));
          const formattedLimit = Number(limit).toFixed(2);
          return `<strong>Usage across nodes</strong><br/>
                  Min: ${fMin}%<br/>
                  Q1: ${fQ1}%<br/>
                  Median: ${fMedian}%<br/>
                  Q3: ${fQ3}%<br/>
                  Max: ${fMax}%<br/>
                  <span style="color:#dc3545;">Limit: ${formattedLimit}%</span>`;
        },
      },
      grid: { left: '0%', right: '10%', top: '0%', bottom: '0%' },
      xAxis: {
        type: 'value',
        min: Math.min(boxMin, limit) - 5,
        max: Math.max(boxMax, limit) + 5,
        show: false,
      },
      yAxis: { type: 'category', data: ['Boxplot'], show: false },
      series: [
        {
          name: 'Boxplot',
          type: 'boxplot',
          data: [[boxMin, boxQ1, boxMedian, boxQ3, boxMax]],
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
      if (selectedNode) {
        fetchStatsForNode(selectedNode);
        core.notifications.toasts.addSuccess({
          title: 'Data refreshed',
          text: 'Workload stats for the current node have been updated.',
        });
      }
    }, 60000);

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
        <EuiLink
          onClick={() => history.push(`/wlm-details?name=${name}`)}
          style={{ color: '#0073e6' }}
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
        <a
          href={link}
          style={{ color: '#0073e6', display: 'flex', alignItems: 'center', gap: '5px' }}
          target="_blank"
          rel="noopener noreferrer"
        >
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
                    const selectedNodeId = e.target.value;
                    setSelectedNode(selectedNodeId);
                    fetchStatsForNode(selectedNodeId);
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
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiStat title={summaryStats.totalGroups} description="Total workload groups" />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiStat
              title={summaryStats.groupsExceedingLimits}
              description="Total groups exceeding limits"
              titleColor="danger"
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiStat title={summaryStats.totalCompletions} description="Total completion" />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiStat title={summaryStats.totalRejections} description="Total rejections" />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiStat title={summaryStats.totalCancellations} description="Total cancellations" />
          </EuiPanel>
        </EuiFlexItem>
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
                <EuiButton
                  onClick={() => fetchStatsForNode(selectedNode)}
                  iconType="refresh"
                  isLoading={loading}
                >
                  Refresh
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
            <EuiBasicTable<WorkloadGroupData>
              data-testid="workload-table"
              items={filteredData.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)}
              columns={columns}
              sorting={{
                sort: {
                  field: sortField,
                  direction: sortDirection,
                },
              }}
              onChange={onTableChange}
              pagination={pagination}
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
