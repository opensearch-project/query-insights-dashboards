/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { retrieveQueryById } from './QueryUtils';
import { mockQueries } from '../../test/mocks/mockQueries';
import { testQueryParams } from '../../test/mocks/testConstants';

jest.unmock('../../common/utils/QueryUtils');

describe('retrieveQueryById - Fetch Query Record by ID from API', () => {
  const mockCore = {
    http: {
      get: jest.fn(),
      post: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const testStart = testQueryParams?.start;
  const testEnd = testQueryParams?.end;
  const testId = testQueryParams?.id;
  const mockQuery = mockQueries[0];

  const mockResponse = {
    response: {
      top_queries: [mockQuery],
    },
  };

  it('should make three GET requests to fetch different query records', async () => {
    mockCore.http.get.mockResolvedValue(mockResponse);

    await retrieveQueryById(mockCore, undefined, testStart, testEnd, testId);

    expect(mockCore.http.get).toHaveBeenCalledTimes(3);
    expect(mockCore.http.get).toHaveBeenCalledWith('/api/top_queries/latency', {
      query: { from: testStart, to: testEnd, id: testId, dataSourceId: undefined },
    });
    expect(mockCore.http.get).toHaveBeenCalledWith('/api/top_queries/cpu', {
      query: { from: testStart, to: testEnd, id: testId, dataSourceId: undefined },
    });
    expect(mockCore.http.get).toHaveBeenCalledWith('/api/top_queries/memory', {
      query: { from: testStart, to: testEnd, id: testId, dataSourceId: undefined },
    });
  });

  it('should return the valid query result', async () => {
    mockCore.http.get.mockResolvedValue(mockResponse);

    const result = await retrieveQueryById(mockCore, undefined, testStart, testEnd, testId);

    expect(result).toEqual(mockResponse.response.top_queries[0]);
  });

  it('should return null if no queries are found', async () => {
    mockCore.http.get.mockResolvedValue({ response: { top_queries: [] } });

    const result = await retrieveQueryById(mockCore, undefined, testStart, testEnd, testId);

    expect(result).toBeNull();
  });
  it('should return null if API response is missing the response field', async () => {
    mockCore.http.get.mockResolvedValue({});

    const result = await retrieveQueryById(mockCore, undefined, testStart, testEnd, testId);

    expect(result).toBeNull();
  });

  it('should return null if API response contains an unexpected structure', async () => {
    mockCore.http.get.mockResolvedValue({ unexpectedKey: {} });

    const result = await retrieveQueryById(mockCore, undefined, testStart, testEnd, testId);

    expect(result).toBeNull();
  });

  it('should return null if API request fails', async () => {
    mockCore.http.get.mockRejectedValue(new Error('API error'));

    const result = await retrieveQueryById(mockCore, undefined, testStart, testEnd, testId);

    expect(result).toBeNull();
  });

  it('should handle cases where API returns an empty object instead of expected response structure', async () => {
    mockCore.http.get.mockResolvedValue({});

    const result = await retrieveQueryById(mockCore, undefined, testStart, testEnd, testId);

    expect(result).toBeNull();
  });

});
