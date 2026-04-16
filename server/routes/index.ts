/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { schema } from '@osd/config-schema';
import { IRouter, Logger } from '../../../../src/core/server';
import { EXPORTER_TYPE } from '../../common/constants';

export function defineRoutes(router: IRouter, dataSourceEnabled: boolean, logger: Logger) {
  router.get(
    {
      path: '/api/top_queries',
      validate: {
        query: schema.object({
          dataSourceId: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        if (!dataSourceEnabled || !request.query?.dataSourceId) {
          const client = context.queryInsights_plugin.queryInsightsClient.asScoped(request)
            .callAsCurrentUser;
          const res = await client('queryInsights.getTopNQueries');
          return response.ok({
            body: {
              ok: true,
              response: res,
            },
          });
        } else {
          const client = context.dataSource.opensearch.legacy.getClient(
            request.query?.dataSourceId
          );
          const res = await client.callAPI('queryInsights.getTopNQueries', {});
          return response.ok({
            body: {
              ok: true,
              response: res,
            },
          });
        }
      } catch (error) {
        console.error('Unable to get top queries: ', error);
        return response.ok({
          body: {
            ok: false,
            response: error.message,
          },
        });
      }
    }
  );

  router.get(
    {
      path: '/api/top_queries/latency',
      validate: {
        query: schema.object({
          from: schema.maybe(schema.string({ defaultValue: '' })),
          to: schema.maybe(schema.string({ defaultValue: '' })),
          id: schema.maybe(schema.string({ defaultValue: '' })),
          dataSourceId: schema.maybe(schema.string()),
          verbose: schema.maybe(schema.boolean({ defaultValue: false })),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { from, to, id, verbose } = request.query;
        const params = { from, to, id, verbose };
        if (!dataSourceEnabled || !request.query?.dataSourceId) {
          const client = context.queryInsights_plugin.queryInsightsClient.asScoped(request)
            .callAsCurrentUser;
          const res =
            id != null
              ? await client('queryInsights.getTopNQueriesLatencyForId', params)
              : await client('queryInsights.getTopNQueriesLatency', params);
          return response.ok({
            body: {
              ok: true,
              response: res,
            },
          });
        } else {
          const client = context.dataSource.opensearch.legacy.getClient(
            request.query?.dataSourceId
          );
          const res =
            id != null
              ? await client.callAPI('queryInsights.getTopNQueriesLatencyForId', params)
              : await client.callAPI('queryInsights.getTopNQueriesLatency', params);
          return response.ok({
            body: {
              ok: true,
              response: res,
            },
          });
        }
      } catch (error) {
        console.error('Unable to get top queries (latency): ', error);
        return response.ok({
          body: {
            ok: false,
            response: error.message,
          },
        });
      }
    }
  );

  router.get(
    {
      path: '/api/top_queries/cpu',
      validate: {
        query: schema.object({
          from: schema.maybe(schema.string({ defaultValue: '' })),
          to: schema.maybe(schema.string({ defaultValue: '' })),
          id: schema.maybe(schema.string({ defaultValue: '' })),
          dataSourceId: schema.maybe(schema.string()),
          verbose: schema.maybe(schema.boolean({ defaultValue: false })),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { from, to, id, verbose } = request.query;
        const params = { from, to, id, verbose };

        if (!dataSourceEnabled || !request.query?.dataSourceId) {
          const client = context.queryInsights_plugin.queryInsightsClient.asScoped(request)
            .callAsCurrentUser;
          const res =
            id != null
              ? await client('queryInsights.getTopNQueriesCpuForId', params)
              : await client('queryInsights.getTopNQueriesCpu', params);
          return response.ok({
            body: {
              ok: true,
              response: res,
            },
          });
        } else {
          const client = context.dataSource.opensearch.legacy.getClient(
            request.query?.dataSourceId
          );
          const res =
            id != null
              ? await client.callAPI('queryInsights.getTopNQueriesCpuForId', params)
              : await client.callAPI('queryInsights.getTopNQueriesCpu', params);
          return response.ok({
            body: {
              ok: true,
              response: res,
            },
          });
        }
      } catch (error) {
        console.error('Unable to get top queries (cpu): ', error);
        return response.ok({
          body: {
            ok: false,
            response: error.message,
          },
        });
      }
    }
  );

  router.get(
    {
      path: '/api/top_queries/memory',
      validate: {
        query: schema.object({
          from: schema.maybe(schema.string({ defaultValue: '' })),
          to: schema.maybe(schema.string({ defaultValue: '' })),
          id: schema.maybe(schema.string({ defaultValue: '' })),
          dataSourceId: schema.maybe(schema.string()),
          verbose: schema.maybe(schema.boolean({ defaultValue: false })),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { from, to, id, verbose } = request.query;
        const params = { from, to, id, verbose };
        if (!dataSourceEnabled || !request.query?.dataSourceId) {
          const client = context.queryInsights_plugin.queryInsightsClient.asScoped(request)
            .callAsCurrentUser;
          const res =
            id != null
              ? await client('queryInsights.getTopNQueriesMemoryForId', params)
              : await client('queryInsights.getTopNQueriesMemory', params);
          return response.ok({
            body: {
              ok: true,
              response: res,
            },
          });
        } else {
          const client = context.dataSource.opensearch.legacy.getClient(
            request.query?.dataSourceId
          );
          const res =
            id != null
              ? await client.callAPI('queryInsights.getTopNQueriesMemoryForId', params)
              : await client.callAPI('queryInsights.getTopNQueriesMemory', params);
          return response.ok({
            body: {
              ok: true,
              response: res,
            },
          });
        }
      } catch (error) {
        console.error('Unable to get top queries (memory): ', error);
        return response.ok({
          body: {
            ok: false,
            response: error.message,
          },
        });
      }
    }
  );

  router.get(
    {
      path: '/api/settings',
      validate: {
        query: schema.object({
          dataSourceId: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        if (!dataSourceEnabled || !request.query?.dataSourceId) {
          const client = context.queryInsights_plugin.queryInsightsClient.asScoped(request)
            .callAsCurrentUser;
          const res = await client('queryInsights.getSettings', { include_defaults: true });
          return response.ok({
            body: {
              ok: true,
              response: res,
            },
          });
        } else {
          const client = context.dataSource.opensearch.legacy.getClient(
            request.query?.dataSourceId
          );
          const res = await client.callAPI('queryInsights.getSettings', { include_defaults: true });
          return response.ok({
            body: {
              ok: true,
              response: res,
            },
          });
        }
      } catch (error) {
        console.error('Unable to get top queries: ', error);
        return response.ok({
          body: {
            ok: false,
            response: error.message,
          },
        });
      }
    }
  );

  router.put(
    {
      path: '/api/update_settings',
      validate: {
        query: schema.object({
          metric: schema.maybe(schema.string({ defaultValue: '' })),
          enabled: schema.maybe(schema.boolean({ defaultValue: false })),
          top_n_size: schema.maybe(schema.string({ defaultValue: '' })),
          window_size: schema.maybe(schema.string({ defaultValue: '' })),
          exporterType: schema.maybe(schema.string({ defaultValue: '' })),
          group_by: schema.maybe(schema.string({ defaultValue: '' })),
          dataSourceId: schema.maybe(schema.string()),
          delete_after_days: schema.maybe(schema.string({ defaultValue: '' })),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const query = request.query;
        const params = {
          body: {
            persistent: {
              [`search.insights.top_queries.${query.metric}.enabled`]: query.enabled,
              [`search.insights.top_queries.${query.metric}.top_n_size`]: query.top_n_size,
              [`search.insights.top_queries.${query.metric}.window_size`]: query.window_size,
            },
          },
        };
        if (query.group_by !== '') {
          params.body.persistent['search.insights.top_queries.grouping.group_by'] = query.group_by;
        }
        if (query.delete_after_days !== '') {
          params.body.persistent['search.insights.top_queries.exporter.delete_after_days'] =
            query.delete_after_days;
        }
        if (query.exporterType !== '') {
          params.body.persistent['search.insights.top_queries.exporter.type'] =
            query.exporterType === EXPORTER_TYPE.localIndex
              ? query.exporterType
              : EXPORTER_TYPE.none;
        }
        if (!dataSourceEnabled || !request.query?.dataSourceId) {
          const client = context.queryInsights_plugin.queryInsightsClient.asScoped(request)
            .callAsCurrentUser;
          const res = await client('queryInsights.setSettings', params);
          return response.ok({
            body: {
              ok: true,
              response: res,
            },
          });
        } else {
          const client = context.dataSource.opensearch.legacy.getClient(
            request.query?.dataSourceId
          );
          const res = await client.callAPI('queryInsights.setSettings', params);
          return response.ok({
            body: {
              ok: true,
              response: res,
            },
          });
        }
      } catch (error) {
        console.error('Unable to set settings: ', error);
        return response.ok({
          body: {
            ok: false,
            response: error.message,
          },
        });
      }
    }
  );
  router.get(
    {
      path: '/api/live_queries',
      validate: {
        query: schema.object({
          dataSourceId: schema.maybe(schema.string()),
          wlmGroupId: schema.maybe(schema.string()),
          use_finished_cache: schema.maybe(schema.boolean()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const {
          dataSourceId,
          wlmGroupId: wlmGroup,
          use_finished_cache: useFinishedCache,
        } = request.query as {
          dataSourceId?: string;
          wlmGroupId?: string;
          use_finished_cache?: boolean;
        };

        const hasGroup = typeof wlmGroup === 'string' && wlmGroup.trim().length > 0;
        const params: Record<string, any> = { verbose: true };
        if (useFinishedCache) params.use_finished_cache = true;
        if (hasGroup) params.wlmGroupId = wlmGroup;
        let res;

        if (!dataSourceEnabled || !dataSourceId) {
          const client = context.queryInsights_plugin.queryInsightsClient.asScoped(request)
            .callAsCurrentUser;
          res = hasGroup
            ? await client('queryInsights.getLiveQueriesWLMGroup', {
                wlmGroupId: wlmGroup,
                ...params,
              })
            : await client('queryInsights.getLiveQueries', params);
        } else {
          const client = context.dataSource.opensearch.legacy.getClient(dataSourceId);
          res = hasGroup
            ? await client.callAPI('queryInsights.getLiveQueriesWLMGroup', {
                wlmGroupId: wlmGroup,
                ...params,
              })
            : await client.callAPI('queryInsights.getLiveQueries', params);
        }

        if (!res || res.ok === false) {
          throw new Error(res?.error || 'Query Insights service returned an error');
        }

        return response.ok({
          body: {
            ok: true,
            response: res,
          },
        });
      } catch (error) {
        console.error('Unable to get live queries: ', error);
        return response.customError({
          statusCode: error.statusCode ?? 500,
          body: {
            message: error.message || 'Internal server error',
          },
        });
      }
    }
  );

  router.post(
    {
      path: '/api/tasks/{taskId}/cancel',
      validate: {
        params: schema.object({
          taskId: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const esClient = context.core.opensearch.client.asCurrentUser;
        const { taskId } = request.params;

        const res = await esClient.transport.request({
          method: 'POST',
          path: `/_tasks/${taskId}/_cancel`,
        });

        if (!res) {
          throw new Error('failed');
        }

        return response.ok({ body: { ok: true, res } });
      } catch (error) {
        console.error(error);
        return response.customError({
          statusCode: error.statusCode ?? 500,
          body: {
            message: error.message || 'Internal server error',
          },
        });
      }
    }
  );

  router.get(
    {
      path: '/api/cluster/version',
      validate: {},
    },
    async (context, request, response) => {
      try {
        const esClient = context.core.opensearch.client.asCurrentUser;
        const res = await esClient.info();
        const version = res.body?.version?.number;

        return response.ok({
          body: {
            ok: true,
            version,
          },
        });
      } catch (error) {
        console.error('Unable to get cluster version: ', error);
        return response.ok({
          body: {
            ok: false,
            error: error.message,
          },
        });
      }
    }
  );

  router.post(
    {
      path: '/api/profiler-proxy',
      validate: {
        body: schema.object({
          method: schema.string({ defaultValue: 'GET' }),
          path: schema.string({ defaultValue: '_search' }),
          body: schema.maybe(schema.string()),
          dataSourceId: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { method, path, body, dataSourceId } = request.body;

        const ALLOWED_METHODS = ['GET', 'POST'];
        const normalizedMethod = (method || 'GET').toUpperCase();
        if (!ALLOWED_METHODS.includes(normalizedMethod)) {
          return response.badRequest({ body: 'Invalid HTTP method' });
        }
        if (!path || path.includes('..') || !path.split('?')[0].endsWith('_search')) {
          return response.badRequest({ body: 'Only _search paths are allowed' });
        }

        let parsedBody;
        if (body) {
          try {
            parsedBody = JSON.parse(body);
          } catch (e) {
            return response.badRequest({ body: 'Invalid JSON body' });
          }
        }

        // OpenSearch supports POST for _search; use POST when body is present to avoid GET-with-body errors
        const effectiveMethod = parsedBody !== undefined ? 'POST' : normalizedMethod;
        const effectivePath = path.startsWith('/') ? path : `/${path}`;

        let result;

        if (!dataSourceEnabled || !dataSourceId) {
          const esClient = context.core.opensearch.client.asCurrentUser;
          const res = await esClient.transport.request({
            method: effectiveMethod,
            path: effectivePath,
            body: parsedBody,
          });
          result = res.body;
        } else {
          const client = context.dataSource.opensearch.legacy.getClient(dataSourceId);
          result = await client.callAPI('transport.request', {
            method: effectiveMethod,
            path: effectivePath,
            body: parsedBody ? JSON.stringify(parsedBody) : undefined,
          });
        }

        return response.ok({ body: JSON.stringify(result, null, 2) });
      } catch (error) {
        logger.error(`Profiler proxy error: ${error.message}`);
        // Extract meaningful message from OpenSearch/DataSource error
        const cause = error.body || error.meta?.body;
        const osError = cause?.error;
        const message = osError
          ? `[${osError.type}] ${osError.reason}`
          : error.message || 'An error occurred while processing the request';
        return response.customError({
          statusCode: error.statusCode || 500,
          body: { message },
        });
      }
    }
  );
}
