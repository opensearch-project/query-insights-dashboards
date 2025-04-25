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

  it('should fetch only once if the first call returns a valid query', async () => {
    mockCore.http.get.mockResolvedValue(mockResponse);

    await retrieveQueryById(mockCore, undefined, testStart, testEnd, testId);

    expect(mockCore.http.get).toHaveBeenCalledTimes(1);
    expect(mockCore.http.get).toHaveBeenCalledWith('/api/top_queries/latency', {
      query: { from: testStart, to: testEnd, id: testId, dataSourceId: undefined },
    });
  });

  it('should try the next endpoints if the first call returns empty', async () => {
    mockCore.http.get
      .mockResolvedValueOnce({ response: { top_queries: [] } }) // latency - empty
      .mockResolvedValueOnce({ response: { top_queries: [] } }) // cpu - empty
      .mockResolvedValueOnce(mockResponse); // memory - found

    await retrieveQueryById(mockCore, undefined, testStart, testEnd, testId);

    expect(mockCore.http.get).toHaveBeenCalledTimes(3);
    expect(mockCore.http.get).toHaveBeenNthCalledWith(1, '/api/top_queries/latency', {
      query: { from: testStart, to: testEnd, id: testId, dataSourceId: undefined },
    });
    expect(mockCore.http.get).toHaveBeenNthCalledWith(2, '/api/top_queries/cpu', {
      query: { from: testStart, to: testEnd, id: testId, dataSourceId: undefined },
    });
    expect(mockCore.http.get).toHaveBeenNthCalledWith(3, '/api/top_queries/memory', {
      query: { from: testStart, to: testEnd, id: testId, dataSourceId: undefined },
    });
  });

  it('should return the valid query result', async () => {
    mockCore.http.get.mockResolvedValue(mockResponse);

    const result = await retrieveQueryById(mockCore, undefined, testStart, testEnd, testId);

    expect(result).toEqual(mockResponse.response.top_queries[0]);
  });

  it('should return null if all responses are empty', async () => {
    mockCore.http.get.mockResolvedValue({ response: { top_queries: [] } });

    const result = await retrieveQueryById(mockCore, undefined, testStart, testEnd, testId);

    expect(result).toBeNull();
    expect(mockCore.http.get).toHaveBeenCalledTimes(3);
  });

  it('should return null if all API responses are missing response field', async () => {
    mockCore.http.get.mockResolvedValue({});

    const result = await retrieveQueryById(mockCore, undefined, testStart, testEnd, testId);

    expect(result).toBeNull();
    expect(mockCore.http.get).toHaveBeenCalledTimes(3);
  });

  it('should return null if all API responses have unexpected structure', async () => {
    mockCore.http.get.mockResolvedValue({ unexpectedKey: {} });

    const result = await retrieveQueryById(mockCore, undefined, testStart, testEnd, testId);

    expect(result).toBeNull();
    expect(mockCore.http.get).toHaveBeenCalledTimes(3);
  });

  it('should return null if all API requests fail', async () => {
    mockCore.http.get.mockRejectedValue(new Error('API error'));

    const result = await retrieveQueryById(mockCore, undefined, testStart, testEnd, testId);

    expect(result).toBeNull();
    expect(mockCore.http.get).toHaveBeenCalledTimes(3);
  });
});
