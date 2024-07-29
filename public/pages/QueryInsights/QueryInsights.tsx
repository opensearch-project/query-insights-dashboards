import React, { useState, useEffect } from 'react';
import dateMath from '@elastic/datemath';
import { EuiBasicTableColumn, EuiSuperDatePicker, EuiInMemoryTable } from '@elastic/eui';

const TIMESTAMP_FIELD = 'timestamp';
const LATENCY_FIELD = 'latency';
const CPU_FIELD = 'cpu';
const MEMORY_FIELD = 'memory';
const INDICES_FIELD = 'indices';
const SEARCH_TYPE_FIELD = 'search_type';
const NODE_ID_FIELD = 'node_id';
const TOTAL_SHARDS_FIELD = 'total_shards';

const QueryInsights = () => {
  const convertTime = (unixTime: number) => {
    const date = new Date(unixTime);
    const loc = date.toDateString().split(' ');
    return `${loc[1]} ${loc[2]}, ${loc[3]} @ ${date.toLocaleTimeString('en-US')}`;
  };

  const cols: Array<EuiBasicTableColumn<any>> = [
    {
      field: TIMESTAMP_FIELD,
      name: 'Time stamp',
      render: (timestamp: number) => convertTime(timestamp),
      sortable: true,
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

  const retrievedQueries: any[] = [];
  const [queries, setQueries] = useState(retrievedQueries);

  const defaultStart = 'now-24h';
  const [recentlyUsedRanges, setRecentlyUsedRanges] = useState([
    { start: defaultStart, end: 'now' },
  ]);
  const [currStart, setStart] = useState(defaultStart);
  const [currEnd, setEnd] = useState('now');

  const parseDateString = (dateString: string) => {
    const date = dateMath.parse(dateString);
    return date ? date.toDate().getTime() : new Date().getTime();
  };

  const updateQueries = ({ start, end }: { start: string; end: string }) => {
    const startTimestamp = parseDateString(start);
    const endTimestamp = parseDateString(end);
    setQueries(
      retrievedQueries.filter(
        (item) => item.timestamp >= startTimestamp && item.timestamp <= endTimestamp
      )
    );
  };

  const onTimeChange = ({ start, end }: { start: string; end: string }) => {
    const usedRange = recentlyUsedRanges.filter(
      (range) => !(range.start === start && range.end === end)
    );
    usedRange.unshift({ start, end });
    setStart(start);
    setEnd(end);
    setRecentlyUsedRanges(usedRange.length > 10 ? usedRange.slice(0, 9) : usedRange);
    updateQueries({ start, end });
  };

  const onRefresh = async ({ start, end }: { start: string; end: string }) => {
    updateQueries({ start, end });
  };

  useEffect(
    () => {
      onRefresh({ start: currStart, end: currEnd });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div>
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
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default QueryInsights;
