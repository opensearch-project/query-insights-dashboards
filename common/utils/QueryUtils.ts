/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SearchQueryRecord } from '../../types/types';

// Utility function to fetch query by id and time range
export const retrieveQueryById = async (
  core: { http: { get: (endpoint: string, params: any) => Promise<any> } },
  dataSourceId: string,
  start: string | null,
  end: string | null,
  id: string | null
): Promise<SearchQueryRecord | null> => {
  const nullResponse = { response: { top_queries: [] } };
  const params = {
    query: {
      dataSourceId,
      from: start,
      to: end,
      id,
    },
  };

  const fetchMetric = async (endpoint: string) => {
    try {
      const response: { response: { top_queries: SearchQueryRecord[] } } = await core.http.get(
        endpoint,
        params
      );
      return {
        response: {
          top_queries: Array.isArray(response?.response?.top_queries)
            ? response.response.top_queries
            : [],
        },
      };
    } catch (error) {
      console.error('Error occurred while fetching the data:', error);
      return nullResponse;
    }
  };

  try {
    const topQueriesResponse = await Promise.any([
      fetchMetric(`/api/top_queries/latency`),
      fetchMetric(`/api/top_queries/cpu`),
      fetchMetric(`/api/top_queries/memory`),
    ]);
    return topQueriesResponse.response.top_queries[0] || null;
  } catch (error) {
    console.error('Error retrieving query details:', error);
    return null;
  }
};
