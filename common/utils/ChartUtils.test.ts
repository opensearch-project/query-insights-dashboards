/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { computePerformanceChartData } from './ChartUtils';
import { SearchQueryRecord } from '../../types/types';

const createMockQuery = (
  timestamp: number,
  latency: number,
  cpu: number,
  memory: number
): SearchQueryRecord =>
  ({
    id: `query-${timestamp}`,
    timestamp,
    group_by: 'NONE',
    measurements: {
      latency: { number: latency, count: 1, aggregationType: 'NONE' },
      cpu: { number: cpu, count: 1, aggregationType: 'NONE' },
      memory: { number: memory, count: 1, aggregationType: 'NONE' },
    },
  } as SearchQueryRecord);

describe('computePerformanceChartData', () => {
  const baseTime = new Date('2024-01-15T10:00:00Z').getTime();
  const from = new Date(baseTime).toISOString();
  const to = new Date(baseTime + 60 * 60 * 1000).toISOString(); // 1 hour later

  it('returns empty buckets when no items provided', () => {
    const result = computePerformanceChartData([], from, to, 'latency', 5);
    expect(result.max).toEqual([null, null, null, null, null]);
    expect(result.avg).toEqual([null, null, null, null, null]);
    expect(result.min).toEqual([null, null, null, null, null]);
    expect(result.times).toHaveLength(5);
  });

  it('computes latency metrics correctly', () => {
    const items = [
      createMockQuery(baseTime + 5 * 60 * 1000, 100, 0, 0), // bucket 0
      createMockQuery(baseTime + 6 * 60 * 1000, 200, 0, 0), // bucket 0
      createMockQuery(baseTime + 15 * 60 * 1000, 50, 0, 0), // bucket 1
    ];
    const result = computePerformanceChartData(items, from, to, 'latency', 5);

    // Bucket 0: max=200, min=100, avg=150
    expect(result.max[0]).toBe(200);
    expect(result.min[0]).toBe(100);
    expect(result.avg[0]).toBe(150);

    // Bucket 1: max=50, min=50, avg=50
    expect(result.max[1]).toBe(50);
    expect(result.min[1]).toBe(50);
    expect(result.avg[1]).toBe(50);

    // Bucket 2-4: null (no data)
    expect(result.max[2]).toBeNull();
  });

  it('assigns items to correct buckets based on timestamp', () => {
    const hourMs = 60 * 60 * 1000;
    const items = [
      createMockQuery(baseTime + 0.1 * hourMs, 10, 0, 0), // bucket 0
      createMockQuery(baseTime + 0.3 * hourMs, 30, 0, 0), // bucket 1
      createMockQuery(baseTime + 0.5 * hourMs, 50, 0, 0), // bucket 2
      createMockQuery(baseTime + 0.7 * hourMs, 70, 0, 0), // bucket 3
      createMockQuery(baseTime + 0.9 * hourMs, 90, 0, 0), // bucket 4
    ];
    const result = computePerformanceChartData(items, from, to, 'latency', 5);

    expect(result.max[0]).toBe(10);
    expect(result.max[1]).toBe(30);
    expect(result.max[2]).toBe(50);
    expect(result.max[3]).toBe(70);
    expect(result.max[4]).toBe(90);
  });

  it('generates bucket ranges', () => {
    const result = computePerformanceChartData([], from, to, 'latency', 5);
    expect(result.bucketRanges).toHaveLength(5);
    result.bucketRanges.forEach((range) => {
      expect(range).toContain(' - ');
    });
  });

  it('uses multi-day format for time ranges over 24 hours', () => {
    const multiDayTo = new Date(baseTime + 48 * 60 * 60 * 1000).toISOString(); // 2 days
    const result = computePerformanceChartData([], from, multiDayTo, 'latency', 5);
    // Multi-day format includes month and day (e.g., "Jan 15")
    expect(result.times[0]).toMatch(/[A-Z][a-z]{2}/);
  });
});
