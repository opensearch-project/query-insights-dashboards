/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { DEFAULT_TIME_UNIT, DEFAULT_WINDOW_SIZE, TIME_UNIT_ABBREVIATION } from './Constants';

export function calculateMetric(
  value?: number,
  count?: number,
  factor: number = 1,
  defaultMsg: string = 'N/A'
): string {
  if (value !== undefined && count !== undefined) {
    return (value / count / factor).toFixed(2);
  }
  return defaultMsg;
}

export function getTimeUnitFromAbbreviation(timeUnit: string): string {
  for (const [key, value] of Object.entries(TIME_UNIT_ABBREVIATION)) {
    if (value === timeUnit) {
      return key;
    }
  }
  return DEFAULT_TIME_UNIT; // Return default time unit if no match is found
}

export function getTimeAndUnitFromString(time: string | undefined | null): string[] {
  const defaultWindowSize = [DEFAULT_WINDOW_SIZE, TIME_UNIT_ABBREVIATION.MINUTES];
  if (!time) {
    return defaultWindowSize;
  }
  const timeAndUnit = time.match(/\D+|\d+/g);
  if (!timeAndUnit || timeAndUnit.length !== 2) {
    return defaultWindowSize;
  }
  return [timeAndUnit[0], getTimeUnitFromAbbreviation(timeAndUnit[1])];
}
