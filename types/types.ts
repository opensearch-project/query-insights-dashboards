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
