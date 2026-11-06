/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { defineRoutes } from './index';

type Handler = (context: any, request: any, response: any) => Promise<any>;

const registerSecurityHealthRoute = (dataSourceEnabled: boolean) => {
  const handlers: Record<string, Handler> = {};
  const register = (method: string) => (config: any, handler: Handler) => {
    handlers[`${method} ${config.path}`] = handler;
  };
  const router = {
    get: jest.fn(register('GET')),
    put: jest.fn(register('PUT')),
    post: jest.fn(register('POST')),
    delete: jest.fn(register('DELETE')),
  } as any;

  defineRoutes(router, dataSourceEnabled, {} as any);
  return handlers['GET /api/_plugins/_security/health'];
};

const makeContext = () => {
  const localCall = jest.fn();
  const dataSourceCall = jest.fn();
  const getClient = jest.fn(() => ({ callAPI: dataSourceCall }));
  const context = {
    queryInsights_plugin: {
      queryInsightsClient: {
        asScoped: jest.fn(() => ({ callAsCurrentUser: localCall })),
      },
    },
    dataSource: {
      opensearch: {
        legacy: { getClient },
      },
    },
  };
  return { context, localCall, dataSourceCall, getClient };
};

const makeResponse = () => ({
  ok: jest.fn((value) => value),
});

describe('GET /api/_plugins/_security/health', () => {
  it('uses the local client when MDS is enabled but no data source is selected', async () => {
    const handler = registerSecurityHealthRoute(true);
    const { context, localCall, dataSourceCall, getClient } = makeContext();
    const response = makeResponse();
    const health = { message: null, mode: 'strict', status: 'UP' };
    localCall.mockResolvedValue(health);

    await handler(context, { query: {} }, response);

    expect(localCall).toHaveBeenCalledWith('queryInsights.getSecurityHealth');
    expect(dataSourceCall).not.toHaveBeenCalled();
    expect(getClient).not.toHaveBeenCalled();
    expect(response.ok).toHaveBeenCalledWith({
      body: { ok: true, available: true, response: health },
    });
  });

  it('uses the selected MDS client when data sources are enabled', async () => {
    const handler = registerSecurityHealthRoute(true);
    const { context, localCall, dataSourceCall, getClient } = makeContext();
    const response = makeResponse();
    dataSourceCall.mockResolvedValue({ mode: 'strict', status: 'UP' });

    await handler(context, { query: { dataSourceId: 'ds-1' } }, response);

    expect(getClient).toHaveBeenCalledWith('ds-1');
    expect(dataSourceCall).toHaveBeenCalledWith('queryInsights.getSecurityHealth', {});
    expect(localCall).not.toHaveBeenCalled();
    expect(response.ok.mock.calls[0][0].body.available).toBe(true);
  });

  it.each([[{ mode: 'disabled', status: 'DOWN' }], [{ mode: 'strict', status: 'DOWN' }], [{}]])(
    'reports an inactive or unrecognized health body as unavailable',
    async (health) => {
      const handler = registerSecurityHealthRoute(false);
      const { context, localCall } = makeContext();
      const response = makeResponse();
      localCall.mockResolvedValue(health);

      await handler(context, { query: {} }, response);

      expect(response.ok.mock.calls[0][0].body).toEqual({
        ok: true,
        available: false,
        response: health,
      });
    }
  );

  it.each([401, 403])(
    'treats a %s response as evidence that Security is active',
    async (status) => {
      const handler = registerSecurityHealthRoute(false);
      const { context, localCall } = makeContext();
      const response = makeResponse();
      localCall.mockRejectedValue({ meta: { statusCode: status } });

      await handler(context, { query: {} }, response);

      expect(response.ok).toHaveBeenCalledWith({
        body: { ok: true, available: true },
      });
    }
  );

  it.each([400, 404, 503])('reports a %s response as unavailable', async (status) => {
    const handler = registerSecurityHealthRoute(false);
    const { context, localCall } = makeContext();
    const response = makeResponse();
    localCall.mockRejectedValue({ meta: { statusCode: status } });

    await handler(context, { query: {} }, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: { ok: true, available: false },
    });
  });

  it('classifies a recognizable health body carried by an error', async () => {
    const handler = registerSecurityHealthRoute(false);
    const { context, localCall } = makeContext();
    const response = makeResponse();
    const health = { mode: 'strict', status: 'UP' };
    localCall.mockRejectedValue({ meta: { body: health } });

    await handler(context, { query: {} }, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: { ok: true, available: true, response: health },
    });
  });

  it('keeps unexpected errors inconclusive, including generic error bodies', async () => {
    const handler = registerSecurityHealthRoute(false);
    const { context, localCall } = makeContext();
    const response = makeResponse();
    localCall.mockRejectedValue({
      message: 'upstream failed',
      meta: { statusCode: 500, body: { error: 'unexpected' } },
    });

    await handler(context, { query: {} }, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: { ok: false, error: 'upstream failed' },
    });
  });
});

