/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { TIME_UNITS_TEXT, EXPORTER_TYPE, VALIDATION_LIMITS } from '../../../common/constants';

export const validateTopNSize = (topNSize: string): boolean => {
  const nVal = parseInt(topNSize, 10);
  if (topNSize !== nVal.toString() || Number.isNaN(nVal)) return false;
  return nVal >= VALIDATION_LIMITS.TOP_N_SIZE.MIN && nVal <= VALIDATION_LIMITS.TOP_N_SIZE.MAX;
};

export const validateWindowSize = (windowSize: string, timeUnit: string): boolean => {
  if (timeUnit === TIME_UNITS_TEXT[0].value) {
    // MINUTES
    const windowVal = parseInt(windowSize, 10);
    return windowSize !== '' && !Number.isNaN(windowVal) && windowSize === windowVal.toString();
  } else {
    // HOURS
    const windowVal = parseInt(windowSize, 10);
    if (windowSize !== windowVal.toString() || Number.isNaN(windowVal)) return false;
    return (
      windowVal >= VALIDATION_LIMITS.WINDOW_SIZE_HOURS.MIN &&
      windowVal <= VALIDATION_LIMITS.WINDOW_SIZE_HOURS.MAX
    );
  }
};

export const validateDeleteAfterDays = (deleteAfterDays: string, exporterType: string): boolean => {
  const isLocalIndex = exporterType === EXPORTER_TYPE.localIndex;
  if (!isLocalIndex) return true;

  const parsedDeleteAfter = parseInt(deleteAfterDays, 10);
  if (deleteAfterDays !== parsedDeleteAfter.toString() || Number.isNaN(parsedDeleteAfter))
    return false;
  return (
    parsedDeleteAfter >= VALIDATION_LIMITS.DELETE_AFTER_DAYS.MIN &&
    parsedDeleteAfter <= VALIDATION_LIMITS.DELETE_AFTER_DAYS.MAX
  );
};

export const validateConfiguration = (
  topNSize: string,
  windowSize: string,
  timeUnit: string,
  deleteAfterDays: string,
  exporterType: string
): boolean => {
  return (
    validateTopNSize(topNSize) &&
    validateWindowSize(windowSize, timeUnit) &&
    validateDeleteAfterDays(deleteAfterDays, exporterType)
  );
};
