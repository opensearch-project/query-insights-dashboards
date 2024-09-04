import { schema } from '@osd/config-schema';
import { IRouter } from '../../../../src/core/server';
export function defineRoutes(router: IRouter) {
  router.get(
    {
      path: '/api/top_queries',
      validate: false,
    },
    async (context, request, response) => {
      try {
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
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { from, to } = request.query;
        const params = { from, to };
        const client = context.queryInsights_plugin.queryInsightsClient.asScoped(request)
          .callAsCurrentUser;
        const res = await client('queryInsights.getTopNQueriesLatency', params);
        return response.custom({
          statusCode: 200,
          body: {
            ok: true,
            response: res,
          },
        });
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
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { from, to } = request.query;
        const params = { from, to };
        const client = context.queryInsights_plugin.queryInsightsClient.asScoped(request)
          .callAsCurrentUser;
        const res = await client('queryInsights.getTopNQueriesCpu', params);
        return response.custom({
          statusCode: 200,
          body: {
            ok: true,
            response: res,
          },
        });
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
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { from, to } = request.query;
        const params = { from, to };
        const client = context.queryInsights_plugin.queryInsightsClient.asScoped(request)
          .callAsCurrentUser;
        const res = await client('queryInsights.getTopNQueriesMemory', params);
        return response.custom({
          statusCode: 200,
          body: {
            ok: true,
            response: res,
          },
        });
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
      validate: false,
    },
    async (context, request, response) => {
      try {
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
        }),
      },
    },
    async (context, request, response) => {
      try {
        const query = request.query;
        const client = context.queryInsights_plugin.queryInsightsClient.asScoped(request)
          .callAsCurrentUser;
        const params = {
          body: {
            persistent: {
              [`search.insights.top_queries.${query.metric}.enabled`]: query.enabled,
              [`search.insights.top_queries.${query.metric}.top_n_size`]: query.top_n_size,
              [`search.insights.top_queries.${query.metric}.window_size`]: query.window_size,
            },
          },
        };
        const res = await client('queryInsights.setSettings', params);
        return response.custom({
          statusCode: 200,
          body: {
            ok: true,
            response: res,
          },
        });
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
