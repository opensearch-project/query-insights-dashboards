/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Color constants for Query Profiler visualizations
 */
export const PROFILER_COLORS = {
  // Threshold colors for performance indicators
  RED: '#F66',           // High usage (>80% by default)
  ORANGE: '#FDB462',     // Medium usage (50-80% by default)
  GREEN: '#90EE90',      // Low usage (<50% by default)
  
  // Background colors
  BAR_BACKGROUND: '#F5F7FA',  // Background for progress bars
  
  // Text colors
  SUBDUED_TEXT: '#69707D',    // Subdued text color
  HEADER_TEXT: '#98A2B3',     // Header text color
  PRIMARY_TEXT: '#343741',    // Primary text color
} as const;

/**
 * Default threshold values (as percentages)
 */
export const DEFAULT_THRESHOLDS = {
  RED: 80,      // Red threshold: >80%
  ORANGE: 50,   // Orange threshold: >50%
} as const;

/**
 * Layout constants for Query Profiler components
 */
export const LAYOUT_CONSTANTS = {
  // QueryTree panel dimensions
  TREE_PANEL_DEFAULT_WIDTH: 320,
  TREE_PANEL_MIN_WIDTH: 180,
  TREE_PANEL_MAX_WIDTH: 600,
  
  // Tree node indentation
  TREE_NODE_INDENT: 12,
  TREE_HIERARCHY_INDENT: 20,
} as const;

/**
 * Utility function to get bar color based on time ratio and thresholds
 * @param time - Current time value
 * @param maxTime - Maximum time value for ratio calculation
 * @param redThreshold - Red threshold percentage (default: 80)
 * @param orangeThreshold - Orange threshold percentage (default: 50)
 * @returns Color hex code
 */
export const getBarColor = (
  time: number,
  maxTime: number,
  redThreshold: number = DEFAULT_THRESHOLDS.RED,
  orangeThreshold: number = DEFAULT_THRESHOLDS.ORANGE
): string => {
  const ratio = time / maxTime;
  if (ratio > redThreshold / 100) return PROFILER_COLORS.RED;
  if (ratio > orangeThreshold / 100) return PROFILER_COLORS.ORANGE;
  return PROFILER_COLORS.GREEN;
};
