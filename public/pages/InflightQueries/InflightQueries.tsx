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
  EuiHorizontalRule,
  EuiSpacer,
  EuiInMemoryTable,
  EuiButton,
} from '@elastic/eui';
import embed from 'vega-embed';
import type { VisualizationSpec } from 'vega-embed';
import { CoreStart } from 'opensearch-dashboards/public';
import { LiveSearchQueryResponse } from '../../../types/types';
import { retrieveLiveQueries } from '../../../common/utils/QueryUtils';
//import {INDICES, NODE_ID, SEARCH_TYPE, TYPE} from "../../../common/constants";
const InflightQueries = ({ core }: { core: CoreStart }) => {
  const [query, setQuery] = useState<LiveSearchQueryResponse | null>(null);

  const [nodeCounts, setNodeCounts] = useState({});
  const [indexCounts, setIndexCounts] = useState({});

  const chartRefByNode = useRef<HTMLDivElement>(null);
  const chartRefByIndex = useRef<HTMLDivElement>(null);

  const nodeIdMap: Record<string, string> = {};
  let nodeCounter = 1;

  const convertTime = (unixTime: number) => {
    const date = new Date(unixTime);
    const loc = date.toDateString().split(' ');
    return `${loc[1]} ${loc[2]}, ${loc[3]} @ ${date.toLocaleTimeString('en-US')}`;
  };

  const getNodeLabel = (rawId: string): string => {
    if (!nodeIdMap[rawId]) {
      nodeIdMap[rawId] = `Node ${nodeCounter++}`;
    }
    return nodeIdMap[rawId];
  };


  useEffect(() => {
    const fetchliveQueries = async () => {
      const retrievedQueries = await retrieveLiveQueries(core);

      if (retrievedQueries?.response?.live_queries) {
        const tempNodeCount: Record<string, number> = {};
        const indexCount: Record<string, number> = {};

        // Parse index and search type for filters and table
        const parsedQueries = retrievedQueries.response.live_queries.map((q) => {
          const indexMatch = q.description?.match(/indices\[(.*?)\]/);
          const searchTypeMatch = q.description?.match(/search_type\[(.*?)\]/);
          return {
            ...q,
            index: indexMatch ? indexMatch[1] : 'N/A',
            search_type: searchTypeMatch ? searchTypeMatch[1] : 'N/A',
            coordinator_node: q.node_id,  // for display
            node_label: getNodeLabel(q.node_id),        // use this for Node column
          };
        });


        setQuery({ ...retrievedQueries, response: { live_queries: parsedQueries } });

        parsedQueries.forEach((liveQuery) => {
          const nodeId = liveQuery.node_id;
          const nodeLabel = getNodeLabel(nodeId);  // Get friendly label like "Node 1"

          // Count by friendly label, not raw node_id
          tempNodeCount[nodeLabel] = (tempNodeCount[nodeLabel] || 0) + 1;

          const index = liveQuery.index;
          if (index && typeof index === 'string') {
            indexCount[index] = (indexCount[index] || 0) + 1;
          }
        });

        // nodeCounts logic...
        const sortedNodes = Object.entries(tempNodeCount).sort(([, a], [, b]) => b - a);
        const nodeCount: Record<string, number> = {};
        let othersCount = 0;
        sortedNodes.forEach(([nodeId, count], index) => {
          if (index < 9) nodeCount[nodeId] = count;
          else othersCount += count;
        });
        if (othersCount > 0) nodeCount.others = othersCount;
        setNodeCounts(nodeCount);

        // indexCounts logic...
        const sortedIndices = Object.entries(indexCount).sort(([, a], [, b]) => b - a);
        const topIndexCount: Record<string, number> = {};
        let indexOthersCount = 0;
        sortedIndices.forEach(([indexName, count], i) => {
          if (i < 9) topIndexCount[indexName] = count;
          else indexOthersCount += count;
        });
        if (indexOthersCount > 0) topIndexCount.others = indexOthersCount;
        setIndexCounts(topIndexCount);
      }
    };

    fetchliveQueries();
    const interval = setInterval(() => {
      fetchliveQueries();
    },800);

    return () => clearInterval(interval);
  }, [core]);

  const queries = query?.response?.live_queries ?? [];
  const [pagination, setPagination] = useState({ pageIndex: 0 });
  const formatTime = (seconds: number): string => {
    if (seconds < 0.001) {
      return `${(seconds * 1000000).toFixed(2)} µs`;
    } else if (seconds < 1) {
      return `${(seconds * 1000).toFixed(2)} ms`;
    } else if (seconds < 60) {
      return `${seconds.toFixed(2)} s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds.toFixed(2)}s`;
    } else if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;
      return `${hours}h ${minutes}m ${remainingSeconds.toFixed(2)}s`;
    } else {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;
      return `${days}d ${hours}h ${minutes}m ${remainingSeconds.toFixed(2)}s`;
    }
  };

  const formatMemory = (bytes: number): string => {
    if (bytes < 1024) {
      return `${bytes.toFixed(2)} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    } else {
      return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
    }
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
    selectable: () => true,
    onSelectionChange: (selected: any[]) => setSelectedItems(selected),
  };


  const metrics = React.useMemo(() => {
    console.log(query);
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

  const getChartData = (counts: Record<string, number>, type: 'node' | 'index') => {
    return Object.entries(counts).map(([key, value]) => ({
      label: type === 'node' ? `${key}` : key, // Use descriptive label instead of 'a'
      value, // Use 'value' instead of 'b' for clarity
    }));
  };

  const getChartSpec = (type: string, chartType: 'node' | 'index'): VisualizationSpec => {
    const isDonut = type.includes('donut');

    return {
      width: 400,
      height: 300,
      mark: isDonut ? { type: 'arc', innerRadius: 50 } : { type: 'bar' },
      encoding: isDonut
          ? {
            theta: { field: 'value', type: 'quantitative' },
            color: {
              field: 'label',
              type: 'nominal',
              title: chartType === 'node' ? 'Nodes' : 'Indices',
            },
            tooltip: [
              { field: 'label', type: 'nominal', title: chartType === 'node' ? 'Node' : 'Index' },
              { field: 'value', type: 'quantitative', title: 'Count' },
            ],
          }
          : {
            y: {
              field: 'value',
              type: 'quantitative',
              axis: { title: 'Count' },
            },
            x: {
              field: 'label',
              type: 'nominal',
              axis: { labelAngle: -45, title: chartType === 'node' ? 'Nodes' : 'Indices' },
            },
            color: {
              field: 'label',
              type: 'nominal',
              title: chartType === 'node' ? 'Nodes' : 'Indices',
            },
            tooltip: [
              { field: 'label', type: 'nominal', title: chartType === 'node' ? 'Node' : 'Index' },
              { field: 'value', type: 'quantitative', title: 'Count' },
            ],
          },
    };
  };

  // Update the embed calls
  useEffect(() => {
    if (chartRefByNode.current) {
      embed(
          chartRefByNode.current,
          {
            ...getChartSpec(selectedChartIdByNode, 'node'),
            data: { values: getChartData(nodeCounts, 'node') },
          },
          { actions: false }
      ).catch(console.error);
    }
  }, [nodeCounts, selectedChartIdByNode]);

  useEffect(() => {
    if (chartRefByIndex.current) {
      embed(
          chartRefByIndex.current,
          {
            ...getChartSpec(selectedChartIdByIndex, 'index'),
            data: { values: getChartData(indexCounts, 'index') },
          },
          { actions: false }
      ).catch(console.error);
    }
  }, [indexCounts, selectedChartIdByIndex]);

  return (
      <div>
        <EuiFlexGroup>
          {/* Active Queries */}
          <EuiFlexItem>
            <EuiPanel paddingSize="m">
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
            <EuiPanel paddingSize="m">
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
            <EuiPanel paddingSize="m">
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
            <EuiPanel paddingSize="m">
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
            <EuiPanel paddingSize="m">
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
                <EuiTitle size="m">
                  <h3>
                    <b>Queries by Node</b>
                  </h3>
                </EuiTitle>
                <EuiButtonGroup
                    legend="Chart Type"
                    options={chartOptions}
                    idSelected={selectedChartIdByNode}
                    onChange={onChartChangeByNode}
                    color="primary"
                />
              </EuiFlexGroup>
              <EuiHorizontalRule margin="xs" />
              <EuiSpacer size="xs" />
              {Object.keys(nodeCounts).length > 0 ? (
                  <div ref={chartRefByNode} />
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
                <EuiTitle size="m">
                  <h3>
                    <b>Queries by Index</b>
                  </h3>
                </EuiTitle>
                <EuiButtonGroup
                    legend="Chart Type"
                    options={chartOptions}
                    idSelected={selectedChartIdByIndex}
                    onChange={onChartChangeByIndex}
                    color="primary"
                />
              </EuiFlexGroup>
              <EuiHorizontalRule margin="xs" />
              <EuiSpacer size="xs" />
              {Object.keys(indexCounts).length > 0 ? (
                  <div ref={chartRefByIndex} />
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
              items={queries}
              search={{
                box: {
                  placeholder: 'Search queries',
                  schema: false,
                },
                toolsLeft:  selectedItems.length > 0 && ([
                  <EuiButton
                      key="delete-button"
                      color="danger"
                      iconType="trash"
                      disabled={selectedItems.length === 0}
                      onClick={() => {
                        console.log('Deleting:', selectedItems);
                        setSelectedItems([]);
                      }}
                  >
                    Delete {selectedItems.length} {selectedItems.length !== 1 ? 'queries' : 'query'}
                  </EuiButton>,
                ]),
                filters: [
                  {
                    type: 'field_value_selection',
                    field: 'index',
                    name: 'Index',
                    multiSelect: 'or',
                    options: [...new Set(queries.map((q) => q.index))].map((val) => ({
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
                    options: [...new Set(queries.map((q) => q.search_type))].map((val) => ({
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
                    options: [...new Set(queries.map((q) => q.coordinator_node))].map((val) => ({
                      value: val,
                      name: val,
                      view: val,
                    })),
                  },
                ],
              }}
              columns={[
                { name: 'Timestamp', render: (item) => convertTime(item.timestamp), },
                { field: 'id', name: 'Query ID' },
                { field: 'index', name: 'Index' },
                {  name: 'Node' ,  render: (item) => item.node_label,},  // 💡 Swapped: show coordinator_node under "Node"
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
                { field: 'coordinator_node',
                  name: 'Coordinator node',
                },
                {
                  name: 'Actions',
                  actions: [
                    {
                      name: 'Delete',
                      description: 'Delete this query',
                      icon: 'trash',
                      color: 'danger',
                      type: 'icon',
                      onClick: async (item) => {
                        try {
                          const res = await core.http.post(`/api/_tasks/${item.task_id}/_cancel`);
                          console.log(`Cancelled task ${item}:`, res);
                        } catch (e) {
                          console.error(`Failed to cancel task ${item.task_id}`, e);
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
              itemId={(query) => `${query.id}-${query.timestamp}`}
              loading={!query}
          />
        </EuiPanel>
      </div>
  );
};
export default InflightQueries;
