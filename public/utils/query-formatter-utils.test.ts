/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 *   Copyright OpenSearch Contributors
 *
 *   Licensed under the Apache License, Version 2.0 (the "License").
 *   You may not use this file except in compliance with the License.
 *   A copy of the License is located at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   or in the "license" file accompanying this file. This file is distributed
 *   on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 *   express or implied. See the License for the specific language governing
 *   permissions and limitations under the License.
 */

import { formatQueryDisplay } from './query-formatter-utils';
import { SearchQueryRecord } from '../../types/types';
import { ISearchSource } from 'src/plugins/data/public';

describe('formatQueryDisplay', () => {
  it('handles source as complete JSON string', () => {
    const query: SearchQueryRecord = {
      timestamp: 1234567890,
      measurements: {},
      total_shards: 1,
      node_id: 'node1',
      source:
        '{"query": {"bool": {"must": [{"match": {"title": "opensearch"}}, {"range": {"timestamp": {"gte": "2023-01-01", "lte": "2023-12-31"}}}], "filter": [{"term": {"status": "published"}}]}}}',
      source_truncated: false,
      wlm_group_id: '',
      labels: {},
      search_type: 'query_then_fetch',
      indices: ['index1'],
      phase_latency_map: {},
      task_resource_usages: [],
      id: 'query1',
      group_by: 'similarity',
    };

    const result = formatQueryDisplay(query);

    const expected = [
      '{',
      '  "query": {',
      '    "bool": {',
      '      "must": [',
      '        {',
      '          "match": {',
      '            "title": "opensearch"',
      '          }',
      '        },',
      '        {',
      '          "range": {',
      '            "timestamp": {',
      '              "gte": "2023-01-01",',
      '              "lte": "2023-12-31"',
      '            }',
      '          }',
      '        }',
      '      ],',
      '      "filter": [',
      '        {',
      '          "term": {',
      '            "status": "published"',
      '          }',
      '        }',
      '      ]',
      '    }',
      '  }',
      '}',
    ].join('\n');

    expect(result).toBe(expected);
  });

  it('handles source as incomplete JSON string', () => {
    const query: SearchQueryRecord = {
      timestamp: 1234567890,
      measurements: {},
      total_shards: 1,
      node_id: 'node1',
      source:
        '{"query": {"bool": {"must": [{"match": {"title": "opensearch"}}, {"range": {"timestamp": {"gte": "2023-01-01"',
      source_truncated: true,
      wlm_group_id: '',
      labels: {},
      search_type: 'query_then_fetch',
      indices: ['index1'],
      phase_latency_map: {},
      task_resource_usages: [],
      id: 'query1',
      group_by: 'similarity',
    };

    const result = formatQueryDisplay(query);

    expect(result).toBe(query.source + '\n...');
  });

  it('handles source as object (old format)', () => {
    const query: SearchQueryRecord = {
      timestamp: 1234567890,
      measurements: {},
      total_shards: 1,
      node_id: 'node1',
      source: ({
        query: {
          match: { title: 'opensearch' },
        },
      } as unknown) as ISearchSource,
      source_truncated: false,
      labels: {},
      search_type: 'query_then_fetch',
      indices: ['index1'],
      phase_latency_map: {},
      task_resource_usages: [],
      id: 'query1',
      group_by: 'similarity',
    };

    const result = formatQueryDisplay(query);

    const expected = [
      '{',
      '  "query": {',
      '    "match": {',
      '      "title": "opensearch"',
      '    }',
      '  }',
      '}',
    ].join('\n');

    expect(result).toBe(expected);
  });

  it('handles null query input', () => {
    const result = formatQueryDisplay(null);
    expect(result).toBe('');
  });

  it('handles empty object source', () => {
    const query: SearchQueryRecord = {
      timestamp: 1234567890,
      measurements: {},
      total_shards: 1,
      node_id: 'node1',
      source: ({} as unknown) as ISearchSource,
      source_truncated: false,
      labels: {},
      search_type: 'query_then_fetch',
      indices: ['index1'],
      phase_latency_map: {},
      task_resource_usages: [],
      id: 'query1',
      group_by: 'similarity',
    };

    const result = formatQueryDisplay(query);
    expect(result).toBe('{}');
  });

  it('handles empty string source', () => {
    const query: SearchQueryRecord = {
      timestamp: 1234567890,
      measurements: {},
      total_shards: 1,
      node_id: 'node1',
      source: '{}',
      source_truncated: false,
      labels: {},
      search_type: 'query_then_fetch',
      indices: ['index1'],
      phase_latency_map: {},
      task_resource_usages: [],
      id: 'query1',
      group_by: 'similarity',
    };

    const result = formatQueryDisplay(query);
    expect(result).toBe('{}');
  });
});
