/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { schema } from '@osd/config-schema';
import { IRouter } from '../../../../src/core/server';
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
        // data source disabled
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
        }),
      },
    },
    async (context, request, response) => {
      try {
        console.log("request is!!");
        console.log(request);
        const { from, to, id } = request.query;
        const params = { from, to, id };
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
        }
        else {
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
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { from, to, id } = request.query;
        const params = { from, to, id };
        if (!dataSourceEnabled || !request.query?.dataSourceId) {
          console.log(request.query.dataSourceId)
          console.log(params);
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
        }
        else {
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
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { from, to, id } = request.query;
        const params = { from, to, id };
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
        }
        else {
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
        }
        else {
          console.log(request);
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

  router.put(
    {
      path: '/api/update_settings',
      validate: {
        query: schema.object({
          metric: schema.maybe(schema.string({ defaultValue: '' })),
          enabled: schema.maybe(schema.boolean({ defaultValue: false })),
          top_n_size: schema.maybe(schema.string({ defaultValue: '' })),
          window_size: schema.maybe(schema.string({ defaultValue: '' })),
          group_by: schema.maybe(schema.string({ defaultValue: '' })),
          dataSourceId: schema.maybe(schema.string()),
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
              [`search.insights.top_queries.group_by`]: query.group_by,
            },
          },
        };
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
        }
       else {
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
}
