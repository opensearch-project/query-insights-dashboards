import React, { useState, useEffect, useContext } from 'react';
import { EuiBasicTable,  EuiFlexItem, EuiFieldSearch, EuiSuperDatePicker, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
// import testItems from './test';

const QueryInsights = () => {

  useEffect(() => {
    return () => {
    };
  }, []);
  const testItems = [
    {
      "timestamp" : 1719871061174,
      "task_resource_usages" : [
        {
          "action" : "indices:data/read/search[phase/query]",
          "taskId" : 54,
          "parentTaskId" : 53,
          "nodeId" : "F9Qw4La8RiOZXji7s6WtTw",
          "taskResourceUsage" : {
            "cpu_time_in_nanos" : 15461000,
            "memory_in_bytes" : 2050624
          }
        },
        {
          "action" : "indices:data/read/search",
          "taskId" : 53,
          "parentTaskId" : -1,
          "nodeId" : "F9Qw4La8RiOZXji7s6WtTw",
          "taskResourceUsage" : {
            "cpu_time_in_nanos" : 0,
            "memory_in_bytes" : 0
          }
        }
      ],
      "source" : "{\"size\":1000}",
      "labels" : {
        "X-Opaque-Id" : "cyji-id"
      },
      "search_type" : "query_then_fetch",
      "indices" : [
        "my-index-*"
      ],
      "phase_latency_map" : {
        "expand" : 0,
        "query" : 22,
        "fetch" : 1
      },
      "node_id" : "F9Qw4La8RiOZXji7s6WtTw",
      "total_shards" : 1,
      "latency" : 31,
      "memory" : 2050624,
      "cpu" : 15461000
    },
    {
      "timestamp" : 1719871061236,
      "task_resource_usages" : [
        {
          "action" : "indices:data/read/search[phase/query]",
          "taskId" : 58,
          "parentTaskId" : 57,
          "nodeId" : "F9Qw4La8RiOZXji7s6WtTw",
          "taskResourceUsage" : {
            "cpu_time_in_nanos" : 6625000,
            "memory_in_bytes" : 818120
          }
        },
        {
          "action" : "indices:data/read/search",
          "taskId" : 57,
          "parentTaskId" : -1,
          "nodeId" : "F9Qw4La8RiOZXji7s6WtTw",
          "taskResourceUsage" : {
            "cpu_time_in_nanos" : 0,
            "memory_in_bytes" : 0
          }
        }
      ],
      "source" : "{\"size\":20,\"query\":{\"bool\":{\"must\":[{\"match_phrase\":{\"message\":{\"query\":\"document\",\"slop\":0,\"zero_terms_query\":\"NONE\",\"boost\":1.0}}},{\"match\":{\"user.id\":{\"query\":\"cyji\",\"operator\":\"OR\",\"prefix_length\":0,\"max_expansions\":50,\"fuzzy_transpositions\":true,\"lenient\":false,\"zero_terms_query\":\"NONE\",\"auto_generate_synonyms_phrase_query\":true,\"boost\":1.0}}}],\"adjust_pure_negative\":true,\"boost\":1.0}}}",
      "labels" : { },
      "search_type" : "query_then_fetch",
      "indices" : [
        "my-index-0"
      ],
      "phase_latency_map" : {
        "expand" : 0,
        "query" : 16,
        "fetch" : 0
      },
      "node_id" : "F9Qw4La8RiOZXji7s6WtTw",
      "total_shards" : 1,
      "latency" : 17,
      "memory" : 818120,
      "cpu" : 6625000
    },
    {
      "timestamp" : 1719871061197,
      "task_resource_usages" : [
        {
          "action" : "indices:data/read/search[phase/query]",
          "taskId" : 56,
          "parentTaskId" : 55,
          "nodeId" : "F9Qw4La8RiOZXji7s6WtTw",
          "taskResourceUsage" : {
            "cpu_time_in_nanos" : 2824000,
            "memory_in_bytes" : 288328
          }
        },
        {
          "action" : "indices:data/read/search",
          "taskId" : 55,
          "parentTaskId" : -1,
          "nodeId" : "F9Qw4La8RiOZXji7s6WtTw",
          "taskResourceUsage" : {
            "cpu_time_in_nanos" : 0,
            "memory_in_bytes" : 0
          }
        }
      ],
      "source" : "{\"size\":20,\"query\":{\"term\":{\"user.id\":{\"value\":\"cyji\",\"boost\":1.0}}}}",
      "labels" : { },
      "search_type" : "query_then_fetch",
      "indices" : [
        "my-index-0"
      ],
      "phase_latency_map" : {
        "expand" : 0,
        "query" : 4,
        "fetch" : 0
      },
      "node_id" : "F9Qw4La8RiOZXji7s6WtTw",
      "total_shards" : 3,
      "latency" : 4,
      "memory" : 288328,
      "cpu" : 2824000
    },
    {
      "timestamp" : 1719871061255,
      "task_resource_usages" : [
        {
          "action" : "indices:data/read/search[phase/query]",
          "taskId" : 60,
          "parentTaskId" : 59,
          "nodeId" : "F9Qw4La8RiOZXji7s6WtTw",
          "taskResourceUsage" : {
            "cpu_time_in_nanos" : 805000,
            "memory_in_bytes" : 66680
          }
        },
        {
          "action" : "indices:data/read/search[phase/query]",
          "taskId" : 60,
          "parentTaskId" : 59,
          "nodeId" : "F9Qw4La8RiOZXji7s6WtTw",
          "taskResourceUsage" : {
            "cpu_time_in_nanos" : 805000,
            "memory_in_bytes" : 66680
          }
        },
        {
          "action" : "indices:data/read/search",
          "taskId" : 59,
          "parentTaskId" : -1,
          "nodeId" : "F9Qw4La8RiOZXji7s6WtTw",
          "taskResourceUsage" : {
            "cpu_time_in_nanos" : 0,
            "memory_in_bytes" : 0
          }
        }
      ],
      "source" : "{\"from\":0,\"size\":10,\"query\":{\"match_all\":{\"boost\":1.0}},\"sort\":[{\"user.age\":{\"order\":\"desc\"}}]}",
      "labels" : { },
      "search_type" : "query_then_fetch",
      "indices" : [
        "my-index-0",
        "my-index-1",
      ],
      "phase_latency_map" : { },
      "node_id" : "F9Qw4La8RiOZXji7s6WtTw",
      "total_shards" : 1,
      "latency" : 2,
      "memory" : 133360,
      "cpu" : 1610000
    },
    {
      "timestamp" : 1711059060452,
      "node_id" : "qaZrSOygTjmu2C9P8yw9AQ",
      "total_shards" : 1,
      "phase_latency_map" : {
        "expand" : 1,
        "query" : 2,
        "fetch" : 10
      },
      "search_type" : "query_then_fetch",
      "indices" : [
        "my-index-0"
      ],
      "source" : "{\"query\":{\"range\":{\"user.age\":{\"from\":50,\"to\":null,\"include_lower\":false,\"include_upper\":true,\"boost\":1.0}}}}",
      "latency" : 14,
      "cpu": 240,
      "memory": 30,
    }
  ];

  const convertTimestamp = (unixTime) => {
    const date = new Date(unixTime);
    const loc = date.toDateString().split(' ');
    return loc[1] + ' ' + loc[2] + ', ' + loc[3] + " @ " + date.toLocaleTimeString("en-US");
  };
  const cols = [
    {
      name: 'Time stamp',
      render: (item) => convertTimestamp(item.timestamp),
      sortable: (item) => item.timestamp,
      truncateText: true,
    },
    {
      name: 'Latency',
      render: (item) => `${item.latency} ms`,
      sortable: (item) => item.latency,
      truncateText: true,
    },
    {
      name: 'CPU usage',
      render: (item) => `${item.cpu} ns`,
      sortable: (item) => item.cpu,
      truncateText: true,
    },
    {
      name: 'Memory',
      render: (item) => `${item.memory} B`,
      sortable: (item) => item.memory,
      truncateText: true,
    },
    {
      field: 'indices',
      name: 'Indices',
      sortable: true,
      truncateText: true,
    },
    {
      name: 'Search type',
      render: (item) => item.search_type.replaceAll('_', ' '),
      sortable: (item) => item.search_type,
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
  // const items = [
  //   {
  //     "timestamp" : 1719871061255,
  //     "node_id" : "qaZrSOygTjmu2C9P8yw9AQ",
  //     "total_shards" : 1,
  //     "phase_latency_map" : {
  //       "expand" : 1,
  //       "query" : 2,
  //       "fetch" : 10
  //     },
  //     "search_type" : "query_then_fetch",
  //     "indices" : [
  //       "my-index-0"
  //     ],
  //     "source" : "{\"query\":{\"range\":{\"user.age\":{\"from\":50,\"to\":null,\"include_lower\":false,\"include_upper\":true,\"boost\":1.0}}}}",
  //     "latency" : 14,
  //     "cpu": 240,
  //     "memory": 30,
  //   }
  // ];
  const [sortField, setSortField] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState('asc');
  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
    enableAllColumns: true,
  };
  const onTableChange = ({ sort = {} }) => {
    const { field: sortField, direction: sortDirection } = sort;
    setSortField(sortField);
    setSortDirection(sortDirection);
  };

  const [recentlyUsedRanges, setRecentlyUsedRanges] = useState([{ start: 'now-30m', end: 'now' }]);
  const [loading, setLoading] = useState(false);
  const [start, setStart] = useState('now-30m');
  const [end, setEnd] = useState('now');

  const stopLoading = () => {
    setLoading(false);
  }

  const startLoading = () => {
    setTimeout(stopLoading, 1000);
  }

  const onTimeChange = ({ start, end}) => {
    const usedRange = recentlyUsedRanges.find(
      (recentlyUsedRange) => !(recentlyUsedRange.start === start && recentlyUsedRange.end === end)
    );
    usedRange.unshift({ start, end });
    setStart(start);
    setEnd(end);
    setRecentlyUsedRanges(usedRange.length > 5 ? usedRange.slice(0, 5) : usedRange);
    setLoading(true);
    startLoading();
  };

  const onRefresh = ({ start, end, refreshInterval }) => {
    return new Promise((resolve) => {
      setTimeout(resolve, 100);
    }).then(() => {
      console.log(start, end, refreshInterval);
    });
  };

  return (
    <div>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFieldSearch fullWidth placeholder="Search query" />
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ justifyContent: 'flex-end' }}>
          <EuiSuperDatePicker
            recentlyUsedRanges={recentlyUsedRanges}
            isLoading={loading}
            start={start}
            end={end}
            onTimeChange={onTimeChange}
            onRefresh={onRefresh}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size={'l'} direction={'vertical'}/>
      <EuiBasicTable
        items={testItems}
        columns={cols}
        sorting={sorting}
        onChange={onTableChange}
      />
    </div>
  );
};

export default QueryInsights;
