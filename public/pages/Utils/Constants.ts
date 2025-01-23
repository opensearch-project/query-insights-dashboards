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

export const DEFAULT_TOP_N_SIZE = '3';
export const DEFAULT_WINDOW_SIZE = '1';
export const DEFAULT_TIME_UNIT = TIME_UNIT.MINUTES;
