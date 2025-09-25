/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { retrieveQueryById, retrieveLiveQueries } from './QueryUtils';
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
describe('retrieveLiveQueries - Fetch Live Queries from API', () => {
  const mockCore = {
    http: {
      get: jest.fn(),
    },
    data: {
      dataSources: {
        get: jest.fn().mockReturnValue({
          get: jest.fn(),
        }),
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockLiveQueriesResponse = {
    ok: true,
    response: {
      live_queries: [{ id: 'query1', status: 'running' }],
    },
  };

  it('should fetch live queries successfully', async () => {
    mockCore.http.get.mockResolvedValue(mockLiveQueriesResponse);

    const result = await retrieveLiveQueries(mockCore);

    expect(mockCore.http.get).toHaveBeenCalledWith('/api/live_queries', undefined);
    expect(result).toEqual(mockLiveQueriesResponse);
  });

  it('should fetch live queries with dataSourceId', async () => {
    const dataSourceId = 'test-datasource';
    const mockDataSourceHttp = { get: jest.fn().mockResolvedValue(mockLiveQueriesResponse) };
    mockCore.data.dataSources.get.mockReturnValue(mockDataSourceHttp);

    const result = await retrieveLiveQueries(mockCore, dataSourceId);

    expect(mockCore.data.dataSources.get).toHaveBeenCalledWith(dataSourceId);
    expect(mockDataSourceHttp.get).toHaveBeenCalledWith('/api/live_queries', {
      query: { dataSourceId },
    });
    expect(result).toEqual(mockLiveQueriesResponse);
  });

  it('should fetch live queries with wlmGroupId', async () => {
    const wlmGroupId = 'test-wlm-group';
    mockCore.http.get.mockResolvedValue(mockLiveQueriesResponse);

    const result = await retrieveLiveQueries(mockCore, undefined, wlmGroupId);

    expect(mockCore.http.get).toHaveBeenCalledWith('/api/live_queries', {
      query: { wlmGroupId },
    });
    expect(result).toEqual(mockLiveQueriesResponse);
  });

  it('should return null response when no live queries found', async () => {
    const emptyResponse = { ok: true, response: { live_queries: null } };
    mockCore.http.get.mockResolvedValue(emptyResponse);

    const result = await retrieveLiveQueries(mockCore);

    expect(result).toEqual({ ok: true, response: { live_queries: [] } });
  });

  it('should return error response when API fails', async () => {
    mockCore.http.get.mockRejectedValue(new Error('API error'));

    const result = await retrieveLiveQueries(mockCore);

    expect(result).toEqual({ ok: false, response: { live_queries: [] } });
  });
});
