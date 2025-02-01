/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { retrieveQueryById } from './QueryUtils'; // Update with the correct path
const mockHttpGet = jest.fn();
const mockCore = { http: { get: mockHttpGet } };

describe('retrieveQueryById', () => {
  const dataSourceId = 'test-ds';
  const start = '2025-01-01T00:00:00Z';
  const end = '2025-01-31T23:59:59Z';
  const id = 'query-123';

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return the first top query from the fastest responding API', async () => {
    mockHttpGet.mockImplementation((endpoint) => {
      if (endpoint.includes('latency')) {
        return Promise.resolve({
          response: { top_queries: [{ id: 'query-123', query: 'SELECT * FROM test' }] },
        });
      }
      return Promise.resolve({ response: { top_queries: [] } });
    });

    const result = await retrieveQueryById(mockCore, dataSourceId, start, end, id);
    expect(result).toEqual({ id: 'query-123', query: 'SELECT * FROM test' });
  });

  it('should return null if no top queries are found', async () => {
    mockHttpGet.mockResolvedValue({ response: { top_queries: [] } });

    const result = await retrieveQueryById(mockCore, dataSourceId, start, end, id);
    expect(result).toBeNull();
  });

  it('should handle API errors gracefully and return null', async () => {
    mockHttpGet.mockRejectedValue(new Error('API error'));

    const result = await retrieveQueryById(mockCore, dataSourceId, start, end, id);
    expect(result).toBeNull();
  });
});
