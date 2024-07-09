import React, { useState, useEffect } from 'react';
import dateMath from '@elastic/datemath';
import { EuiSuperDatePicker, EuiInMemoryTable } from '@elastic/eui';

const QueryInsights = () => {

  // Generated fake queries
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
      "timestamp" : 1712875061236,
      "task_resource_usages" : [
        {
          "action" : "indices:data/read/search[phase/query]",
          "taskId" : 58,
          "parentTaskId" : 57,
          "nodeId" : "P3aliJxGyghvQKjvhXf57u78",
          "taskResourceUsage" : {
            "cpu_time_in_nanos" : 6625000,
            "memory_in_bytes" : 818120
          }
        },
        {
          "action" : "indices:data/read/search",
          "taskId" : 57,
          "parentTaskId" : -1,
          "nodeId" : "P3aliJxGyghvQKjvhXf57u78",
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
      "node_id" : "P3aliJxGyghvQKjvhXf57u78",
      "total_shards" : 2,
      "latency" : 17,
      "memory" : 818120,
      "cpu" : 6625000
    },
    {
      "timestamp" : 1709871061197,
      "task_resource_usages" : [
        {
          "action" : "indices:data/read/search[phase/query]",
          "taskId" : 56,
          "parentTaskId" : 55,
          "nodeId" : "5xUwXtVhSWUdcEcDMZExFLsu",
          "taskResourceUsage" : {
            "cpu_time_in_nanos" : 2824000,
            "memory_in_bytes" : 288328
          }
        },
        {
          "action" : "indices:data/read/search",
          "taskId" : 55,
          "parentTaskId" : -1,
          "nodeId" : "5xUwXtVhSWUdcEcDMZExFLsu",
          "taskResourceUsage" : {
            "cpu_time_in_nanos" : 0,
            "memory_in_bytes" : 0
          }
        }
      ],
      "source" : "{\"size\":20,\"query\":{\"term\":{\"user.id\":{\"value\":\"cyji\",\"boost\":1.0}}}}",
      "labels" : { },
      "search_type" : "fetch",
      "indices" : [
        "my-index-0"
      ],
      "phase_latency_map" : {
        "expand" : 0,
        "query" : 4,
        "fetch" : 0
      },
      "node_id" : "5xUwXtVhSWUdcEcDMZExFLsu",
      "total_shards" : 3,
      "latency" : 4,
      "memory" : 288328,
      "cpu" : 2824000
    },
    {
      "timestamp" : 1714871061255,
      "task_resource_usages" : [
        {
          "action" : "indices:data/read/search[phase/query]",
          "taskId" : 60,
          "parentTaskId" : 59,
          "nodeId" : "kFeVUOtzZ9bTYHm2EHennkm",
          "taskResourceUsage" : {
            "cpu_time_in_nanos" : 805000,
            "memory_in_bytes" : 66680
          }
        },
        {
          "action" : "indices:data/read/search[phase/query]",
          "taskId" : 60,
          "parentTaskId" : 59,
          "nodeId" : "kFeVUOtzZ9bTYHm2EHennkm",
          "taskResourceUsage" : {
            "cpu_time_in_nanos" : 805000,
            "memory_in_bytes" : 66680
          }
        },
        {
          "action" : "indices:data/read/search",
          "taskId" : 59,
          "parentTaskId" : -1,
          "nodeId" : "kFeVUOtzZ9bTYHm2EHennkm",
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
      "node_id" : "kFeVUOtzZ9bTYHm2EHennkm",
      "total_shards" : 5,
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
      render: (search_type) => search_type.replaceAll('_', ' '),
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
    }
  };

  const [queries, setQueries] = useState(testItems);

  const convertTime = (unixTime) => {
    const date = new Date(unixTime);
    const loc = date.toDateString().split(' ');
    return loc[1] + ' ' + loc[2] + ', ' + loc[3] + " @ " + date.toLocaleTimeString("en-US");
  };

  const defaultStart = 'now-24h';
  const [recentlyUsedRanges, setRecentlyUsedRanges] = useState([{ start: defaultStart, end: 'now' }]);
  const [loading, setLoading] = useState(false);
  const [currStart, setStart] = useState(defaultStart);
  const [currEnd, setEnd] = useState('now');

  const parseDateString = (dateString) => {
    const date = dateMath.parse(dateString);
    return date ? date.toDate().getTime() : new Date().getTime();
  };

  const updateQueries = ({ start, end }) => {
    const startTimestamp = parseDateString(start);
    const endTimestamp = parseDateString(end);
    setQueries(testItems.filter((item) => item.timestamp >= startTimestamp && item.timestamp <= endTimestamp));
  }

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

  useEffect(() => {
    onRefresh({ start: currStart, end: currEnd });
  }, []);

  const searchTopNQueries = () => {
    return {
      box: {
        placeholder: 'Search queries',
        schema: false,
      },
      toolsRight: [
        <EuiSuperDatePicker
          start={currStart}
          end={currEnd}
          recentlyUsedRanges={recentlyUsedRanges}
          isLoading={loading}
          onTimeChange={onTimeChange}
          onRefresh={onRefresh}
          updateButtonProps={{ fill: false }}
        />,
      ],
    };
  };

  return (
    <div>
      <EuiInMemoryTable
        items={queries}
        columns={cols}
        sorting={sorting}
        loading={loading}
        search={searchTopNQueries()}
        executeQueryOptions={{
          defaultFields: [
            "timestamp",
            "latency",
            "cpu",
            "memory",
            "indices",
            "search_type",
            "node_id",
            "total_shards",
          ]
        }}
        allowNeutralSort={false}
      />
    </div>
  );
};

export default QueryInsights;
