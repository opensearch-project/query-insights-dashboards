/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { IRouter, Logger } from '../../../../src/core/server';
import {
  QUERY_INSIGHTS_ACCESS_DENIED_TITLE,
  QUERY_INSIGHTS_REQUEST_FAILED_MESSAGE,
  QUERY_INSIGHTS_SETTINGS_ACCESS_DENIED_TITLE,
  QUERY_INSIGHTS_SETTINGS_UPDATE_DENIED_TITLE,
} from '../../common/constants';
import { defineRoutes } from './index';

type Handler = (...args: unknown[]) => Promise<unknown>;

const createRouter = () => {
  const handlers: Record<string, Handler> = {};
  const register = (method: string) =>
    jest.fn((config: { path: string }, handler: Handler) => {
      handlers[`${method} ${config.path}`] = handler;
    });

  return {
    handlers,
    router: {
      get: register('GET'),
      put: register('PUT'),
      post: register('POST'),
      delete: register('DELETE'),
    } as unknown as IRouter,
  };
};

const createResponse = () => ({
  ok: jest.fn(),
  custom: jest.fn(),
  customError: jest.fn(),
});

const createContext = (localCall: jest.Mock, dataSourceCall: jest.Mock) => ({
  queryInsights_plugin: {
    queryInsightsClient: {
      asScoped: jest.fn(() => ({ callAsCurrentUser: localCall })),
    },
  },
  dataSource: {
    opensearch: {
      getClient: jest.fn().mockResolvedValue({
        transport: {
          request: dataSourceCall,
        },
      }),
      legacy: {
        getClient: jest.fn(() => ({
          callAPI: dataSourceCall,
        })),
      },
    },
  },
});

