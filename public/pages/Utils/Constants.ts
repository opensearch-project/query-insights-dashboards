/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export const METRIC_TYPES = [
  { value: 'latency', text: 'Latency' },
  { value: 'cpu', text: 'CPU' },
  { value: 'memory', text: 'Memory' },
];

export const TIME_UNITS = [
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

export const DEFAULT_TOP_N_SIZE = 3;
export const DEFAULT_WINDOW_SIZE = 1;
