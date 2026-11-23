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
  source: ISearchSource | string; // source can be ISearchSource object for versions before 3.5 and string for versions after 3.5
  source_truncated: boolean; // if source (as a string) is truncated
  // 'DSL' for a search; for a query the SQL plugin reports, its language ('PPL'), whose source is
  // the query text. Absent on records from versions before SQL/PPL reporting.
  query_source?: string;
  // A SQL/PPL query's marker; the searches it ran carry it in derived_from and is_child.
  parent_marker?: string;
  derived_from?: string;
  is_child?: boolean;
  labels: Record<string, string>;
  search_type: string;
  indices: string[];
  phase_latency_map: PhaseLatencyMap;
  task_resource_usages: Task[];
  id: string;
  group_by: string;
  wlm_group_id?: string; // undefined when WLM is disabled or for old indices without this field
  username?: string;
  user_roles?: string[];
  backend_roles?: string[];
  failed?: boolean;
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

// --- New rich live query types matching backend LiveQueryRecord ---
export interface TaskDetailRecord {
  task_id: string;
  node_id: string;
  action: string;
  status: string;
  description?: string;
  start_time: number;
  running_time_nanos: number;
  cpu_nanos: number;
  memory_bytes: number;
}

export interface RichLiveQueryRecord {
  id: string;
  status: string;
  start_time: number;
  wlm_group_id?: string;
  total_latency_millis: number;
  total_cpu_nanos: number;
  total_memory_bytes: number;
  coordinator_task?: TaskDetailRecord;
  shard_tasks: TaskDetailRecord[];
  username?: string;
  user_roles?: string[];
  backend_roles?: string[];
  // A running PPL query's searches that have finished, whose tasks are gone; their CPU and memory
  // are part of the totals. Absent for a DSL search, and before any search finishes.
  finished_searches?: FinishedSearches;
}

export interface FinishedSearches {
  count: number;
  cpu_nanos: number;
  memory_bytes: number;
}

// Finished query record — extends SearchQueryRecord with top_n_id and status
export interface FinishedQueryRecord extends SearchQueryRecord {
  top_n_id?: string;
  status?: string;
}

// Legacy type kept for backward compatibility
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
  is_cancelled: boolean;
  wlm_group_id?: string; // undefined when WLM is disabled or for old indices without this field
  username?: string;
  user_roles?: string[];
  backend_roles?: string[];
}

export interface LiveQueriesApiResponse {
  live_queries: RichLiveQueryRecord[];
  finished_queries?: FinishedQueryRecord[];
}

export interface LiveSearchQueryResponse {
  ok: boolean;
  response: LiveQueriesApiResponse;
}
