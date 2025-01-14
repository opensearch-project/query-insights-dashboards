/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export const mockQueries = [
  {
    timestamp: 1731702972708, // Example timestamp in milliseconds
    search_type: 'query_then_fetch',
    indices: ['my-index'],
    group_by: 'SIMILARITY',
    phase_latency_map: {
      expand: 0,
      query: 5,
      fetch: 0,
    },
    labels: {},
    source: {
      size: 0,
      aggregations: {
        average_age: {
          avg: {
            field: 'age',
          },
        },
      },
    },
    node_id: 'HjvgxQ4AQTiddd43OV7pJA',
    task_resource_usages: [
      {
        action: 'indices:data/read/search[phase/query]',
        taskId: 82340,
        parentTaskId: 82339,
        nodeId: 'HjvgxQ4AQTiddd43OV7pJA',
        taskResourceUsage: {
          cpuTimeInNanos: 3335000,
          memoryInBytes: 10504,
        },
      },
      {
        action: 'indices:data/read/search',
        taskId: 82339,
        parentTaskId: -1,
        nodeId: 'HjvgxQ4AQTiddd43OV7pJA',
        taskResourceUsage: {
          cpuTimeInNanos: 690000,
          memoryInBytes: 6080,
        },
      },
    ],
    query_group_hashcode: '8c1e50c035663459d567fa11d8eb494d',
    total_shards: 1,
    measurements: {
      latency: {
        number: 20,
        count: 8,
        aggregationType: 'AVERAGE',
      },
      memory: {
        number: 132224,
        count: 8,
        aggregationType: 'AVERAGE',
      },
      cpu: {
        number: 11397000,
        count: 8,
        aggregationType: 'AVERAGE',
      },
    },
  },
];
