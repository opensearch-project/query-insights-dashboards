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

  const fetchliveQueries = async () => {
    const retrievedQueries = await retrieveLiveQueries(core);
    setQuery(retrievedQueries);
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
  const [selectedChartIdByUser, setSelectedChartIdByUser] = useState('donut');
  const [selectedChartIdByNode, setSelectedChartIdByNode] = useState('donut');

  const onChartChangeByIndex = (optionId: string) => {
    setSelectedChartIdByIndex(optionId);
    console.log('Chart type changed to:', optionId);
  };

  const onChartChangeByUser = (optionId: string) => {
    setSelectedChartIdByUser(optionId);
    console.log('Chart type changed to:', optionId);
  };

  const onChartChangeByNode = (optionId: string) => {
    setSelectedChartIdByNode(optionId);
    console.log('Chart type changed to:', optionId);
  };


  const metrics = React.useMemo(() => {
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
      data: { name: 'table' },
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
  const chartRefByUser = useRef<HTMLDivElement>(null);

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
    if (chartRefByIndex.current) {
      embed(chartRefByIndex.current, {
        ...getChartSpec(selectedChartIdByIndex),
        data: { values: data.table },
      }, { actions: false }).catch(console.error);
    }
  }, [data, selectedChartIdByIndex]);


  useEffect(() => {
    if (chartRefByUser.current) {
      embed(chartRefByUser.current, {
        ...getChartSpec(selectedChartIdByUser),
        data: { values: data.table },
      }, { actions: false }).catch(console.error);
    }
  }, [data, selectedChartIdByUser]);


  // const getChartSpec = (type: string): VisualizationSpec => {
  //   const isDonut = type.includes('donut'); // Donut is at index 0
  //
  //   return {
  //     width: 400,
  //     height: 300,
  //     mark: isDonut
  //       ? { type: 'arc', innerRadius: 50 }  // donut
  //       : { type: 'bar' },                  // bar
  //     encoding: isDonut
  //       ? {
  //         theta: { field: 'b', type: 'quantitative' },
  //         color: { field: 'a', type: 'nominal' },
  //       }
  //       : {
  //         x: { field: 'a', type: 'ordinal', axis: { labelAngle: 0 } },
  //         y: { field: 'b', type: 'quantitative' },
  //       },
  //     data: { name: 'table' },
  //   };
  // };
  //
  const buildChartData = (query,
    groupBy: 'node_id' | 'user' | 'indices'
  ): { a: string; b: number }[] => {
    if (!query?.response?.live_queries) return [];

    const groups: Record<string, number> = {};

    for (const q of query.response.live_queries) {
      let keys: string[] = [];

      if (groupBy === 'node_id') {
        keys = [q.node_id ?? 'unknown'];}

      for (const key of keys) {
        groups[key] = (groups[key] || 0) + 1;
      }
    }

    return Object.entries(groups).map(([a, b]) => ({ a, b }));
  };


  //
  //
  // const chartRefByNode = useRef<HTMLDivElement>(null);
  // const chartRefByIndex = useRef<HTMLDivElement>(null);
  // const chartRefByUser = useRef<HTMLDivElement>(null);
  //
  // useEffect(() => {
  //   if (chartRefByNode.current) {
  //     const table = buildChartData('node_id');
  //     console.log(table);
  //     embed(
  //       chartRefByNode.current,
  //       {
  //         ...getChartSpec(selectedChartIdByNode),
  //         data: [{ name: 'table', values: table }],
  //       },
  //       { actions: false }
  //     ).catch(console.error);
  //   }
  // }, [query, selectedChartIdByNode]);
  //
  //
  // useEffect(() => {
  //   if (chartRefByIndex.current) {
  //     const table = buildChartData('node_id');
  //     embed(chartRefByIndex.current, {
  //       ...getChartSpec(selectedChartIdByIndex),
  //       data: [{ name: 'table', values: table }],
  //     }, { actions: false }).catch(console.error);
  //   }
  // }, [query, selectedChartIdByIndex]);
  //
  //
  // useEffect(() => {
  //   if (chartRefByUser.current) {
  //     const table = buildChartData('node_id');
  //     embed(chartRefByUser.current, {
  //       ...getChartSpec(selectedChartIdByUser),
  //       data: [{ name: 'table', values: table }],
  //     }, { actions: false }).catch(console.error);
  //   }
  // }, [query, selectedChartIdByUser]);



  // const MyCollapsibleTablePanel = () => {
  //   const [isTableVisible, setIsTableVisible] = useState(false);
  //
  //   const toggleContent = () => {
  //     setIsTableVisible(!isTableVisible);
  //   };
  //
  //   const items = [
  //     { status: 'Running (agg)', Shard_ID: 'Shard-01', Phase_timeline: '' },
  //   ];
  //
  //   const columns = [
  //     { field: 'status', name: 'Status', truncateText: true },
  //     { field: 'Shard_ID', name: 'Shard ID', truncateText: true },
  //     { field: 'Phase_timeline', name: 'Phase timeline (Growing)', truncateText: true },
  //   ];
  //
  //
  //   return (
  //     <EuiPanel paddingSize="m">
  //       <EuiFlexGroup>
  //       <EuiButton
  //         onClick={toggleContent}
  //         size="s"
  //         color="text"
  //         fill={false}
  //         style={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}
  //       >
  //         <EuiIcon type={isTableVisible ? 'arrowDown' : 'arrowRight'} />
  //       </EuiButton>
  //         <EuiFlexGroup gutterSize="s" alignItems="center">
  //           <EuiFlexItem grow={false}><EuiText>ID</EuiText></EuiFlexItem>
  //           <EuiFlexItem grow={false}><EuiBadge>Index:</EuiBadge></EuiFlexItem>
  //           <EuiFlexItem grow={false}><EuiText>archive_data</EuiText></EuiFlexItem>
  //           <EuiFlexItem grow={false}><EuiBadge>Node:</EuiBadge></EuiFlexItem>
  //           <EuiFlexItem grow={false}><EuiText>Node1</EuiText></EuiFlexItem>
  //           <EuiFlexItem grow={false}><EuiBadge>User:</EuiBadge></EuiFlexItem>
  //           <EuiFlexItem grow={false}><EuiText>batch_processor</EuiText></EuiFlexItem>
  //         </EuiFlexGroup>
  //       </EuiFlexGroup>
  //
  //
  //       {!isTableVisible && (
  //         <>
  //           <EuiHorizontalRule margin="m" />
  //         </>
  //       )}
  //       <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="spaceBetween">
  //
  //           <EuiText style={{ marginTop: '16px' }}>Shard Completion Progress</EuiText>
  //           <EuiText style={{ marginTop: '16px' }}>30% 20/80</EuiText>
  //
  //
  //         </EuiFlexGroup>
  //       <EuiSpacer size="m" />
  //       <EuiProgress value={30} max={100} size="m" />
  //       <EuiSpacer size="m" />
  //
  //       <EuiFlexGroup gutterSize="s" wrap justifyContent="spaceBetween">
  //         <EuiFlexItem grow={false}>
  //           <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
  //             <EuiFlexItem grow={false}>
  //               <EuiBadge>Time Elapsed:</EuiBadge>
  //             </EuiFlexItem>
  //             <EuiFlexItem grow={false}>
  //               <EuiText size="s">2m 30s</EuiText>
  //             </EuiFlexItem>
  //           </EuiFlexGroup>
  //         </EuiFlexItem>
  //
  //         <EuiFlexItem grow={false}>
  //           <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
  //             <EuiFlexItem grow={false}>
  //               <EuiBadge>CPU:</EuiBadge>
  //             </EuiFlexItem>
  //             <EuiFlexItem grow={false}>
  //               <EuiText size="s">30%</EuiText>
  //             </EuiFlexItem>
  //           </EuiFlexGroup>
  //         </EuiFlexItem>
  //
  //         <EuiFlexItem grow={false}>
  //           <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
  //             <EuiFlexItem grow={false}>
  //               <EuiBadge>Memory Peak:</EuiBadge>
  //             </EuiFlexItem>
  //             <EuiFlexItem grow={false}>
  //               <EuiText size="s">500MB</EuiText>
  //             </EuiFlexItem>
  //           </EuiFlexGroup>
  //         </EuiFlexItem>
  //
  //         <EuiFlexItem grow={false}>
  //           <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
  //             <EuiFlexItem grow={false}>
  //               <EuiBadge>Active Shards:</EuiBadge>
  //             </EuiFlexItem>
  //             <EuiFlexItem grow={false}>
  //               <EuiText size="s">20</EuiText>
  //             </EuiFlexItem>
  //           </EuiFlexGroup>
  //         </EuiFlexItem>
  //       </EuiFlexGroup>
  //       <EuiSpacer size="m" />
  //
  //
  //       {isTableVisible && (
  //         <>
  //           <EuiHorizontalRule margin="m" />
  //         </>
  //       )}
  //
  //       {/* Collapsible Table */}
  //       {isTableVisible && (
  //         <div>
  //         <EuiText> Active shard Details</EuiText>
  //         <EuiBasicTable
  //           compressed
  //           items={items}
  //           columns={columns}
  //           tableLayout="fixed"
  //         />
  //           <EuiFlexGroup gutterSize="s">
  //             <EuiFlexItem grow={false}>
  //               <EuiButton size="s" color="primary">View Query Details</EuiButton>
  //             </EuiFlexItem>
  //             <EuiFlexItem grow={false}>
  //               <EuiButton size="s" color="danger">Kill Query</EuiButton>
  //             </EuiFlexItem>
  //           </EuiFlexGroup>
  //
  //         </div>
  //       )}
  //     </EuiPanel>
  //   );
  // };


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

        {/* Queries by User */}
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiTitle size="m">
                <h3><b>Queries by User</b></h3>
              </EuiTitle>
              <EuiButtonGroup
                legend="Chart Type"
                options={chartOptions}
                idSelected={selectedChartIdByUser}
                onChange={onChartChangeByUser}
                color="primary"
              />
            </EuiFlexGroup>
            <EuiHorizontalRule margin="xs" />
            <EuiSpacer size="xs" />
            <div ref={chartRefByUser} />

          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiFlexItem>
              <EuiTextAlign textAlign="center">
                <EuiText size="s">
                  <p>Succeeded</p>
                </EuiText>
                <EuiTitle size="l">
                  <h2><b>205</b></h2>
                </EuiTitle>
                <EuiText size="s">
                  <p>(Last 5 min*)</p>
                </EuiText>
              </EuiTextAlign>
            </EuiFlexItem>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiFlexItem>
              <EuiTextAlign textAlign="center">
                <EuiText size="s">
                  <p>Failed</p>
                </EuiText>
                <EuiTitle size="l">
                  <h2><b>3</b></h2>
                </EuiTitle>
                <EuiText size="s">
                  <p>(Last 5 min*)</p>
                </EuiText>
              </EuiTextAlign>
            </EuiFlexItem>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      {/*<EuiFlexGroup>*/}
      {/*  <EuiFlexItem>*/}
      {/*    <MyCollapsibleTablePanel />*/}
      {/*  </EuiFlexItem>*/}
      {/*</EuiFlexGroup>*/}
    </div>
  );
};




// eslint-disable-next-line import/no-default-export
export default inflightQueries;