const registerRoutes = (dataSourceEnabled = false) => {
  const routes: Record<string, { config: any; handler: Handler }> = {};
  const register = (method: string) => (config: any, handler: Handler) => {
    routes[`${method} ${config.path}`] = { config, handler };
  };
  const router = {
    get: jest.fn(register('GET')),
    put: jest.fn(register('PUT')),
    post: jest.fn(register('POST')),
    delete: jest.fn(register('DELETE')),
  } as any;
  defineRoutes(router, dataSourceEnabled, {} as any);
  return routes;
};

const makeErrorResponse = () => ({
  ok: jest.fn((value) => value),
  customError: jest.fn((value) => value),
});

describe('POST /api/tasks/{taskId}/cancel', () => {
  const makeCancelContext = (request: jest.Mock) => ({
    core: { opensearch: { client: { asCurrentUser: { transport: { request } } } } },
  });

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns ok when the task was cancelled', async () => {
    const { handler } = registerRoutes()['POST /api/tasks/{taskId}/cancel'];
    const request = jest.fn().mockResolvedValue({ body: { nodes: { n1: { tasks: {} } } } });
    const response = makeErrorResponse();

    await handler(makeCancelContext(request), { params: { taskId: 'n1:5' } }, response);

    expect(request).toHaveBeenCalledWith({ method: 'POST', path: '/_tasks/n1:5/_cancel' });
    expect(response.ok).toHaveBeenCalledWith({ body: expect.objectContaining({ ok: true }) });
    expect(response.customError).not.toHaveBeenCalled();
  });

  it('returns 404 when OpenSearch reports the task as not found', async () => {
    const { handler } = registerRoutes()['POST /api/tasks/{taskId}/cancel'];
    const request = jest.fn().mockResolvedValue({
      body: {
        node_failures: [
          {
            type: 'failed_node_exception',
            reason: 'Failed node [n1]',
            node_id: 'n1',
            caused_by: {
              type: 'resource_not_found_exception',
              reason: 'task [n1:99] is not found',
            },
          },
        ],
      },
    });
    const response = makeErrorResponse();

    await handler(makeCancelContext(request), { params: { taskId: 'n1:99' } }, response);

    expect(response.ok).not.toHaveBeenCalled();
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 404,
      body: { message: 'Failed to cancel task n1:99: task [n1:99] is not found' },
    });
  });

  it('passes the OpenSearch status through when the request fails', async () => {
    const { handler } = registerRoutes()['POST /api/tasks/{taskId}/cancel'];
    const request = jest
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('forbidden'), { statusCode: 403, meta: { statusCode: 403 } })
      );
    const response = makeErrorResponse();

    await handler(makeCancelContext(request), { params: { taskId: 'n1:5' } }, response);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 403,
      body: { message: 'forbidden' },
    });
  });
});

describe('top queries routes', () => {
  it.each(['latency', 'cpu', 'memory'])(
    'default verbose to true for /api/top_queries/%s like the OpenSearch API',
    (metric) => {
      const { config } = registerRoutes()[`GET /api/top_queries/${metric}`];
      expect(config.validate.query.validate({ from: 'a', to: 'b' }).verbose).toBe(true);
      expect(config.validate.query.validate({ from: 'a', to: 'b', verbose: 'false' }).verbose).toBe(
        false
      );
    }
  );

  it('builds the request with verbose when the caller omits it', async () => {
    const { config, handler } = registerRoutes()['GET /api/top_queries/latency'];
    const { context, localCall } = makeContext();
    localCall.mockResolvedValue({ top_queries: [] });
    const query = config.validate.query.validate({ from: 'a', to: 'b' });

    await handler(context, { query }, makeErrorResponse());

    expect(localCall).toHaveBeenCalledWith(
      'queryInsights.getTopNQueriesLatency',
      expect.objectContaining({ from: 'a', to: 'b', verbose: true })
    );
  });
});
