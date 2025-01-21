/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export function calculateMetric(
  value?: number,
  count?: number,
  unit: string = '',
  factor: number = 1,
  defaultMsg: string = 'N/A'
): string {
  if (value !== undefined && count !== undefined) {
    return `${(value / count / factor).toFixed(2)} ${unit}`;
  }
  return defaultMsg;
}
