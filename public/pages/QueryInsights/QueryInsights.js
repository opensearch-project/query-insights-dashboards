import React, { useState, useEffect } from 'react';
import dateMath from '@elastic/datemath';
import { EuiSuperDatePicker, EuiInMemoryTable } from '@elastic/eui';

const QueryInsights = () => {
  const convertTime = (unixTime) => {
    const date = new Date(unixTime);
    const loc = date.toDateString().split(' ');
    return loc[1] + ' ' + loc[2] + ', ' + loc[3] + ' @ ' + date.toLocaleTimeString('en-US');
  };

  const cols = [
    {
      field: 'timestamp',
      name: 'Time stamp',
      render: (timestamp) => convertTime(timestamp),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'latency',
      name: 'Latency',
      render: (latency) => `${latency} ms`,
      sortable: true,
      truncateText: true,
    },
    {
      field: 'cpu',
      name: 'CPU usage',
      render: (cpu) => `${cpu} ns`,
      sortable: true,
      truncateText: true,
    },
    {
      field: 'memory',
      name: 'Memory',
      render: (memory) => `${memory} B`,
      sortable: true,
      truncateText: true,
    },
    {
      field: 'indices',
      name: 'Indices',
      render: (indices) => indices.toString(),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'search_type',
      name: 'Search type',
      render: (searchType) => searchType.replaceAll('_', ' '),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'node_id',
      name: 'Coordinator node ID',
      sortable: true,
      truncateText: true,
    },
    {
      field: 'total_shards',
      name: 'Total shards',
      sortable: true,
      truncateText: true,
    },
  ];

  const sorting = {
    sort: {
      field: 'timestamp',
      direction: 'desc',
    },
  };

  const retrievedQueries = [];
  const [queries, setQueries] = useState(retrievedQueries);

  const defaultStart = 'now-24h';
  const [recentlyUsedRanges, setRecentlyUsedRanges] = useState([
    { start: defaultStart, end: 'now' },
  ]);
  const [currStart, setStart] = useState(defaultStart);
  const [currEnd, setEnd] = useState('now');

  const parseDateString = (dateString) => {
    const date = dateMath.parse(dateString);
    return date ? date.toDate().getTime() : new Date().getTime();
  };

  const updateQueries = ({ start, end }) => {
    const startTimestamp = parseDateString(start);
    const endTimestamp = parseDateString(end);
    setQueries(
      retrievedQueries.filter(
        (item) => item.timestamp >= startTimestamp && item.timestamp <= endTimestamp
      )
    );
  };

  const onTimeChange = ({ start, end }) => {
    const usedRange = recentlyUsedRanges.filter(
      (range) => !(range.start === start && range.end === end)
    );
    usedRange.unshift({ start, end });
    setStart(start);
    setEnd(end);
    setRecentlyUsedRanges(usedRange.length > 10 ? usedRange.slice(0, 9) : usedRange);
    updateQueries({ start, end });
  };

  const onRefresh = async ({ start, end }) => {
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
        sorting={sorting}
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
            'timestamp',
            'latency',
            'cpu',
            'memory',
            'indices',
            'search_type',
            'node_id',
            'total_shards',
          ],
        }}
        allowNeutralSort={false}
      />
    </div>
  );
};

export default QueryInsights;
