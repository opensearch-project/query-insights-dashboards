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
} from '@elastic/eui';
import { CoreStart } from 'opensearch-dashboards/public';
import { Duration } from 'luxon';
import { filesize } from 'filesize';
import { LiveSearchQueryResponse } from '../../../types/types';
import { retrieveLiveQueries } from '../../../common/utils/QueryUtils';
import { API_ENDPOINTS } from '../../../common/utils/apiendpoints';
import { VegaChart } from './vegachart';
import { createVegaPieSpec } from './vegaspecs/pieChartSpec';
import { createVegaBarSpec } from './vegaspecs/barChartSpec';

export const InflightQueries = ({ core }: { core: CoreStart }) => {
  const DEFAULT_REFRESH_INTERVAL = 5000; // default 5s
  const TOP_N_DISPLAY_LIMIT = 9;
  const isFetching = useRef(false);
  const [query, setQuery] = useState<LiveSearchQueryResponse | null>(null);

  const [nodeCounts, setNodeCounts] = useState<Record<string, number>>({});
  const [indexCounts, setIndexCounts] = useState<Record<string, number>>({});

  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(DEFAULT_REFRESH_INTERVAL);

  const liveQueries = query?.response?.live_queries ?? [];

  const convertTime = (unixTime: number) => {
    const date = new Date(unixTime);
    const loc = date.toDateString().split(' ');
    return `${loc[1]} ${loc[2]}, ${loc[3]} @ ${date.toLocaleTimeString('en-US')}`;
  };

  const fetchliveQueries = async () => {
    const retrievedQueries = await retrieveLiveQueries(core);

    if (retrievedQueries.ok === false) {
      setQuery(null);
      setNodeCounts({});
      setIndexCounts({});
      return;
    }

    if (retrievedQueries?.response?.live_queries) {
      const tempNodeCount: Record<string, number> = {};
      const indexCount: Record<string, number> = {};
      const parsedQueries = retrievedQueries.response.live_queries.map((q) => {
        const indexMatch = q.description?.match(/indices\[(.*?)\]/);
        const searchTypeMatch = q.description?.match(/search_type\[(.*?)\]/);
        return {
          ...q,
          index: indexMatch ? indexMatch[1] : 'N/A',
          search_type: searchTypeMatch ? searchTypeMatch[1] : 'N/A',
          coordinator_node: q.node_id,
          node_label: q.node_id,
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
    selectable: (item: any) => item.measurements?.is_cancelled !== true,
    onSelectionChange: (selected: any[]) => setSelectedItems(selected),
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

  return (
    <div>
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
        <EuiFlexItem grow={true} style={{ minWidth: 380 }}>
          <EuiPanel paddingSize="m" style={{ minHeight: 700 }}>
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
                buttonSize="compressed"
              />
            </EuiFlexGroup>
            <EuiSpacer size="l" />
            {selectedChartIdByNode === 'donut' ? (
              <VegaChart
                spec={createVegaPieSpec(nodeCounts, 380, 380)}
                width={380}
                height={480} // 380 + extra for legend if needed
              />
            ) : (
              <VegaChart spec={createVegaBarSpec(nodeCounts, 380, 380)} width={380} height={380} />
            )}
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem grow={true} style={{ minWidth: 380 }}>
          <EuiPanel paddingSize="m" style={{ minHeight: 700 }}>
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
                buttonSize="compressed"
              />
            </EuiFlexGroup>
            <EuiSpacer size="l" />
            {selectedChartIdByIndex === 'donut' ? (
              <VegaChart
                spec={createVegaPieSpec(indexCounts, 380, 380)}
                width={380}
                height={480} // adjust if needed
              />
            ) : (
              <VegaChart spec={createVegaBarSpec(indexCounts, 380, 380)} width={380} height={380} />
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
            toolsLeft:
              selectedItems.length > 0
                ? [
                    <EuiButton
                      key="delete-button"
                      color="danger"
                      iconType="trash"
                      disabled={selectedItems.length === 0}
                      onClick={async () => {
                        await Promise.allSettled(
                          selectedItems.map((item) =>
                            core.http.post(API_ENDPOINTS.CANCEL_TASK(item.id)).then(
                              () => ({ status: 'fulfilled', id: item.id }),
                              (err) => ({ status: 'rejected', id: item.id, error: err })
                            )
                          )
                        );
                        setSelectedItems([]);
                      }}
                    >
                      Cancel {selectedItems.length}{' '}
                      {selectedItems.length !== 1 ? 'queries' : 'query'}
                    </EuiButton>,
                  ]
                : undefined,
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
                      const taskId = item.id;
                      await core.http.post(API_ENDPOINTS.CANCEL_TASK(taskId));
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
