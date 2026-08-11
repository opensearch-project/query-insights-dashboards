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
