/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ISearchSource } from 'src/plugins/data/public';

export interface SearchQueryRecord {
  timestamp: number;
  measurements: {
    latency?: Measurement;
    cpu?: Measurement;
    memory?: Measurement;
  };
  total_shards: number;
  node_id: string;
  source: ISearchSource;
  labels: Record<string, string>;
  search_type: string;
  indices: string[];
  phase_latency_map: PhaseLatencyMap;
  task_resource_usages: Task[];
  id: string;
  group_by: string;
}

export interface Measurement {
  number: number;
  count: number;
  aggregationType: string;
}

export interface PhaseLatencyMap {
  expand?: number;
  query?: number;
  fetch?: number;
}

export interface TaskResourceUsage {
  cpu_time_in_nanos: number;
  memory_in_bytes: number;
}
export interface Task {
  action: string;
  taskId: number;
  parentTaskId: number;
  nodeId: string;
  taskResourceUsage: TaskResourceUsage;
}

export interface MetricSettingsResponse {
  enabled?: string; // Could be 'true' or 'false'
  window_size?: string; // E.g., '15m', '1h'
  top_n_size?: string;
}

export interface ExporterSettingsResponse {
  type?: string;
  delete_after_days?: string;
}

export interface QueryInsightsSettingsResponse {
  latency?: MetricSettingsResponse;
  cpu?: MetricSettingsResponse;
  memory?: MetricSettingsResponse;
  group_by?: string;
  exporter?: ExporterSettingsResponse;
}

export interface LiveSearchQueryRecord {
  timestamp: number;
  id: string;
  description: string;
  measurements: {
    latency?: Measurement;
    cpu?: Measurement;
    memory?: Measurement;
  };
  node_id: string;
}

export interface LiveSearchQueryResponse {
  ok: boolean;
  response: {
    live_queries: LiveSearchQueryRecord[];
  };
}
