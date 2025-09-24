/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { schema } from '@osd/config-schema';
import { IRouter } from '../../../../src/core/server';
import { EXPORTER_TYPE } from '../../common/constants';

export function defineRoutes(router: IRouter, dataSourceEnabled: boolean) {
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
          return response.custom({
            statusCode: 200,
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
          return response.custom({
            statusCode: 200,
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
          return response.custom({
            statusCode: 200,
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
          return response.custom({
            statusCode: 200,
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
          return response.custom({
            statusCode: 200,
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
          return response.custom({
            statusCode: 200,
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
          return response.custom({
            statusCode: 200,
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
          return response.custom({
            statusCode: 200,
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
          const res = await client('queryInsights.getSettings');
          return response.custom({
            statusCode: 200,
            body: {
              ok: true,
              response: res,
            },
          });
        } else {
          const client = context.dataSource.opensearch.legacy.getClient(
            request.query?.dataSourceId
          );
          const res = await client.callAPI('queryInsights.getSettings', {});
          return response.custom({
            statusCode: 200,
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
      path: '/api/cat_plugins',
      validate: {
        query: schema.object({
          dataSourceId: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { dataSourceId } = request.query;

        // Always use _cat (JSON) as requested
        const catPath = '/_cat/plugins?format=json';

        let resp: any;
        if (dataSourceEnabled && dataSourceId) {
          // Data source-aware client (proxies to the selected cluster)
          const dsClient = context.dataSource.opensearch.legacy.getClient(dataSourceId);
          resp = await dsClient.callAPI('transport.request', {
            method: 'GET',
            path: catPath,
          });
        } else {
          // Fallback: core client as current user
          const es = context.core.opensearch.client.asCurrentUser;
          resp = await es.transport.request({
            method: 'GET',
            path: catPath,
          });
        }

        const body = resp?.body ?? resp; // legacy/new client normalization
        const rows: Array<Record<string, any>> = Array.isArray(body) ? body : [];

        // Check for query insights and WLM plugins
        const hasQueryInsights = rows.some((p) => {
          const s = `${p?.component ?? ''} ${p?.name ?? ''}`.toLowerCase();
          return s.includes('query-insights') || s.includes('queryinsights');
        });

        const hasWlm = rows.some((p) => {
          const s = `${p?.component ?? ''} ${p?.name ?? ''}`.toLowerCase();
          return s.includes('workload') || s.includes('wlm');
        });

        return response.ok({ body: { ok: true, hasQueryInsights, hasWlm } });
      } catch (err: any) {
        return response.ok({
          body: {
            ok: false,
            hasQueryInsights: false,
            hasWlm: false,
            error: err?.message ?? 'cat plugins failed',
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
          return response.custom({
            statusCode: 200,
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
          return response.custom({
            statusCode: 200,
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
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { dataSourceId, wlmGroupId: wlmGroup } = request.query as {
          dataSourceId?: string;
          wlmGroupId?: string;
        };

        const client =
          !dataSourceEnabled || !dataSourceId
            ? context.queryInsights_plugin.queryInsightsClient.asScoped(request).callAsCurrentUser
            : context.dataSource.opensearch.legacy.getClient(dataSourceId);

        // Call the appropriate API based on whether wlm_group is provided
        const hasGroup = typeof wlmGroup === 'string' && wlmGroup.trim().length > 0;
        const res = hasGroup
          ? await client('queryInsights.getLiveQueriesWLMGroup', { wlmGroupId: wlmGroup })
          : await client('queryInsights.getLiveQueries');

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
}
