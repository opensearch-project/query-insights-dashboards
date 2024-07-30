import React, { useState } from 'react';
import { EuiBasicTableColumn, EuiSuperDatePicker, EuiInMemoryTable, EuiLink } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
const TIMESTAMP_FIELD = 'timestamp';
const LATENCY_FIELD = 'latency';
const CPU_FIELD = 'cpu';
const MEMORY_FIELD = 'memory';
const INDICES_FIELD = 'indices';
const SEARCH_TYPE_FIELD = 'search_type';
const NODE_ID_FIELD = 'node_id';
const TOTAL_SHARDS_FIELD = 'total_shards';

const QueryInsights = ({ queries, loading, onQueriesChange, defaultStart } : { queries: any[], loading: boolean, onQueriesChange: any, defaultStart: string }) => {
  const history = useHistory();
  const convertTime = (unixTime: number) => {
    const date = new Date(unixTime);
    const loc = date.toDateString().split(' ');
    return `${loc[1]} ${loc[2]}, ${loc[3]} @ ${date.toLocaleTimeString('en-US')}`;
  };

  const cols: Array<EuiBasicTableColumn<any>> = [
    {
      name: 'Time stamp',
      render: (query: any) => {
        return (
          <span>
          <EuiLink onClick={() => {history.push(`/query-details/${query.node_id}`); console.log(history.location)}}>
            {convertTime(query.timestamp)}
          </EuiLink>
        </span>
        );
      },
      sortable: (query) => query.timestamp,
      truncateText: true,
    },
    {
      field: LATENCY_FIELD,
      name: 'latency',
      render: (latency: number) => `${latency} ms`,
      sortable: true,
      truncateText: true,
    },
    {
      field: CPU_FIELD,
      name: 'CPU usage',
      render: (cpu: number) => `${cpu} ns`,
      sortable: true,
      truncateText: true,
    },
    {
      field: MEMORY_FIELD,
      name: 'memory',
      render: (memory: number) => `${memory} B`,
      sortable: true,
      truncateText: true,
    },
    {
      field: INDICES_FIELD,
      name: 'indices',
      render: (indices: string[]) => indices.toString(),
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

  const [recentlyUsedRanges, setRecentlyUsedRanges] = useState([
    { start: defaultStart, end: 'now' },
  ]);
  const [currStart, setStart] = useState(defaultStart);
  const [currEnd, setEnd] = useState('now');

  const onTimeChange = ({ start, end }: { start: string; end: string }) => {
    const usedRange = recentlyUsedRanges.filter(
      (range) => !(range.start === start && range.end === end)
    );
    usedRange.unshift({ start, end });
    setStart(start);
    setEnd(end);
    setRecentlyUsedRanges(usedRange.length > 10 ? usedRange.slice(0, 9) : usedRange);
    onQueriesChange({ start, end });
  };

  const onRefresh = async ({ start, end }: { start: string; end: string }) => {
    onQueriesChange({ start, end });
  };

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
      search={{
        box: {
          placeholder: 'Search queries',
          schema: false,
        },
        toolsRight: [
          <EuiSuperDatePicker
            start={currStart}
            end={currEnd}
            recentlyUsedRanges={recentlyUsedRanges}
            onTimeChange={onTimeChange}
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
