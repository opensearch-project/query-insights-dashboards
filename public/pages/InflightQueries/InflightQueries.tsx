/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useEffect,  useState, useRef} from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiLink,
  EuiText,
  EuiTitle,
  EuiTextAlign,
  EuiIcon,
  EuiButtonGroup,
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';
import embed, { VisualizationSpec } from 'vega-embed';
import { AppMountParameters, CoreStart } from 'opensearch-dashboards/public';
import { DataSourceManagementPluginSetup } from 'src/plugins/data_source_management/public';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';
import {LiveSearchQueryResponse} from "../../../types/types";
import {retrieveLiveQueries} from "../../../common/utils/QueryUtils";
const inflightQueries = ({
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
  const [query, setQuery] = useState<LiveSearchQueryResponse| null>(null);

  const [nodeCounts, setNodeCounts] = useState({});
  const [indexCounts, setIndexCounts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const chartRefByNode = useRef<HTMLDivElement>(null);
  const chartRefByIndex = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fetchliveQueries();
    const interval = setInterval(() => {
      fetchliveQueries();
    }, 2000);

    return () => clearInterval(interval);
  }, [core]);

  const fetchliveQueries = async () => {
    try {
      setIsLoading(true);
      const retrievedQueries = await retrieveLiveQueries(core);
      setQuery(retrievedQueries);

      if (retrievedQueries?.response?.live_queries) {
        const tempNodeCount = {};
        const indexCount = {};

        // Count occurrences
        retrievedQueries.response.live_queries.forEach(query => {
          tempNodeCount[query.node_id] = (tempNodeCount[query.node_id] || 0) + 1;

          const indexMatch = query.description.match(/indices\[(.*?)\]/);
          if (indexMatch) {
            const index = indexMatch[1];
            indexCount[index] = (indexCount[index] || 0) + 1;
          }
        });

        // Sort nodes by count and limit to top 9
        const sortedNodes = Object.entries(tempNodeCount)
            .sort(([, a], [, b]) => b - a);

        const nodeCount = {};
        let othersCount = 0;

        sortedNodes.forEach(([nodeId, count], index) => {
          if (index < 9) {
            nodeCount[nodeId] = count;
          } else {
            othersCount += count;
          }
        });

        if (othersCount > 0) {
          nodeCount['others'] = othersCount;
        }

        setNodeCounts(nodeCount);
        setIndexCounts(indexCount);
      }
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };


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

    queries.forEach(q => {
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
      value: value // Use 'value' instead of 'b' for clarity
    }));
  };

  const getChartSpec = (type: string, chartType: 'node' | 'index'): VisualizationSpec => {
    const isDonut = type.includes('donut');

    return {
      width: 400,
      height: 300,
      mark: isDonut
          ? { type: 'arc', innerRadius: 50 }
          : { type: 'bar' },
      encoding: isDonut
          ? {
            theta: { field: 'value', type: 'quantitative' },
            color: {
              field: 'label',
              type: 'nominal',
              title: chartType === 'node' ? 'Nodes' : 'Indices'
            },
            tooltip: [
              { field: 'label', type: 'nominal', title: chartType === 'node' ? 'Node' : 'Index' },
              { field: 'value', type: 'quantitative', title: 'Count' }
            ]
          }
          : {
            y: {
              field: 'value',
              type: 'quantitative',
              axis: { title: 'Count' }
            },
            x: {
              field: 'label',
              type: 'nominal',
              axis: { labelAngle: -45, title: chartType === 'node' ? 'Nodes' : 'Indices' }
            },
            color: {
              field: 'label',
              type: 'nominal',
              title: chartType === 'node' ? 'Nodes' : 'Indices'
            },
            tooltip: [
              { field: 'label', type: 'nominal', title: chartType === 'node' ? 'Node' : 'Index' },
              { field: 'value', type: 'quantitative', title: 'Count' }
            ]
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
                  <h2><b>{metrics?.activeQueries ?? 0 }</b></h2>
                </EuiTitle>
                <EuiIcon type="visGauge"/>
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
                  <h2><b>{metrics ? formatTime(metrics.avgElapsedSec) : 0}</b></h2>
                </EuiTitle>
                <EuiText size="s">
                  <p>(Avg. across {metrics?.activeQueries ?? 0 })</p>
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
                  <h2><b>{metrics ? formatTime(metrics.longestElapsedSec) : 0 }</b></h2>
                </EuiTitle>
                <EuiText size="s">
                  <p>ID: <EuiLink href="#/navigation/">{metrics?.longestQueryId ?? 0 }</EuiLink></p>
                </EuiText>
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
                  <h2><b>{metrics ? formatTime(metrics.totalCPUSec) : 0 }</b></h2>
                </EuiTitle>
                <EuiText size="s">
                  <p>(Sum across {metrics?.activeQueries ?? 0 })</p>
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
                  <h2><b>
                    {metrics ? formatMemory(metrics.totalMemoryBytes) : 0 }
                  </b></h2>
                </EuiTitle>
                <EuiText size="s">
                  <p>(Sum across {metrics?.activeQueries ?? 0 })</p>
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
                <h3><b>Queries by Node</b></h3>
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
                <h3><b>Queries by Index</b></h3>
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
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default inflightQueries;

