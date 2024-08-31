import React, { useEffect, useState } from 'react';
import { EuiBasicTableColumn, EuiInMemoryTable, EuiSuperDatePicker } from '@elastic/eui';
import { useHistory, useLocation } from 'react-router-dom';
import { CoreStart } from '../../../../../src/core/public';
import { QUERY_INSIGHTS } from '../TopNQueries/TopNQueries';

const TIMESTAMP_FIELD = 'timestamp';
const LATENCY_FIELD = 'latency';
const CPU_FIELD = 'cpu';
const MEMORY_FIELD = 'memory';
const INDICES_FIELD = 'indices';
const SEARCH_TYPE_FIELD = 'search_type';
const NODE_ID_FIELD = 'node_id';
const TOTAL_SHARDS_FIELD = 'total_shards';
const METRIC_DEFAULT_MSG = 'Not enabled';

const QueryInsights = ({
  queries,
  loading,
  onTimeChange,
  recentlyUsedRanges,
  currStart,
  currEnd,
  core,
}: {
  queries: any[];
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
      // Make into flyout instead?
      name: 'Timestamp',
      render: (query: any) => {
        return <span>{convertTime(query.timestamp)}</span>;
      },
      sortable: (query) => query.timestamp,
      truncateText: true,
    },
    {
      field: LATENCY_FIELD,
      name: 'Latency',
      render: (latency: number) =>
        typeof latency !== 'undefined' ? `${latency} ms` : `${METRIC_DEFAULT_MSG}`,
      sortable: true,
      truncateText: true,
    },
    {
      field: CPU_FIELD,
      name: 'CPU usage',
      render: (cpu: number) => (typeof cpu !== 'undefined' ? `${cpu} ns` : `${METRIC_DEFAULT_MSG}`),
      sortable: true,
      truncateText: true,
    },
    {
      field: MEMORY_FIELD,
      name: 'Memory',
      render: (memory: number) =>
        typeof memory !== 'undefined' ? `${memory} B` : `${METRIC_DEFAULT_MSG}`,
      sortable: true,
      truncateText: true,
    },
    {
      field: INDICES_FIELD,
      name: 'Indices',
      render: (indices: string[]) => Array.from(new Set(indices.flat())).join(', '),
      sortable: true,
      truncateText: true,
    },
    {
      field: SEARCH_TYPE_FIELD,
      name: 'Search type',
      render: (searchType: string) => searchType.replaceAll('_', ' '),
      sortable: true,
      truncateText: true,
    },
    {
      field: NODE_ID_FIELD,
      name: 'Coordinator node ID',
      sortable: true,
      truncateText: true,
    },
    {
      field: TOTAL_SHARDS_FIELD,
      name: 'Total shards',
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
            field: INDICES_FIELD,
            name: 'Indices',
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
            name: 'Search type',
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
            name: 'Coordinator node ID',
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
          LATENCY_FIELD,
          CPU_FIELD,
          MEMORY_FIELD,
          INDICES_FIELD,
          SEARCH_TYPE_FIELD,
          NODE_ID_FIELD,
          TOTAL_SHARDS_FIELD,
        ],
      }}
      allowNeutralSort={false}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export default QueryInsights;
