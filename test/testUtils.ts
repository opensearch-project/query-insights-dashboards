/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SearchQueryRecord } from '../types/types';

export const MockQueries = (): SearchQueryRecord[] => {
  return [
    {
      timestamp: 1726178995210,
      task_resource_usages: [
        {
          action: 'indices:data/read/search[phase/query]',
          taskId: 18809,
          parentTaskId: 18808,
          nodeId: 'Q36D2z_NRGKim6EZZMgi6A',
          taskResourceUsage: {
            cpu_time_in_nanos: 3612000,
            memory_in_bytes: 123944,
          },
        },
        {
          action: 'indices:data/read/search',
          taskId: 18808,
          parentTaskId: -1,
          nodeId: 'Q36D2z_NRGKim6EZZMgi6A',
          taskResourceUsage: {
            cpu_time_in_nanos: 1898000,
            memory_in_bytes: 24176,
          },
        },
      ],
      source: {
        query: {
          bool: {
            must: [
              {
                range: {
                  timestamp: {
                    from: 1726092595177,
                    to: 1726178995177,
                    include_lower: true,
                    include_upper: true,
                    boost: 1.0,
                  },
                },
              },
            ],
            must_not: [
              {
                match: {
                  indices: {
                    query: 'top_queries*',
                    operator: 'OR',
                    prefix_length: 0,
                    max_expansions: 50,
                    fuzzy_transpositions: true,
                    lenient: false,
                    zero_terms_query: 'NONE',
                    auto_generate_synonyms_phrase_query: true,
                    boost: 1.0,
                  },
                },
              },
            ],
            adjust_pure_negative: true,
            boost: 1.0,
          },
        },
      },
      query_group_hashcode: '80a17984b847133b8bf5e7d5dfbfa96c',
      phase_latency_map: {
        expand: 0,
        query: 5,
        fetch: 0,
      },
      labels: {
        'X-Opaque-Id': 'ae6c1170-5f98-47f4-b7fc-09ebcf574b81',
      },
      total_shards: 1,
      search_type: 'query_then_fetch',
      node_id: 'Q36D2z_NRGKim6EZZMgi6A',
      indices: ['top_queries-2024.09.12'],
      measurements: {
        latency: {
          number: 8,
          count: 1,
          aggregationType: 'NONE',
        },
        cpu: {
          number: 5510000,
          count: 1,
          aggregationType: 'NONE',
        },
      },
    },
  ];
};
