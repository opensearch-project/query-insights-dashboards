/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { computePerformanceChartData, computeHeatmapChartData } from './ChartUtils';
import { SearchQueryRecord } from '../../types/types';

const createMockQuery = (
  timestamp: number,
  overrides: {
    latency?: number;
    cpu?: number;
    memory?: number;
    indices?: string[];
    nodeId?: string;
    username?: string;
    userRoles?: string[];
    wlmGroupId?: string;
  } = {}
): SearchQueryRecord => {
  const {
    latency = 100,
    cpu = 50,
    memory = 1024,
    indices = ['test-index'],
    nodeId = 'node-1',
    username,
    userRoles,
    wlmGroupId,
  } = overrides;
  return {
    id: `query-${timestamp}`,
    timestamp,
    group_by: 'NONE',
    indices,
    node_id: nodeId,
    username,
    user_roles: userRoles,
    wlm_group_id: wlmGroupId,
    measurements: {
      latency: { number: latency, count: 1, aggregationType: 'NONE' },
      cpu: { number: cpu, count: 1, aggregationType: 'NONE' },
      memory: { number: memory, count: 1, aggregationType: 'NONE' },
    },
  } as SearchQueryRecord;
};

describe('computePerformanceChartData', () => {
  const baseTime = new Date('2024-01-15T10:00:00Z').getTime();
  const from = new Date(baseTime).toISOString();
  const to = new Date(baseTime + 60 * 60 * 1000).toISOString(); // 1 hour later

  it('returns null values when no items provided', () => {
    const result = computePerformanceChartData([], from, to, 'latency', 5);
    expect(result.max).toEqual([null, null, null, null, null]);
    expect(result.times).toHaveLength(5);
  });

  it('computes max/min/avg correctly for multiple items in same bucket', () => {
    const items = [
      createMockQuery(baseTime + 5 * 60 * 1000, { latency: 100 }),
      createMockQuery(baseTime + 6 * 60 * 1000, { latency: 200 }),
    ];
    const result = computePerformanceChartData(items, from, to, 'latency', 5);

    expect(result.max[0]).toBe(200);
    expect(result.min[0]).toBe(100);
    expect(result.avg[0]).toBe(150);
  });

  it('ignores items with timestamp before range', () => {
    const items = [createMockQuery(baseTime - 1000, { latency: 999 })];
    const result = computePerformanceChartData(items, from, to, 'latency', 5);
    expect(result.max).toEqual([null, null, null, null, null]);
  });
});

describe('computeHeatmapChartData', () => {
  const baseTime = new Date('2024-01-15T10:00:00Z').getTime();
  const from = new Date(baseTime).toISOString();
  const to = new Date(baseTime + 60 * 60 * 1000).toISOString();

  it('returns empty data when no items provided', () => {
    const result = computeHeatmapChartData([], from, to, 'latency', 'avg', 'index', 5);
    expect(result.indices).toEqual([]);
    expect(result.data).toEqual([]);
  });

  it('groups by all supported groupBy options', () => {
    const items = [
      createMockQuery(baseTime + 1000, {
        indices: ['idx-1'],
        nodeId: 'node-1',
        username: 'alice',
        userRoles: ['admin'],
        wlmGroupId: 'wlm-1',
      }),
    ];

    expect(computeHeatmapChartData(items, from, to, 'latency', 'avg', 'index', 5).indices).toEqual([
      'idx-1',
    ]);
    expect(computeHeatmapChartData(items, from, to, 'latency', 'avg', 'node', 5).indices).toEqual([
      'node-1',
    ]);
    expect(
      computeHeatmapChartData(items, from, to, 'latency', 'avg', 'username', 5).indices
    ).toEqual(['alice']);
    expect(
      computeHeatmapChartData(items, from, to, 'latency', 'avg', 'user_roles', 5).indices
    ).toEqual(['admin']);
    expect(
      computeHeatmapChartData(items, from, to, 'latency', 'avg', 'wlm_group', 5).indices
    ).toEqual(['wlm-1']);
  });

  it('computes aggregations correctly', () => {
    const items = [
      createMockQuery(baseTime + 1000, { latency: 100, indices: ['idx'] }),
      createMockQuery(baseTime + 2000, { latency: 200, indices: ['idx'] }),
    ];

    const maxResult = computeHeatmapChartData(items, from, to, 'latency', 'max', 'index', 5);
    const minResult = computeHeatmapChartData(items, from, to, 'latency', 'min', 'index', 5);
    const avgResult = computeHeatmapChartData(items, from, to, 'latency', 'avg', 'index', 5);

    expect(maxResult.data[0][2]).toBe(200);
    expect(minResult.data[0][2]).toBe(100);
    expect(avgResult.data[0][2]).toBe(150);
  });

  it('counts queries for count metric', () => {
    const items = [
      createMockQuery(baseTime + 1000, { indices: ['idx'] }),
      createMockQuery(baseTime + 2000, { indices: ['idx'] }),
      createMockQuery(baseTime + 3000, { indices: ['idx'] }),
    ];
    const result = computeHeatmapChartData(items, from, to, 'count', 'avg', 'index', 5);

    expect(result.data[0][2]).toBe(3);
    expect(result.data[0][3]).toBe('3');
  });

  it('handles query with multiple indices', () => {
    const items = [createMockQuery(baseTime + 1000, { latency: 100, indices: ['idx-a', 'idx-b'] })];
    const result = computeHeatmapChartData(items, from, to, 'latency', 'avg', 'index', 5);

    expect(result.indices).toEqual(['idx-a', 'idx-b']);
    // Both indices should have the same value
    const idxAData = result.data.find((d) => d[1] === 0 && d[0] === 0);
    const idxBData = result.data.find((d) => d[1] === 1 && d[0] === 0);
    expect(idxAData?.[2]).toBe(100);
    expect(idxBData?.[2]).toBe(100);
  });

  it('formats memory values with units', () => {
    const items = [createMockQuery(baseTime + 1000, { memory: 1024 * 1024 * 100 })];
    const result = computeHeatmapChartData(items, from, to, 'memory', 'avg', 'index', 5);
    expect(result.data[0][3]).toBe('100MB');
  });
});
