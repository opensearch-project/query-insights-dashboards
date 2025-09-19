/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useContext, useCallback } from 'react';
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
import { CoreStart, AppMountParameters } from 'opensearch-dashboards/public';
import ReactECharts from 'echarts-for-react';
import { DataSourceManagementPluginSetup } from 'src/plugins/data_source_management/public';
import { PageHeader } from '../../../components/PageHeader';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../../types';
import { WLM_CREATE } from '../WorkloadManagement';
import { DataSourceContext } from '../WorkloadManagement';
import { QueryInsightsDataSourceMenu } from '../../../components/DataSourcePicker';
import { getDataSourceEnabledUrl } from '../../../utils/datasource-utils';

export const WLM = '/workloadManagement';

interface WorkloadGroupData {
  name: string;
  cpuUsage: number;
  memoryUsage: number;
  totalCompletions: number;
  totalRejections: number;
  totalCancellations: number;
  topQueriesLink: string;
  cpuStats: number[];
  memStats: number[];
  cpuLimit: number;
  memLimit: number;
  groupId: string;
}

interface WorkloadGroup {
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
  workload_groups?: {
    [groupId: string]: {
      cpu?: { current_usage?: number };
      memory?: { current_usage?: number };
    };
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

// --- Pagination Constants ---
const DEFAULT_PAGE_INDEX = 0;
const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [5, 10, 15, 50];

const SUMMARY_STATS_KEYS = {
  totalGroups: 'totalGroups',
  groupsExceedingLimits: 'groupsExceedingLimits',
};

enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export const WorkloadManagementMain = ({
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

  // === State ===
  const [data, setData] = useState<WorkloadGroupData[]>([]);
  const [filteredData, setFilteredData] = useState<WorkloadGroupData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { dataSource, setDataSource } = useContext(DataSourceContext)!;

  const [pageIndex, setPageIndex] = useState(DEFAULT_PAGE_INDEX);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortField, setSortField] = useState<keyof WorkloadGroupData>('cpuUsage');
  const [sortDirection, setSortDirection] = useState<SortDirection>(SortDirection.DESC);
  const [summaryStats, setSummaryStats] = useState({
    [SUMMARY_STATS_KEYS.totalGroups]: '-' as string | number,
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
  const fetchClusterLevelStats = async () => {
    setLoading(true);

    try {
      const rawNodeStats = await fetchClusterWorkloadGroupStats();
      const workloadGroups: WorkloadGroup[] = await fetchWorkloadGroups();

      const idToName = workloadGroups.reduce<Record<string, string>>(
        (acc, group: WorkloadGroup) => {
          acc[group._id] = group.name;
          return acc;
        },
        {}
      );

      const groupIdToLimits = workloadGroups.reduce<
        Record<string, { cpuLimit: number; memLimit: number }>
      >((acc, group: WorkloadGroup) => {
        const cpuLimit = group.resource_limits?.cpu
          ? Math.round(group.resource_limits.cpu * 100)
          : NaN;
        const memLimit = group.resource_limits?.memory
          ? Math.round(group.resource_limits.memory * 100)
          : NaN;

        acc[group._id] = { cpuLimit, memLimit };
        return acc;
      }, {});

      // Flatten and aggregate group stats across nodes
      const aggregatedGroups: Record<string, WorkloadGroupData> = {};

      for (const [nodeId, nodeStatsRaw] of Object.entries(rawNodeStats)) {
        if (nodeId === '_nodes' || nodeId === 'cluster_name') continue;

        const nodeStats = nodeStatsRaw as NodeStats;

        for (const [groupId, rawGroupStats] of Object.entries(nodeStats.workload_groups ?? {})) {
          const groupStats = rawGroupStats as GroupStats;

          if (!aggregatedGroups[groupId]) {
            aggregatedGroups[groupId] = {
              totalCompletions: 0,
              totalRejections: 0,
              totalCancellations: 0,
              cpuUsage: 0,
              memoryUsage: 0,
              name: '',
              topQueriesLink: '',
              cpuLimit: 0,
              memLimit: 0,
              groupId: '',
              cpuStats: [],
              memStats: [],
            };
          }

          // Aggregate values across nodes
          aggregatedGroups[groupId].totalCompletions! += groupStats.total_completions ?? 0;
          aggregatedGroups[groupId].totalRejections! += groupStats.total_rejections ?? 0;
          aggregatedGroups[groupId].totalCancellations! += groupStats.total_cancellations ?? 0;
          aggregatedGroups[groupId].cpuStats.push((groupStats.cpu?.current_usage ?? 0) * 100);
          aggregatedGroups[groupId].memStats.push((groupStats.memory?.current_usage ?? 0) * 100);
          aggregatedGroups[groupId].cpuUsage = Math.max(
            aggregatedGroups[groupId].cpuUsage ?? 0,
            groupStats.cpu?.current_usage ?? 0
          );

          aggregatedGroups[groupId].memoryUsage = Math.max(
            aggregatedGroups[groupId].memoryUsage ?? 0,
            groupStats.memory?.current_usage ?? 0
          );
        }
      }
      const rawData: WorkloadGroupData[] = [];

      for (const [groupId, groupStats] of Object.entries(aggregatedGroups) as Array<
        [string, WorkloadGroupData]
      >) {
        const name = groupId === 'DEFAULT_WORKLOAD_GROUP' ? groupId : idToName[groupId];
        const cpuUsage = Math.round((groupStats.cpuUsage ?? 0) * 100);
        const memoryUsage = Math.round((groupStats.memoryUsage ?? 0) * 100);
        const { cpuLimit = 100, memLimit = 100 } = groupIdToLimits[groupId] || {};

        rawData.push({
          name,
          cpuUsage,
          memoryUsage,
          totalCompletions: groupStats.totalCompletions,
          totalRejections: groupStats.totalRejections,
          totalCancellations: groupStats.totalCancellations,
          topQueriesLink: '', // not available yet
          cpuStats: computeBoxStats(groupStats.cpuStats),
          memStats: computeBoxStats(groupStats.memStats),
          cpuLimit,
          memLimit,
          groupId,
        });
      }

      const filteredRawData = searchQuery
        ? rawData.filter((g) => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : rawData;

      const sorted = sortData(filteredRawData, sortField, sortDirection);

      const thresholds = await core.http.get<{
        cpuRejectionThreshold: number;
        memoryRejectionThreshold: number;
      }>('/api/_wlm/thresholds');

      const cpuThreshold = thresholds?.cpuRejectionThreshold ?? 1;
      const memoryThreshold = thresholds?.memoryRejectionThreshold ?? 1;

      const overLimit = filteredRawData.filter(
        (g) =>
          g.cpuUsage > g.cpuLimit * cpuThreshold || g.memoryUsage > g.memLimit * memoryThreshold
      ).length;

      setData(sorted);
      setFilteredData(sorted);
      setSummaryStats({
        totalGroups: sorted.length,
        groupsExceedingLimits: overLimit,
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error(`Failed to fetch node stats:`, err);
      core.notifications.toasts.addDanger({
        title: 'Failed to fetch workload stats',
        text: 'An error occurred while retrieving workload statistics. Please try again.',
      });
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

  const fetchClusterWorkloadGroupStats = useCallback(async (): Promise<
    Record<string, NodeStats>
  > => {
    const res = await core.http.get('/api/_wlm/stats', {
      query: { dataSourceId: dataSource.id },
    });

    return res.body as Record<string, NodeStats>;
  }, [dataSource]);

  const fetchWorkloadGroups = async () => {
    const res = await core.http.get('/api/_wlm/workload_group', {
      query: { dataSourceId: dataSource.id },
    });
    return res.body?.workload_groups ?? [];
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
    const workload = e.target.value.toLowerCase();
    setSearchQuery(workload);
    if (!workload) setFilteredData(data);
    else setFilteredData(data.filter((g) => g.name.toLowerCase().includes(workload)));
  };

  const getBoxplotOption = (box: number[], limit: number) => {
    const sorted = [...box].sort((a, b) => a - b);
    const [min, q1, median, q3, max] = sorted;

    return {
      tooltip: {
        trigger: 'axis',
        className: 'echarts-tooltip',
        formatter: (currentParams: any[]) => {
          const currentBox = currentParams.find((p) => p.seriesType === 'boxplot');
          let tooltip = '';
          if (currentBox) {
            const [fMin, fQ1, fMedian, fQ3, fMax] = currentBox.data
              .slice(1, 6)
              .map((v: number) => v.toFixed(2));
            tooltip += `<strong>Usage across nodes</strong><br/>
                Min: ${fMin}%<br/>
                Q1: ${fQ1}%<br/>
                Median: ${fMedian}%<br/>
                Q3: ${fQ3}%<br/>
                Max: ${fMax}%<br/>`;
          }
          tooltip += `<span style="color:#dc3545;">Limit: ${limit.toFixed(2)}%</span>`;
          return tooltip;
        },
      },
      animation: false,
      grid: { left: '5%', right: '5%', top: '10%', bottom: '10%' },
      xAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: {
          show: true,
          lineStyle: {
            color: ['#e0e0e0', '#e0e0e0', '#e0e0e0', '#e0e0e0', '#e0e0e0', '#e0e0e0'],
            type: 'solid',
            width: 1,
          },
        },
      },
      yAxis: {
        type: 'category',
        data: [''],
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
      },
      series: [
        {
          name: 'Box',
          type: 'boxplot',
          data: [[min, q1, median, q3, max]],
          itemStyle: {
            color: '#79AAD9',
            borderColor: '#000000',
            borderWidth: 1.25,
          },
          boxWidth: ['50%', '20%'],
          whiskerBox: {
            lineStyle: {
              color: '#000',
              width: 1.25,
            },
          },
          symbolSize: 0,
          markLine: {
            symbol: 'none',
            label: { show: false },
            lineStyle: {
              color: '#DC3545',
              width: 2,
              type: 'solid',
            },
            data: [{ xAxis: limit }],
          },
        },
      ],
      graphic: [
        {
          type: 'group',
          bounding: 'all',
          children: [
            {
              type: 'line',
              shape: {
                x1: 10,
                y1: 25,
                x2: 180,
                y2: 25,
              },
              style: {
                stroke: '#ccc',
                lineWidth: 1,
                lineDash: [6, 4],
              },
              z: -1,
            },
          ],
        },
      ],
    };
  };

  // === Lifecycle ===
  useEffect(() => {
    fetchClusterLevelStats();

    // Set up interval to fetch every 60 seconds
    const intervalId = setInterval(() => {
      fetchClusterLevelStats();
    }, 60000);

    // Cleanup
    return () => clearInterval(intervalId);
  }, [fetchClusterWorkloadGroupStats]);

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
          <EuiText
            size="s"
            style={{
              color: cpuUsage > item.cpuLimit ? '#BD271E' : undefined,
            }}
          >
            {cpuUsage}%
          </EuiText>
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
          <EuiText
            size="s"
            style={{
              color: memoryUsage > item.memLimit ? '#BD271E' : undefined,
            }}
          >
            {memoryUsage}%
          </EuiText>
        </div>
      ),
    },
    {
      field: 'totalCompletions',
      name: <EuiText size="m">Total completions</EuiText>,
      sortable: true,
      render: (val: number) => val.toLocaleString(),
    },
    {
      field: 'totalRejections',
      name: <EuiText size="m">Total rejections</EuiText>,
      sortable: true,
      render: (val: number) => val.toLocaleString(),
    },
    {
      field: 'totalCancellations',
      name: <EuiText size="m">Total cancellations</EuiText>,
      sortable: true,
      render: (val: number) => val.toLocaleString(),
    },
    {
      field: 'liveQueriesLink',
      name: <EuiText size="m">Live Queries</EuiText>,
      render: (link: string, item: WorkloadGroupData) => (
        <EuiLink
          onClick={() => {
            core.application.navigateToApp('query-insights-dashboards', {
              path: `#/LiveQueries?wlmGroupId=${item.groupId}`,
            });
          }}
          style={{ color: '#0073e6', display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          View <EuiIcon type="popout" size="s" />
        </EuiLink>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        coreStart={core}
        depsStart={depsStart}
        fallBackComponent={
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
        }
      />
      <EuiSpacer size="l" />

      {/* Page Title and Create Button */}
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        {/* Left: Title */}
        <EuiFlexItem grow={false}>
          <EuiTitle size="l">
            <h1>Workload groups</h1>
          </EuiTitle>
        </EuiFlexItem>

        {/* Right: Button */}
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton fill color="success" onClick={() => history.push(WLM_CREATE)}>
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
            <EuiStat
              title={Number(summaryStats.totalGroups).toLocaleString()}
              description="Total workload groups"
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiStat
              title={Number(summaryStats.groupsExceedingLimits).toLocaleString()}
              description="Total groups exceeding limits"
              titleColor="danger"
            />
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
                <EuiText color="subdued" size="s">
                  <p>
                    Last updated {lastUpdated?.toLocaleDateString()} @{' '}
                    {lastUpdated?.toLocaleTimeString()}
                  </p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={() => fetchClusterLevelStats()}
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
