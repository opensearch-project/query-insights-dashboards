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
  id: string | null,
  verbose: boolean
): Promise<SearchQueryRecord | null> => {
  const nullResponse = { response: { top_queries: [] } };
  const params = {
    query: {
      dataSourceId,
      from: start,
      to: end,
      id,
      verbose,
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
    const endpoints = [
      `/api/top_queries/latency`,
      `/api/top_queries/cpu`,
      `/api/top_queries/memory`,
    ];

    for (const endpoint of endpoints) {
      const result = await fetchMetric(endpoint);
      if (result.response.top_queries.length > 0) {
        return result.response.top_queries[0];
      }
    }
    return null;
  } catch (error) {
    console.error('Error retrieving query details:', error);
    return null;
  }
};