describe('top queries route errors', () => {
  const loggerError = jest.fn();
  const logger = { error: loggerError } as unknown as Logger;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a sanitized 403 for a local-cluster security exception', async () => {
    const { handlers, router } = createRouter();
    const localCall = jest.fn().mockRejectedValue({
      statusCode: 403,
      message:
        '[security_exception] no permissions for top queries and User [name=arn:aws:iam::123456789012:role/example]',
    });
    const dataSourceCall = jest.fn();
    const context = createContext(localCall, dataSourceCall);
    const response = createResponse();
    defineRoutes(router, false, logger);

    await handlers['GET /api/top_queries'](context, { query: {} }, response);

    expect(response.ok).not.toHaveBeenCalled();
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 403,
      body: {
        message: QUERY_INSIGHTS_ACCESS_DENIED_TITLE,
      },
    });
    expect(JSON.stringify(response.customError.mock.calls[0][0])).not.toContain('arn:aws:iam');
    expect(JSON.stringify(loggerError.mock.calls)).not.toContain('arn:aws:iam');
  });

  it('returns a sanitized 403 for a data-source security exception', async () => {
    const { handlers, router } = createRouter();
    const localCall = jest.fn();
    const dataSourceCall = jest.fn().mockRejectedValue({
      statusCode: 403,
      message:
        'Data Source Error: [security_exception] no permissions for top queries and User [name=arn:aws:iam::123456789012:role/example]',
      body: {
        error: {
          type: 'security_exception',
        },
      },
    });
    const context = createContext(localCall, dataSourceCall);
    const response = createResponse();
    defineRoutes(router, true, logger);

    await handlers['GET /api/top_queries/latency'](
      context,
      {
        query: {
          dataSourceId: 'data-source-id',
          from: '',
          to: '',
          id: '',
          verbose: false,
        },
      },
      response
    );

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 403,
      body: {
        message: QUERY_INSIGHTS_ACCESS_DENIED_TITLE,
      },
    });
    expect(JSON.stringify(response.customError.mock.calls[0][0])).not.toContain('arn:aws:iam');
    expect(JSON.stringify(loggerError.mock.calls)).not.toContain('arn:aws:iam');
    expect(context.dataSource.opensearch.getClient).toHaveBeenCalledWith('data-source-id');
    expect(dataSourceCall).toHaveBeenCalledWith({
      method: 'GET',
      path: '/_insights/top_queries',
      querystring: {
        type: 'latency',
        from: '',
        to: '',
        verbose: false,
      },
    });
  });

  it('normalizes and sanitizes a resolved data-source security failure', async () => {
    const { handlers, router } = createRouter();
    const localCall = jest.fn();
    const dataSourceCall = jest.fn().mockResolvedValue({
      body: {
        ok: false,
        response:
          'Data Source Error: [security_exception] no permissions for top queries and User [name=arn:aws:iam::123456789012:role/example]',
      },
    });
    const context = createContext(localCall, dataSourceCall);
    const response = createResponse();
    defineRoutes(router, true, logger);

    await handlers['GET /api/top_queries/latency'](
      context,
      {
        query: {
          dataSourceId: 'data-source-id',
          from: '',
          to: '',
          id: '',
          verbose: false,
        },
      },
      response
    );

    expect(response.ok).not.toHaveBeenCalled();
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 403,
      body: {
        message: QUERY_INSIGHTS_ACCESS_DENIED_TITLE,
      },
    });
    expect(JSON.stringify(response.customError.mock.calls)).not.toContain('arn:aws:iam');
    expect(JSON.stringify(loggerError.mock.calls)).not.toContain('arn:aws:iam');
  });

  it.each([400, 401])(
    'preserves an explicit %i security status without exposing details',
    async (statusCode) => {
      const { handlers, router } = createRouter();
      const localCall = jest.fn().mockRejectedValue({
        statusCode,
        message:
          '[security_exception] authentication failed for User [name=arn:aws:iam::123456789012:role/example]',
        body: {
          error: {
            type: 'security_exception',
          },
        },
      });
      const context = createContext(localCall, jest.fn());
      const response = createResponse();
      defineRoutes(router, false, logger);

      await handlers['GET /api/top_queries'](context, { query: {} }, response);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode,
        body: {
          message: QUERY_INSIGHTS_REQUEST_FAILED_MESSAGE,
        },
      });
      expect(JSON.stringify(response.customError.mock.calls)).not.toContain('arn:aws:iam');
      expect(JSON.stringify(loggerError.mock.calls)).not.toContain('arn:aws:iam');
    }
  );

  it('extracts a nested data-source status and preserves non-authorization errors', async () => {
    const { handlers, router } = createRouter();
    const localCall = jest.fn();
    const dataSourceCall = jest.fn().mockRejectedValue({
      meta: {
        statusCode: 503,
      },
      message: 'Service unavailable',
    });
    const context = createContext(localCall, dataSourceCall);
    const response = createResponse();
    defineRoutes(router, true, logger);

    await handlers['GET /api/top_queries/latency'](
      context,
      {
        query: {
          dataSourceId: 'data-source-id',
          from: '',
          to: '',
          id: '',
          verbose: false,
        },
      },
      response
    );

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 503,
      body: {
        message: 'Service unavailable',
      },
    });
  });

  it.each([
    ['GET /api/live_queries', QUERY_INSIGHTS_ACCESS_DENIED_TITLE],
    ['GET /api/settings', QUERY_INSIGHTS_SETTINGS_ACCESS_DENIED_TITLE],
    ['PUT /api/update_settings', QUERY_INSIGHTS_SETTINGS_UPDATE_DENIED_TITLE],
  ])('sanitizes forbidden responses from %s', async (route, expectedMessage) => {
    const { handlers, router } = createRouter();
    const localCall = jest.fn().mockRejectedValue({
      statusCode: 403,
      message:
        '[security_exception] no permissions and User [name=arn:aws:iam::123456789012:role/example]',
    });
    const context = createContext(localCall, jest.fn());
    const response = createResponse();
    defineRoutes(router, false, logger);

    await handlers[route](context, { query: {} }, response);

    expect(response.ok).not.toHaveBeenCalled();
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 403,
      body: {
        message: expectedMessage,
      },
    });
    expect(JSON.stringify(response.customError.mock.calls)).not.toContain('arn:aws:iam');
    expect(JSON.stringify(loggerError.mock.calls)).not.toContain('arn:aws:iam');
  });

  it('sanitizes a resolved live-query security failure', async () => {
    const { handlers, router } = createRouter();
    const localCall = jest.fn().mockResolvedValue({
      ok: false,
      error:
        '[security_exception] no permissions and User [name=arn:aws:iam::123456789012:role/example]',
    });
    const context = createContext(localCall, jest.fn());
    const response = createResponse();
    defineRoutes(router, false, logger);

    await handlers['GET /api/live_queries'](context, { query: {} }, response);

    expect(response.ok).not.toHaveBeenCalled();
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 403,
      body: {
        message: QUERY_INSIGHTS_ACCESS_DENIED_TITLE,
      },
    });
    expect(JSON.stringify(response.customError.mock.calls)).not.toContain('arn:aws:iam');
    expect(JSON.stringify(loggerError.mock.calls)).not.toContain('arn:aws:iam');
  });

  it.each([
    ['GET /api/live_queries', QUERY_INSIGHTS_ACCESS_DENIED_TITLE],
    ['GET /api/settings', QUERY_INSIGHTS_SETTINGS_ACCESS_DENIED_TITLE],
    ['PUT /api/update_settings', QUERY_INSIGHTS_SETTINGS_UPDATE_DENIED_TITLE],
  ])('sanitizes resolved data-source failures from %s', async (route, expectedMessage) => {
    const { handlers, router } = createRouter();
    const dataSourceCall = jest.fn().mockResolvedValue({
      ok: false,
      response:
        'Data Source Error: [security_exception] no permissions and User [name=arn:aws:iam::123456789012:role/example]',
    });
    const context = createContext(jest.fn(), dataSourceCall);
    const response = createResponse();
    defineRoutes(router, true, logger);

    await handlers[route](
      context,
      {
        query: {
          dataSourceId: 'data-source-id',
        },
      },
      response
    );

    expect(response.ok).not.toHaveBeenCalled();
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 403,
      body: {
        message: expectedMessage,
      },
    });
    expect(JSON.stringify(response.customError.mock.calls)).not.toContain('arn:aws:iam');
    expect(JSON.stringify(loggerError.mock.calls)).not.toContain('arn:aws:iam');
  });
});

