/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SearchQueryRecord } from '../../types/types';
import { calculateMetricNumber } from './MetricUtils';

export interface PerformanceChartBucket {
  time: number;
  max: number;
  min: number;
  sum: number;
  count: number;
}

export interface PerformanceChartData {
  times: string[];
  bucketRanges: string[];
  max: Array<number | null>;
  avg: Array<number | null>;
  min: Array<number | null>;
}

export type PerformanceMetric = 'latency' | 'cpu' | 'memory';

export const computePerformanceChartData = (
  items: SearchQueryRecord[],
  from: string,
  to: string,
  performanceMetric: PerformanceMetric,
  numBuckets: number = 10
): PerformanceChartData => {
  const startTime = new Date(from).getTime();
  const endTime = new Date(to).getTime();
  const timeRange = endTime - startTime;
  const bucketSize = timeRange / numBuckets;
  const isMultiDay = timeRange > 24 * 60 * 60 * 1000;

  const buckets: PerformanceChartBucket[] = [];
  for (let i = 0; i < numBuckets; i++) {
    buckets.push({ time: startTime + i * bucketSize, max: 0, min: Infinity, sum: 0, count: 0 });
  }

  items.forEach((q) => {
    const bucketIndex = Math.min(
      Math.floor((q.timestamp - startTime) / bucketSize),
      numBuckets - 1
    );
    if (bucketIndex < 0) return;

    let value = 0;
    if (performanceMetric === 'latency') {
      value = q.measurements?.latency?.number || 0;
    } else if (performanceMetric === 'cpu') {
      value = calculateMetricNumber(q.measurements?.cpu?.number || 0, 1, 1000000);
    } else {
      value = calculateMetricNumber(q.measurements?.memory?.number || 0, 1, 1024 * 1024);
    }

    const bucket = buckets[bucketIndex];
    if (bucket.count === 0) {
      bucket.max = value;
      bucket.min = value;
    } else {
      bucket.max = Math.max(bucket.max, value);
      bucket.min = Math.min(bucket.min, value);
    }
    bucket.sum += value;
    bucket.count += 1;
  });

  const formatOpts: Intl.DateTimeFormatOptions = isMultiDay
    ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { hour: '2-digit', minute: '2-digit' };

  return {
    times: buckets.map((b) => {
      const date = new Date(b.time);
      return isMultiDay
        ? date.toLocaleDateString('en-US', formatOpts)
        : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }),
    bucketRanges: buckets.map((b) => {
      const bucketStart = new Date(b.time);
      const bucketEnd = new Date(b.time + bucketSize);
      return `${bucketStart.toLocaleString('en-US', formatOpts)} - ${bucketEnd.toLocaleString(
        'en-US',
        formatOpts
      )}`;
    }),
    max: buckets.map((b) => (b.count > 0 ? Number(b.max.toFixed(2)) : null)),
    avg: buckets.map((b) => (b.count > 0 ? Number((b.sum / b.count).toFixed(2)) : null)),
    min: buckets.map((b) => (b.count > 0 ? Number(b.min.toFixed(2)) : null)),
  };
};
