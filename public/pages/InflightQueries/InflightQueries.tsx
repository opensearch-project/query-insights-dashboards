/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useEffect, useContext, useState, useRef} from 'react';
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
import { useHistory, useLocation } from 'react-router-dom';
import { AppMountParameters, CoreStart } from 'opensearch-dashboards/public';
import { DataSourceManagementPluginSetup } from 'src/plugins/data_source_management/public';
import {
  QUERY_INSIGHTS,
  DataSourceContext,
} from '../TopNQueries/TopNQueries';
import { QueryInsightsDataSourceMenu } from '../../components/DataSourcePicker';
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
  const history = useHistory();
  const location = useLocation();
  const [query, setQuery] = useState<LiveSearchQueryResponse| null>(null);

  const { dataSource, setDataSource } = useContext(DataSourceContext)!;
  const [nodeCounts, setNodeCounts] = useState({});
  const [indexCounts, setIndexCounts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchliveQueries = async () => {
    const retrievedQueries = await retrieveLiveQueries(core);
    setQuery(retrievedQueries);
    const nodeCount = {};
    const indexCount = {};

    query.response.live_queries.forEach(query => {
      // Count nodes
      nodeCount[query.node_id] = (nodeCount[query.node_id] || 0) + 1;

      // Extract and count indices
      const indexMatch = query.description.match(/indices\[(.*?)\]/);
      if (indexMatch) {
        const index = indexMatch[1];
        indexCount[index] = (indexCount[index] || 0) + 1;
      }
    });

    setNodeCounts(nodeCount);
    setIndexCounts(indexCount);
  };

  useEffect(() => {
    fetchliveQueries();
  }, []);

  useEffect(() => {
    core.chrome.setBreadcrumbs([
      {
        text: 'Query insights',
        href: QUERY_INSIGHTS,
        onClick: (e) => {
          e.preventDefault();
          history.push(QUERY_INSIGHTS);
        },
      },
    ]);
  }, [core.chrome, history, location]);

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





  const getChartSpec = (type: string): VisualizationSpec => {
    const isDonut = type.includes('donut'); // Donut is at index 0

    return {
      width: 400,
      height: 300,
      mark: isDonut
        ? { type: 'arc', innerRadius: 50 }  // donut
        : { type: 'bar' },                  // bar
      encoding: isDonut
        ? {
          theta: { field: 'b', type: 'quantitative' },
          color: { field: 'a', type: 'nominal' },
        }
        : {
          x: { field: 'a', type: 'ordinal', axis: { labelAngle: 0 } },
          y: { field: 'b', type: 'quantitative' },
        },
    };
  };

  const data = {
    table: [
      { a: 'A', b: 28 },
      { a: 'B', b: 55 },
      { a: 'C', b: 43 },
      { a: 'D', b: 91 },
    ],
  };
  const chartRefByNode = useRef<HTMLDivElement>(null);
  const chartRefByIndex = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chartRefByNode.current) {
      embed(
        chartRefByNode.current,
        {
          ...getChartSpec(selectedChartIdByNode),
          data: { values: data.table },
        },
        { actions: false }
      ).catch(console.error);
    }
  }, [data, selectedChartIdByNode]); // 🧠 key fix: add selectedChartIdByNode


  useEffect(() => {
    console.log([{ name: 'table', values: data.table }],);
    if (chartRefByIndex.current) {
      embed(chartRefByIndex.current, {
        ...getChartSpec(selectedChartIdByIndex),
        data: { values: data.table },
      }, { actions: false }).catch(console.error);
    }
  }, [data, selectedChartIdByIndex]);



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
        onSelectedDataSource= {fetchliveQueries}
        dataSourcePickerReadOnly={true}
      />
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
                  <h2><b>{metrics?.activeQueries ?? 'N/A'}</b></h2>
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
                  <h2><b>{metrics ? metrics.avgElapsedSec.toFixed(2) + ' s' : 'N/A'}</b></h2>
                </EuiTitle>
                <EuiText size="s">
                  <p>(Avg. across {metrics?.activeQueries ?? 'N/A'})</p>
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
                  <h2><b>{metrics ? metrics.longestElapsedSec.toFixed(2) + ' s' : 'N/A'}</b></h2>
                </EuiTitle>
                <EuiText size="s">
                  <p>ID: <EuiLink href="#/navigation/">{metrics?.longestQueryId ?? 'N/A'}</EuiLink></p>
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
                  <h2><b>{metrics ? metrics.totalCPUSec.toFixed(2) + ' s' : 'N/A'}</b></h2>
                </EuiTitle>
                <EuiText size="s">
                  <p>(Sum across {metrics?.activeQueries ?? 'N/A'})</p>
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
                    {metrics
                      ? (metrics.totalMemoryBytes / 1024 / 1024 / 1024).toFixed(2) + ' GB'
                      : 'N/A'}
                  </b></h2>
                </EuiTitle>
                <EuiText size="s">
                  <p>(Sum across {metrics?.activeQueries ?? 'N/A'})</p>
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
            <div ref={chartRefByNode} />
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
            <div ref={chartRefByIndex} />



          </EuiPanel>
        </EuiFlexItem>

      </EuiFlexGroup>
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default inflightQueries;

