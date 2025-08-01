/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiTextAlign,
  EuiIcon,
  EuiButtonGroup,
  EuiSwitch,
  EuiSpacer,
  EuiInMemoryTable,
  EuiButton,
  EuiLink,
} from '@elastic/eui';
import {
  RadialChart,
  XYPlot,
  HorizontalBarSeries,
  XAxis,
  YAxis,
  HorizontalGridLines,
} from 'react-vis';
import 'react-vis/dist/style.css';
import { Duration } from 'luxon';
import { filesize } from 'filesize';
import { AppMountParameters, CoreStart } from 'opensearch-dashboards/public';
import { DataSourceManagementPluginSetup } from 'src/plugins/data_source_management/public';
import { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { LiveSearchQueryResponse } from '../../../types/types';
import {
  retrieveLiveQueries,
  retrieveLiveQueriesWithWLMGroup,
} from '../../../common/utils/QueryUtils';
import { API_ENDPOINTS } from '../../../common/utils/apiendpoints';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';
import { DataSourceContext } from '../TopNQueries/TopNQueries';
import { QueryInsightsDataSourceMenu } from '../../components/DataSourcePicker';

export const InflightQueries = ({
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
  const DEFAULT_REFRESH_INTERVAL = 30000; // default 30s
  const TOP_N_DISPLAY_LIMIT = 9;
  const isFetching = useRef(false);
  const [query, setQuery] = useState<LiveSearchQueryResponse | null>(null);
  const { dataSource, setDataSource } = useContext(DataSourceContext)!;
  const [nodeCounts, setNodeCounts] = useState({});
  const [indexCounts, setIndexCounts] = useState({});
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(DEFAULT_REFRESH_INTERVAL);

  const liveQueries = query?.response?.live_queries ?? [];

  const convertTime = (unixTime: number) => {
    const date = new Date(unixTime);
    const loc = date.toDateString().split(' ');
    return `${loc[1]} ${loc[2]}, ${loc[3]} @ ${date.toLocaleTimeString('en-US')}`;
  };

  const fetchliveQueries = async () => {
    const wlmGroup = searchParams.get('wlm_group');
    let retrievedQueries;
    if (wlmGroup) {
      retrievedQueries = await retrieveLiveQueriesWithWLMGroup(core, dataSource?.id, wlmGroup);
    } else {
      retrievedQueries = await retrieveLiveQueries(core, dataSource?.id);
    }
    if (retrievedQueries?.response?.live_queries) {
      const tempNodeCount: Record<string, number> = {};
      const indexCount: Record<string, number> = {};
      const parsedQueries = retrievedQueries.response.live_queries.map((q) => {
        const indexMatch = q.description?.match(/indices\[(.*?)\]/);
        const searchTypeMatch = q.description?.match(/search_type\[(.*?)\]/);
        const newWlmGroup =
          typeof q.query_group_id === 'string' && q.query_group_id.trim() !== ''
            ? q.query_group_id
            : 'N/A';
        return {
          ...q,
          index: indexMatch ? indexMatch[1] : 'N/A',
          search_type: searchTypeMatch ? searchTypeMatch[1] : 'N/A',
          coordinator_node: q.node_id,
          node_label: q.node_id,
          wlm_group: newWlmGroup,
        };
      });

      setQuery({ ...retrievedQueries, response: { live_queries: parsedQueries } });

      parsedQueries.forEach((liveQuery) => {
        const nodeId = liveQuery.node_id;
        tempNodeCount[nodeId] = (tempNodeCount[nodeId] || 0) + 1;
        const index = liveQuery.index;
        if (index && typeof index === 'string') {
          indexCount[index] = (indexCount[index] || 0) + 1;
        }
      });

      const sortedNodes = Object.entries(tempNodeCount).sort(([, a], [, b]) => b - a);
      const nodeCount: Record<string, number> = {};
      let othersCount = 0;
      sortedNodes.forEach(([nodeId, count], index) => {
        if (index < TOP_N_DISPLAY_LIMIT) nodeCount[nodeId] = count;
        else othersCount += count;
      });
      if (othersCount > 0) nodeCount.others = othersCount;
      setNodeCounts(nodeCount);

      const sortedIndices = Object.entries(indexCount).sort(([, a], [, b]) => b - a);
      const topIndexCount: Record<string, number> = {};
      let indexOthersCount = 0;
      sortedIndices.forEach(([indexName, count], i) => {
        if (i < TOP_N_DISPLAY_LIMIT) topIndexCount[indexName] = count;
        else indexOthersCount += count;
      });
      if (indexOthersCount > 0) topIndexCount.others = indexOthersCount;
      setIndexCounts(topIndexCount);
    }
  };

  function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => reject(new Error('Timed out')), ms);
      promise
        .then((res) => {
          clearTimeout(timeoutId);
          resolve(res);
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          reject(err);
        });
    });
  }

  const fetchliveQueriesSafe = async () => {
    if (isFetching.current) {
      return;
    }
    isFetching.current = true;
    try {
      await withTimeout(fetchliveQueries(), refreshInterval - 500);
    } catch (e) {
      console.warn('[LiveQueries] fetchliveQueries timed out or failed', e);
    } finally {
      isFetching.current = false;
    }
  };

  useEffect(() => {
    fetchliveQueriesSafe();

    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      fetchliveQueriesSafe();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, refreshInterval, core]);

  const [pagination, setPagination] = useState({ pageIndex: 0 });
  const formatTime = (seconds: number): string => {
    if (seconds < 1e-3) return `${(seconds * 1e6).toFixed(2)} µs`;
    if (seconds < 1) return `${(seconds * 1e3).toFixed(2)} ms`;

    const duration = Duration.fromObject({ seconds }).shiftTo(
      'days',
      'hours',
      'minutes',
      'seconds'
    );
    const parts = [];

    if (duration.days) parts.push(`${duration.days} d`);
    if (duration.hours) parts.push(`${duration.hours} h`);
    if (duration.minutes) parts.push(`${duration.minutes} m`);
    if (duration.seconds) parts.push(`${duration.seconds.toFixed(2)} s`);

    return parts.join(' ');
  };

  const formatMemory = (bytes: number): string => {
    return filesize(bytes, { base: 2, standard: 'jedec' });
  };

  const chartOptions = [
    { id: 'donut', label: 'Donut', iconType: 'visPie' },
    { id: 'bar', label: 'Bar', iconType: 'visBarHorizontal' },
  ];

  const [selectedChartIdByIndex, setSelectedChartIdByIndex] = useState('donut');
  const [selectedChartIdByNode, setSelectedChartIdByNode] = useState('donut');

  const onChartChangeByIndex = (optionId: string) => {
    setSelectedChartIdByIndex(optionId);
  };

  const onChartChangeByNode = (optionId: string) => {
    setSelectedChartIdByNode(optionId);
  };
  const [selectedItems, setSelectedItems] = useState<any[]>([]);

  const selection = {
    selectable: (item: any) => item.is_cancelled !== true,
    onSelectionChange: (selected: any[]) => setSelectedItems(selected),
  };

  const chartColors = [
    '#1f77b4',
    '#ff7f0e',
    '#2ca02c',
    '#d62728',
    '#9467bd',
    '#8c564b',
    '#e377c2',
    '#7f7f7f',
    '#bcbd22',
    '#17becf',
  ];

  const Legend = ({ data }: { data: Record<string, number> }) => (
    <EuiFlexGroup direction="row" wrap responsive={false} gutterSize="s">
      {Object.entries(data).map(([label, value], idx) => (
        <EuiFlexItem key={label} grow={false}>
          <EuiText size="xs">
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                backgroundColor: chartColors[idx % chartColors.length],
                marginRight: 6,
              }}
            />
            {label}: {value}
          </EuiText>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );

  const metrics = React.useMemo(() => {
    if (!query || !query.response?.live_queries?.length) return null;

    const queries = query.response.live_queries;

    const activeQueries = queries.length;
    let totalLatency = 0;
    let totalCPU = 0;
    let totalMemory = 0;
    let longestLatency = 0;
    let longestQueryId = '';

    queries.forEach((q) => {
      const latency = q.measurements?.latency?.number ?? 0;
      const cpu = q.measurements?.cpu?.number ?? 0;
      const memory = q.measurements?.memory?.number ?? 0;

      totalLatency += latency;
      totalCPU += cpu;
      totalMemory += memory;

      if (latency > longestLatency) {
        longestLatency = latency;
        longestQueryId = q.id;
      }
    });

    return {
      activeQueries,
      avgElapsedSec: totalLatency / activeQueries / 1000000000,
      longestElapsedSec: longestLatency / 1000000000,
      longestQueryId,
      totalCPUSec: totalCPU / 1000000000,
      totalMemoryBytes: totalMemory,
    };
  }, [query]);

  const getReactVisChartData = (counts: Record<string, number>) => {
    return Object.entries(counts).map(([label, value], index) => ({
      x: value, // value for horizontal bar
      y: label, // category
      angle: value,
      label,
      color: chartColors[index % chartColors.length],
    }));
  };


  return (
    <div>
      <QueryInsightsDataSourceMenu
        coreStart={core}
        depsStart={depsStart}
        params={params}
        dataSourceManagement={dataSourceManagement}
        setDataSource={setDataSource}
        selectedDataSource={dataSource}
        onManageDataSource={() => {}}
        onSelectedDataSource={() => {
          fetchliveQueries(); // re-fetch queries when data source changes
        }}
        dataSourcePickerReadOnly={false}
      />
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label="Auto-refresh"
            checked={autoRefreshEnabled}
            onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
            data-test-subj="live-queries-autorefresh-toggle"
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            onBlur={(e) => setRefreshInterval(Number(e.target.value))}
            style={{ padding: '6px', borderRadius: '6px', minWidth: 120 }}
            disabled={!autoRefreshEnabled}
            data-test-subj="live-queries-refresh-interval"
          >
            <option value={5000}>5 seconds</option>
            <option value={10000}>10 seconds</option>
            <option value={30000}>30 seconds</option>
            <option value={60000}>1 minute</option>
          </select>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="refresh"
            onClick={async () => {
              await fetchliveQueries();
            }}
            data-test-subj="live-queries-refresh-button"
          >
            Refresh
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup>
        {/* Active Queries */}
        <EuiFlexItem>
          <EuiPanel paddingSize="m" data-test-subj="panel-active-queries">
            <EuiFlexItem>
              <EuiTextAlign textAlign="center">
                <EuiText size="s">
                  <p>Active queries</p>
                </EuiText>
                <EuiTitle size="l">
                  <h2>
                    <b>{metrics?.activeQueries ?? 0}</b>
                  </h2>
                </EuiTitle>
                <EuiIcon type="visGauge" />
              </EuiTextAlign>
            </EuiFlexItem>
          </EuiPanel>
        </EuiFlexItem>

        {/* Avg. elapsed time */}
        <EuiFlexItem>
          <EuiPanel paddingSize="m" data-test-subj="panel-avg-elapsed-time">
            <EuiFlexItem>
              <EuiTextAlign textAlign="center">
                <EuiText size="s">
                  <p>Avg. elapsed time</p>
                </EuiText>
                <EuiTitle size="l">
                  <h2>
                    <b>{metrics ? formatTime(metrics.avgElapsedSec) : 0}</b>
                  </h2>
                </EuiTitle>
                <EuiText size="s">
                  <p>(Avg. across {metrics?.activeQueries ?? 0})</p>
                </EuiText>
              </EuiTextAlign>
            </EuiFlexItem>
          </EuiPanel>
        </EuiFlexItem>

        {/* Longest running query */}
        <EuiFlexItem>
          <EuiPanel paddingSize="m" data-test-subj="panel-longest-query">
            <EuiFlexItem>
              <EuiTextAlign textAlign="center">
                <EuiText size="s">
                  <p>Longest running query</p>
                </EuiText>
                <EuiTitle size="l">
                  <h2>
                    <b>{metrics ? formatTime(metrics.longestElapsedSec) : 0}</b>
                  </h2>
                </EuiTitle>
                {metrics?.longestQueryId && (
                  <EuiText size="s">
                    <p>ID: {metrics.longestQueryId}</p>
                  </EuiText>
                )}
              </EuiTextAlign>
            </EuiFlexItem>
          </EuiPanel>
        </EuiFlexItem>

        {/* Total CPU usage */}
        <EuiFlexItem>
          <EuiPanel paddingSize="m" data-test-subj="panel-total-cpu">
            <EuiFlexItem>
              <EuiTextAlign textAlign="center">
                <EuiText size="s">
                  <p>Total CPU usage</p>
                </EuiText>
                <EuiTitle size="l">
                  <h2>
                    <b>{metrics ? formatTime(metrics.totalCPUSec) : 0}</b>
                  </h2>
                </EuiTitle>
                <EuiText size="s">
                  <p>(Sum across {metrics?.activeQueries ?? 0})</p>
                </EuiText>
              </EuiTextAlign>
            </EuiFlexItem>
          </EuiPanel>
        </EuiFlexItem>

        {/* Total memory usage */}
        <EuiFlexItem>
          <EuiPanel paddingSize="m" data-test-subj="panel-total-memory">
            <EuiFlexItem>
              <EuiTextAlign textAlign="center">
                <EuiText size="s">
                  <p>Total memory usage</p>
                </EuiText>
                <EuiTitle size="l">
                  <h2>
                    <b>{metrics ? formatMemory(metrics.totalMemoryBytes) : 0}</b>
                  </h2>
                </EuiTitle>
                <EuiText size="s">
                  <p>(Sum across {metrics?.activeQueries ?? 0})</p>
                </EuiText>
              </EuiTextAlign>
            </EuiFlexItem>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        {/* Queries by Node */}
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiTitle size="xs">
                <p>Queries by Node</p>
              </EuiTitle>
              <EuiButtonGroup
                legend="Chart Type"
                options={chartOptions}
                idSelected={selectedChartIdByNode}
                onChange={onChartChangeByNode}
                color="primary"
              />
            </EuiFlexGroup>
            <EuiSpacer size="l" />
            {Object.keys(nodeCounts).length > 0 ? (
              selectedChartIdByNode === 'donut' ? (
                <>
                  <RadialChart
                    data={getReactVisChartData(nodeCounts)}
                    width={300}
                    height={300}
                    innerRadius={80}
                    radius={140}
                    colorType="literal"
                    data-test-subj="chart-node-donut"
                  />
                  <EuiSpacer size="s" />
                  <Legend data={nodeCounts} />
                </>
              ) : (
                <XYPlot
                  yType="ordinal"
                  width={400}
                  height={300}
                  margin={{ left: 180 }}
                  colorType="literal"
                  data-test-subj="chart-node-bar"
                >
                  <HorizontalGridLines />
                  <XAxis />
                  <YAxis />
                  <HorizontalBarSeries
                    data={getReactVisChartData(nodeCounts)}
                    getColor={(d) => d.color}
                  />
                </XYPlot>
              )
            ) : (
              <EuiTextAlign textAlign="center">
                <EuiSpacer size="xl" />
                <EuiText color="subdued">
                  <p>No data available</p>
                </EuiText>
                <EuiSpacer size="xl" />
              </EuiTextAlign>
            )}
          </EuiPanel>
        </EuiFlexItem>

        {/* Queries by Index */}
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiTitle size="xs">
                <p>Queries by Index</p>
              </EuiTitle>
              <EuiButtonGroup
                legend="Chart Type"
                options={chartOptions}
                idSelected={selectedChartIdByIndex}
                onChange={onChartChangeByIndex}
                color="primary"
              />
            </EuiFlexGroup>
            <EuiSpacer size="l" />
            {Object.keys(indexCounts).length > 0 ? (
              selectedChartIdByIndex === 'donut' ? (
                <>
                  <RadialChart
                    data={getReactVisChartData(indexCounts)}
                    width={300}
                    height={300}
                    innerRadius={80}
                    radius={140}
                    colorType="literal"
                    data-test-subj="chart-index-donut"
                  />
                  <EuiSpacer size="s" />
                  <Legend data={indexCounts} />
                </>
              ) : (
                <XYPlot
                  yType="ordinal"
                  width={500}
                  height={300}
                  margin={{ left: 180 }}
                  data-test-subj="chart-index-bar"
                >
                  <HorizontalGridLines />
                  <XAxis />
                  <YAxis />
                  <HorizontalBarSeries
                    data={getReactVisChartData(indexCounts)}
                    colorType="literal"
                    getColor={(d) => d.color}
                  />
                </XYPlot>
              )
            ) : (
              <EuiTextAlign textAlign="center">
                <EuiSpacer size="xl" />
                <EuiText color="subdued">
                  <p>No data available</p>
                </EuiText>
                <EuiSpacer size="xl" />
              </EuiTextAlign>
            )}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiPanel paddingSize="m">
        <EuiInMemoryTable
          items={liveQueries}
          search={{
            box: {
              placeholder: 'Search queries',
              schema: false,
            },
            toolsLeft: selectedItems.length > 0 && [
              <EuiButton
                key="delete-button"
                color="danger"
                iconType="trash"
                disabled={selectedItems.length === 0}
                onClick={async () => {
                  const httpClient = dataSource?.id
                    ? depsStart.data.dataSources.get(dataSource.id)
                    : core.http;

                  await Promise.allSettled(
                    selectedItems.map((item) =>
                      httpClient.post(API_ENDPOINTS.CANCEL_TASK(item.id)).then(
                        () => ({ status: 'fulfilled', id: item.id }),
                        (err) => ({ status: 'rejected', id: item.id, error: err })
                      )
                    )
                  );
                  setSelectedItems([]);
                }}
              >
                Cancel {selectedItems.length} {selectedItems.length !== 1 ? 'queries' : 'query'}
              </EuiButton>,
            ],
            toolsRight: [
              <EuiButton
                key="refresh-button"
                iconType="refresh"
                onClick={async () => {
                  await fetchliveQueries();
                }}
              >
                Refresh
              </EuiButton>,
            ],
            filters: [
              {
                type: 'field_value_selection',
                field: 'index',
                name: 'Index',
                multiSelect: 'or',
                options: [...new Set(liveQueries.map((q) => q.index))].map((val) => ({
                  value: val,
                  name: val,
                  view: val,
                })),
              },
              {
                type: 'field_value_selection',
                field: 'search_type',
                name: 'Search type',
                multiSelect: 'or',
                options: [...new Set(liveQueries.map((q) => q.search_type))].map((val) => ({
                  value: val,
                  name: val,
                  view: val,
                })),
              },
              {
                type: 'field_value_selection',
                field: 'coordinator_node',
                name: 'Coordinator Node ID',
                multiSelect: 'or',
                options: [...new Set(liveQueries.map((q) => q.node_id))].map((val) => ({
                  value: val,
                  name: val,
                  view: val,
                })),
              },
            ],
          }}
          columns={[
            { name: 'Timestamp', render: (item) => convertTime(item.timestamp) },
            { field: 'id', name: 'Task ID' },
            { field: 'index', name: 'Index' },
            { field: 'coordinator_node', name: 'Coordinator node' },
            {
              name: 'Time elapsed',
              render: (item) => formatTime(item.measurements?.latency?.number / 1e9),
            },
            {
              name: 'CPU usage',
              render: (item) => formatTime(item.measurements?.cpu?.number / 1e9),
            },
            {
              name: 'Memory usage',
              render: (item) => formatMemory(item.measurements?.memory?.number),
            },
            { field: 'search_type', name: 'Search type' },

            {
              name: 'Status',
              render: (item) =>
                item.is_cancelled === true ? (
                  <EuiText color="danger">
                    <b>Cancelled</b>
                  </EuiText>
                ) : (
                  <EuiText color="success">
                    <b>Running</b>
                  </EuiText>
                ),
            },
            {
              name: 'WLM Group',
              render: (item: any) =>
                item.wlm_group && item.wlm_group !== 'N/A' ? (
                  <EuiLink
                    onClick={() => {
                      core.application.navigateToApp('workloadManagement', {
                        path: `#/wlm-details?name=${item.wlm_group}`,
                      });
                    }}
                    style={{ fontWeight: 'bold' }}
                    color="primary"
                  >
                    {item.wlm_group}
                  </EuiLink>
                ) : (
                  'N/A'
                ),
            },

            {
              name: 'Actions',
              actions: [
                {
                  name: 'Cancel',
                  description: 'Cancel this query',
                  icon: 'trash',
                  color: 'danger',
                  type: 'icon',
                  available: (item) => item.is_cancelled !== true,
                  onClick: async (item) => {
                    try {
                      const httpClient = dataSource?.id
                        ? depsStart.data.dataSources.get(dataSource.id)
                        : core.http;

                      await httpClient.post(API_ENDPOINTS.CANCEL_TASK(item.id));
                      await new Promise((r) => setTimeout(r, 300));
                      await fetchliveQueries();
                    } catch (err) {
                      console.error('Failed to cancel task', err);
                    }
                  },
                },
              ],
            },
          ]}
          selection={selection}
          pagination={{
            pageIndex: pagination.pageIndex,
            pageSize: 10,
            pageSizeOptions: [10, 20, 50],
          }}
          onTableChange={(e: { page?: { index: number } }) =>
            setPagination({ pageIndex: e.page?.index ?? 0 })
          }
          itemId={(row) => `${row.id}-${row.timestamp}`}
          loading={!query}
        />
      </EuiPanel>
    </div>
  );
};
