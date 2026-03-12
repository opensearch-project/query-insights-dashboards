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

export type PerformanceMetric = 'latency' | 'cpu' | 'memory' | 'count';
export type HeatmapAggregation = 'avg' | 'max' | 'min';
export type HeatmapGroupBy = 'index' | 'node' | 'username' | 'user_roles' | 'wlm_group';

export interface HeatmapChartData {
  times: string[];
  indices: string[];
  data: Array<[number, number, number | null, string]>;
  min: number;
  max: number;
}

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

  const formatOpts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };

  return {
    times: buckets.map((b) => {
      const date = new Date(b.time);
      return date.toLocaleDateString('en-US', formatOpts);
    }),
    bucketRanges: buckets.map((b) => {
      const bucketStart = new Date(b.time);
      const bucketEnd = new Date(b.time + bucketSize);
      return `${bucketStart.toLocaleDateString(
        'en-US',
        formatOpts
      )} - ${bucketEnd.toLocaleDateString('en-US', formatOpts)}`;
    }),
    max: buckets.map((b) => (b.count > 0 ? Number(b.max.toFixed(2)) : null)),
    avg: buckets.map((b) => (b.count > 0 ? Number((b.sum / b.count).toFixed(2)) : null)),
    min: buckets.map((b) => (b.count > 0 ? Number(b.min.toFixed(2)) : null)),
  };
};

const formatBytes = (bytes: number): string => {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(0)}GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${bytes.toFixed(0)}B`;
};

export const computeHeatmapChartData = (
  items: SearchQueryRecord[],
  from: string,
  to: string,
  performanceMetric: PerformanceMetric,
  aggregation: HeatmapAggregation = 'avg',
  groupBy: HeatmapGroupBy = 'index',
  numBuckets: number = 30
): HeatmapChartData => {
  const startTime = new Date(from).getTime();
  const endTime = new Date(to).getTime();
  const timeRange = endTime - startTime;
  const bucketSize = timeRange / numBuckets;

  // Collect unique group values based on groupBy
  const groupSet = new Set<string>();
  items.forEach((q) => {
    switch (groupBy) {
      case 'index':
        (q.indices || []).forEach((idx) => groupSet.add(idx));
        break;
      case 'node':
        if (q.node_id) groupSet.add(q.node_id);
        break;
      case 'username':
        if (q.labels?.username) groupSet.add(q.labels.username);
        break;
      case 'user_roles':
        (q.labels?.user_roles || []).forEach((role) => groupSet.add(role));
        break;
      case 'wlm_group':
        if (q.wlm_group_id) groupSet.add(q.wlm_group_id);
        break;
    }
  });
  const groups = Array.from(groupSet).sort();

  const buckets: Map<string, PerformanceChartBucket[]> = new Map();
  groups.forEach((g) => {
    const groupBuckets: PerformanceChartBucket[] = [];
    for (let i = 0; i < numBuckets; i++) {
      groupBuckets.push({
        time: startTime + i * bucketSize,
        max: 0,
        min: Infinity,
        sum: 0,
        count: 0,
      });
    }
    buckets.set(g, groupBuckets);
  });

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
      value = q.measurements?.memory?.number || 0;
    }

    // Get group keys for this query
    let groupKeys: string[] = [];
    switch (groupBy) {
      case 'index':
        groupKeys = q.indices || [];
        break;
      case 'node':
        groupKeys = q.node_id ? [q.node_id] : [];
        break;
      case 'username':
        groupKeys = q.labels?.username ? [q.labels.username] : [];
        break;
      case 'user_roles':
        groupKeys = q.labels?.user_roles || [];
        break;
      case 'wlm_group':
        groupKeys = q.wlm_group_id ? [q.wlm_group_id] : [];
        break;
    }

    groupKeys.forEach((key) => {
      const groupBuckets = buckets.get(key);
      if (!groupBuckets) return;
      const bucket = groupBuckets[bucketIndex];
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
  });

  const formatOpts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };

  const times = Array.from({ length: numBuckets }, (_, i) => {
    const date = new Date(startTime + i * bucketSize);
    return date.toLocaleDateString('en-US', formatOpts);
  });

  const data: Array<[number, number, number | null, string]> = [];
  let minVal = Infinity;
  let maxVal = -Infinity;

  groups.forEach((g, groupIndex) => {
    const groupBuckets = buckets.get(g)!;
    groupBuckets.forEach((bucket, timeIndex) => {
      let value: number | null = null;
      if (bucket.count > 0) {
        if (performanceMetric === 'count') {
          value = bucket.count;
        } else {
          switch (aggregation) {
            case 'max':
              value = bucket.max;
              break;
            case 'min':
              value = bucket.min;
              break;
            default:
              value = bucket.sum / bucket.count;
          }
        }
        minVal = Math.min(minVal, value);
        maxVal = Math.max(maxVal, value);
      }
      let formatted = '-';
      if (value !== null) {
        if (performanceMetric === 'count') {
          formatted = `${value}`;
        } else if (performanceMetric === 'memory') {
          formatted = formatBytes(value);
        } else {
          formatted = `${value.toFixed(0)}ms`;
        }
      }
      data.push([timeIndex, groupIndex, value, formatted]);
    });
  });

  return {
    times,
    indices: groups,
    data,
    min: minVal === Infinity ? 0 : minVal,
    max: maxVal === -Infinity ? 0 : maxVal,
  };
};
