/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SearchQueryRecord, LiveSearchQueryResponse } from '../../types/types';
import { API_ENDPOINTS } from './apiendpoints';

interface CustomCore {
  http: { get: (endpoint: string) => Promise<any> };
  data?: {
    dataSources: {
      get: (id: string) => { get: (endpoint: string) => Promise<any> };
    };
  };
}

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
        const records = result.response.top_queries || [];
        return records.find((q) => q.id === id) || null;
      }
    }
    return null;
  } catch (error) {
    console.error('Error retrieving query details:', error);
    return null;
  }
};

export const retrieveLiveQueries = async (
  core: CustomCore,
  dataSourceId?: string
): Promise<LiveSearchQueryResponse> => {
  const nullResponse: LiveSearchQueryResponse = {
    ok: true,
    response: { live_queries: [] },
  };

  const errorResponse: LiveSearchQueryResponse = {
    ok: false,
    response: { live_queries: [] },
  };

  try {
    const http =
      dataSourceId && core.data?.dataSources ? core.data.dataSources.get(dataSourceId) : core.http;

    const response: LiveSearchQueryResponse = await http.get(API_ENDPOINTS.LIVE_QUERIES);
    const liveQueries = response?.response?.live_queries;

    if (Array.isArray(liveQueries)) {
      return response;
    } else {
      console.warn('No live queries found in response');
      return nullResponse;
    }
  } catch (error) {
    console.error('Error retrieving live queries:', error);
    return errorResponse;
  }
};
