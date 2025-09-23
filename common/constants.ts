/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export const TIMESTAMP = 'Timestamp';
export const TYPE = 'Type';
export const ID = 'Id';
export const QUERY_COUNT = 'Query Count';
export const LATENCY = 'Latency';
export const CPU_TIME = 'CPU Time';
export const MEMORY_USAGE = 'Memory Usage';
export const INDICES = 'Indices';
export const SEARCH_TYPE = 'Search Type';
export const NODE_ID = 'Coordinator Node ID';
export const TOTAL_SHARDS = 'Total Shards';
export const GROUP_BY = 'Group by';
export const AVERAGE_LATENCY = 'Average Latency';
export const AVERAGE_CPU_TIME = 'Average CPU Time';
export const AVERAGE_MEMORY_USAGE = 'Average Memory Usage';
/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
export const MetricType = {
  LATENCY: 'latency',
  CPU: 'cpu',
  MEMORY: 'memory',
};
export const METRIC_TYPES_TEXT = [
  { value: MetricType.LATENCY, text: 'Latency' },
  { value: MetricType.CPU, text: 'CPU' },
  { value: MetricType.MEMORY, text: 'Memory' },
];
export const TIME_UNITS_TEXT = [
  { value: 'MINUTES', text: 'Minute(s)' },
  { value: 'HOURS', text: 'Hour(s)' },
];
export const MINUTES_OPTIONS = [
  { value: '1', text: '1' },
  { value: '5', text: '5' },
  { value: '10', text: '10' },
  { value: '30', text: '30' },
];
export const GROUP_BY_OPTIONS = [
  { value: 'none', text: 'None' },
  { value: 'similarity', text: 'Similarity' },
];
export const TIME_UNIT = {
  MINUTES: 'MINUTES',
  HOURS: 'HOURS',
};
export const TIME_UNIT_ABBREVIATION = {
  MINUTES: 'm',
  HOURS: 'h',
};
export const EXPORTER_TYPE = {
  localIndex: 'local_index',
  none: 'none',
};
export const EXPORTER_TYPES_LIST = [
  { value: EXPORTER_TYPE.localIndex, text: 'Local Index' },
  { value: EXPORTER_TYPE.none, text: 'None' },
];
export const DEFAULT_METRIC_ENABLED = true;
export const DEFAULT_TOP_N_SIZE = '10';
export const DEFAULT_WINDOW_SIZE = '5';
export const DEFAULT_TIME_UNIT = TIME_UNIT.MINUTES;
export const DEFAULT_GROUP_BY = 'none';
export const DEFAULT_EXPORTER_TYPE = EXPORTER_TYPE.localIndex;
export const DEFAULT_DELETE_AFTER_DAYS = '7';
export const DEFAULT_REFRESH_INTERVAL = 30000; // default 30s
export const TOP_N_DISPLAY_LIMIT = 9;
export const WLM_GROUP_ID_PARAM = 'wlmGroupId';
