/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { EuiBasicTableColumn, EuiInMemoryTable, EuiLink, EuiSuperDatePicker } from '@elastic/eui';
import { useHistory, useLocation } from 'react-router-dom';
import hash from 'object-hash';
import { CoreStart } from 'opensearch-dashboards/public';
import { QUERY_INSIGHTS } from '../TopNQueries/TopNQueries';
import { SearchQueryRecord } from '../../../types/types';
import {
  CPU_TIME,
  INDICES,
  LATENCY,
  MEMORY_USAGE,
  NODE_ID, QUERY_COUNT, QUERY_HASHCODE,
  SEARCH_TYPE,
  TIMESTAMP,
  TOTAL_SHARDS,
  TYPE,
} from '../../../common/constants';

const TIMESTAMP_FIELD = 'timestamp';
const MEASUREMENTS_FIELD = 'measurements';
const INDICES_FIELD = 'indices';
const SEARCH_TYPE_FIELD = 'search_type';
const NODE_ID_FIELD = 'node_id';
const TOTAL_SHARDS_FIELD = 'total_shards';
const METRIC_DEFAULT_MSG = 'Not enabled';
const GROUP_BY_FIELD = 'group_by'

const QueryInsights = ({
  queries,
  loading,
  onTimeChange,
  recentlyUsedRanges,
  currStart,
  currEnd,
  core,
}: {
  queries: SearchQueryRecord[];
  loading: boolean;
  onTimeChange: any;
  recentlyUsedRanges: any[];
  currStart: string;
  currEnd: string;
  core: CoreStart;
}) => {
  const history = useHistory();
  const location = useLocation();
  const [pagination, setPagination] = useState({ pageIndex: 0 });

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

  const convertTime = (unixTime: number) => {
    const date = new Date(unixTime);
    const loc = date.toDateString().split(' ');
    return `${loc[1]} ${loc[2]}, ${loc[3]} @ ${date.toLocaleTimeString('en-US')}`;
  };

  const cols: Array<EuiBasicTableColumn<any>> = [
    {
      name: QUERY_HASHCODE,
      render: (query: any) => {
        return (
          <span>
        <EuiLink onClick={() => {
          const route = query.group_by === 'SIMILARITY' ? `/query-group-details/${hash(query)}` : `/query-details/${hash(query)}`;
          history.push(route);
        }}>
          {query.query_hashcode || '-'}
        </EuiLink>
      </span>
        );
      },
      sortable: (query) => query.query_hashcode || '-',
      truncateText: true,
    },
    {
      name: TYPE,
      render: (query: any) => {
        return (
          <span>
        <EuiLink onClick={() => {
          const route = query.group_by === 'SIMILARITY' ? `/query-group-details/${hash(query)}` : `/query-details/${hash(query)}`;
          history.push(route);
        }}>
          {query.group_by === 'SIMILARITY' ? 'group' : 'query'}
        </EuiLink>
      </span>
        );
      },
      sortable: (query) => query.group_by || 'query',
      truncateText: true,
    },
    {
      field: MEASUREMENTS_FIELD,
      name: QUERY_COUNT,
      render: (measurements: any) => `${measurements?.latency?.count || measurements?.cpu?.count || measurements?.memory?.count || 1}`,
      sortable: (measurements: any) => {
        return Number(measurements?.latency?.count || measurements?.cpu?.count || measurements?.memory?.count || 1);
      },
      truncateText: true,
    },
    {
      // Make into flyout instead?
      name: TIMESTAMP,
      render: (query: any) => {
        const isQuery = query.group_by === 'NONE';
        const linkContent = isQuery ? convertTime(query.timestamp): '-';
        const onClickHandler = () => history.push(`/query-details/${hash(query)}`);

        return (
          <span>
          <EuiLink onClick={onClickHandler}>
            {linkContent}
          </EuiLink>
        </span>
        );
      },
      sortable: (query) => query.timestamp,
      truncateText: true,
    },
    {
      field: MEASUREMENTS_FIELD,
      name: LATENCY,
      render: (measurements: any) => {
        const latencyValue = measurements?.latency?.number;
        const latencyCount = measurements?.latency?.count;
        const result = latencyValue !== undefined && latencyCount !== undefined
          ? (latencyValue / latencyCount).toFixed(2)
          : METRIC_DEFAULT_MSG;
        return `${result} ms`;
      },
      sortable: true,
      truncateText: true,
    },
    {
      field: MEASUREMENTS_FIELD,
      name: CPU_TIME,
      render: (measurements: any) => {
        const cpuValue = measurements?.cpu?.number;
        const cpuCount = measurements?.cpu?.count;
        const result = cpuValue !== undefined && cpuCount !== undefined
          ? (cpuValue / cpuCount / 1000000).toFixed(2)
          : METRIC_DEFAULT_MSG;
        return `${result} ms`;
      },
      sortable: true,
      truncateText: true,
    },
    {
      field: MEASUREMENTS_FIELD,
      name: MEMORY_USAGE,
      render: (measurements: any) => {
        const memoryValue = measurements?.memory?.number;
        const memoryCount = measurements?.memory?.count;
        const result = memoryValue !== undefined && memoryCount !== undefined
          ? (memoryValue / memoryCount).toFixed(2)
          : METRIC_DEFAULT_MSG;
        return `${result} B`;
      },
      sortable: true,
      truncateText: true,
    },
    {
      field: INDICES_FIELD,
      name: INDICES,
      render: (indices: string[], query: any) => {
        const isSimilarity = query.group_by === 'SIMILARITY';
        return isSimilarity ? '-' : Array.from(new Set(indices.flat())).join(', ');
      },
      sortable: true,
      truncateText: true,
    },
    {
      field: SEARCH_TYPE_FIELD,
      name: SEARCH_TYPE,
      render: (searchType: string, query: any) => {
        const isSimilarity = query.group_by === 'SIMILARITY';
        return isSimilarity ? '-' : searchType.replaceAll('_', ' ');
      },
      sortable: true,
      truncateText: true,
    },
    {
      field: NODE_ID_FIELD,
      name: NODE_ID,
      render: (nodeId: string, query: any) => {
        const isSimilarity = query.group_by === 'SIMILARITY';
        return isSimilarity ? '-' : nodeId;
      },
      sortable: true,
      truncateText: true,
    },
    {
      field: TOTAL_SHARDS_FIELD,
      name: TOTAL_SHARDS,
      render: (totalShards: number, query: any) => {
        const isSimilarity = query.group_by === 'SIMILARITY';
        return isSimilarity ? '-' : totalShards;
      },
      sortable: true,
      truncateText: true,
    },
  ];

  const onRefresh = async ({ start, end }: { start: string; end: string }) => {
    onTimeChange({ start, end });
  };

  const filterDuplicates = (options: any[]) =>
    options.filter(
      (value, index, self) => index === self.findIndex((t) => t.value === value.value)
    );

  return (
    <EuiInMemoryTable
      items={queries}
      columns={cols}
      sorting={{
        sort: {
          field: TIMESTAMP_FIELD,
          direction: 'desc',
        },
      }}
      onTableChange={({ page: { index } }) => setPagination({ pageIndex: index })}
      pagination={pagination}
      loading={loading}
      search={{
        box: {
          placeholder: 'Search queries',
          schema: false,
        },
        filters: [
          {
            type: 'field_value_selection',
            field: GROUP_BY_FIELD,
            name: TYPE,
            multiSelect: true,
            options: [
              {
                value: 'NONE',
                name: 'query',
                view: 'query'
              },
              {
                value: 'SIMILARITY',
                name: 'group',
                view: 'group'
              },
            ],
            noOptionsMessage: 'No data available for the selected type', // Fallback message when no queries match
          },
          {
            type: 'field_value_selection',
            field: INDICES_FIELD,
            name: INDICES,
            multiSelect: true,
            options: filterDuplicates(
              queries.map((query) => {
                const values = Array.from(new Set(query[INDICES_FIELD].flat()));
                return {
                  value: values.join(','),
                  name: values.join(','),
                  view: values.join(', '),
                };
              })
            ),
          },
          {
            type: 'field_value_selection',
            field: SEARCH_TYPE_FIELD,
            name: SEARCH_TYPE,
            multiSelect: false,
            options: filterDuplicates(
              queries.map((query) => ({
                value: query[SEARCH_TYPE_FIELD],
                name: query[SEARCH_TYPE_FIELD],
                view: query[SEARCH_TYPE_FIELD],
              }))
            ),
          },
          {
            type: 'field_value_selection',
            field: NODE_ID_FIELD,
            name: NODE_ID,
            multiSelect: true,
            options: filterDuplicates(
              queries.map((query) => ({
                value: query[NODE_ID_FIELD],
                name: query[NODE_ID_FIELD],
                view: query[NODE_ID_FIELD].replaceAll('_', ' '),
              }))
            ),
          },
        ],
        toolsRight: [
          <EuiSuperDatePicker
            start={currStart}
            end={currEnd}
            onTimeChange={onTimeChange}
            recentlyUsedRanges={recentlyUsedRanges}
            onRefresh={onRefresh}
            updateButtonProps={{ fill: false }}
          />,
        ],
      }}
      executeQueryOptions={{
        defaultFields: [
          TIMESTAMP_FIELD,
          MEASUREMENTS_FIELD,
          INDICES_FIELD,
          SEARCH_TYPE_FIELD,
          NODE_ID_FIELD,
          TOTAL_SHARDS_FIELD,
        ],
      }}
      allowNeutralSort={false}
      itemId={(query) => `${query.query_hashcode}-${query.timestamp}`}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export default QueryInsights;