const registerSecurityHealthRoute = (dataSourceEnabled: boolean) => {
  const { handlers, router } = createRouter();
  defineRoutes(router, dataSourceEnabled, {} as Logger);
  return handlers['GET /api/_plugins/_security/health'];
};

const createSecurityHealthContext = () => {
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

describe('GET /api/_plugins/_security/health', () => {
  it('uses the local client when MDS is enabled but no data source is selected', async () => {
    const handler = registerSecurityHealthRoute(true);
    const { context, localCall, dataSourceCall, getClient } = createSecurityHealthContext();
    const response = createResponse();
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
    const { context, localCall, dataSourceCall, getClient } = createSecurityHealthContext();
    const response = createResponse();
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
      const { context, localCall } = createSecurityHealthContext();
      const response = createResponse();
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
      const { context, localCall } = createSecurityHealthContext();
      const response = createResponse();
      localCall.mockRejectedValue({ meta: { statusCode: status } });

      await handler(context, { query: {} }, response);

      expect(response.ok).toHaveBeenCalledWith({
        body: { ok: true, available: true },
      });
    }
  );

  it.each([400, 404, 503])('reports a %s response as unavailable', async (status) => {
    const handler = registerSecurityHealthRoute(false);
    const { context, localCall } = createSecurityHealthContext();
    const response = createResponse();
    localCall.mockRejectedValue({ meta: { statusCode: status } });

    await handler(context, { query: {} }, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: { ok: true, available: false },
    });
  });

  it('classifies a recognizable health body carried by an error', async () => {
    const handler = registerSecurityHealthRoute(false);
    const { context, localCall } = createSecurityHealthContext();
    const response = createResponse();
    const health = { mode: 'strict', status: 'UP' };
    localCall.mockRejectedValue({ meta: { body: health } });

    await handler(context, { query: {} }, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: { ok: true, available: true, response: health },
    });
  });

  it('keeps unexpected errors inconclusive, including generic error bodies', async () => {
    const handler = registerSecurityHealthRoute(false);
    const { context, localCall } = createSecurityHealthContext();
    const response = createResponse();
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
