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

  it('should find query by id from records array', async () => {
    const query1 = { ...mockQuery, id: '1111c38a-8eb8-436c-b825-ff97d75b8bd8' };
    const query2 = { ...mockQuery, id: '2222c38a-8eb8-436c-b825-ff97d75b8bd8' };
    const targetQuery = { ...mockQuery, id: '5073c38a-8eb8-436c-b825-ff97d75b8bd8' };
    const query3 = { ...mockQuery, id: '3333c38a-8eb8-436c-b825-ff97d75b8bd8' };
    const mockResponseWithTarget = {
      response: {
        top_queries: [query1, query2, targetQuery, query3],
      },
    };
    mockCore.http.get.mockResolvedValue(mockResponseWithTarget);

    const result = await retrieveQueryById(
      mockCore,
      undefined,
      testStart,
      testEnd,
      '5073c38a-8eb8-436c-b825-ff97d75b8bd8'
    );

    expect(result).toEqual(targetQuery);
  });

  it('should return null when id not found in records', async () => {
    const query1 = { ...mockQuery, id: '1111c38a-8eb8-436c-b825-ff97d75b8bd8' };
    const query2 = { ...mockQuery, id: '2222c38a-8eb8-436c-b825-ff97d75b8bd8' };
    const query3 = { ...mockQuery, id: '3333c38a-8eb8-436c-b825-ff97d75b8bd8' };
    const mockResponseWithMultiple = {
      response: {
        top_queries: [query1, query2, query3],
      },
    };
    mockCore.http.get.mockResolvedValue(mockResponseWithMultiple);

    const result = await retrieveQueryById(
      mockCore,
      undefined,
      testStart,
      testEnd,
      'a1a2a3a4-a5a6-7890-aaaa-aa1234567890'
    );

    expect(result).toBeNull();
  });
});
