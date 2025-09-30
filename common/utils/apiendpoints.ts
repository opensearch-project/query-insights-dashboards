/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export const API_ENDPOINTS = {
  LIVE_QUERIES: '/api/live_queries',
  CANCEL_TASK: (taskId: string) => `/api/tasks/${taskId}/cancel`,
  WLM_STATS: '/api/_wlm/stats',
  WLM_WORKLOAD_GROUP: '/api/_wlm/workload_group',
};
