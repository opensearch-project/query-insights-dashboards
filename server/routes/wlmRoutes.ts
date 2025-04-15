/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { schema } from '@osd/config-schema';
import { IRouter } from '../../../../src/core/server';

export function defineWlmRoutes(router: IRouter) {
  router.get(
    {
      path: '/api/_wlm/stats',
      validate: false,
    },
    async (context, request, response) => {
      try {
        const client = context.core.opensearch.client.asCurrentUser;
        const stats = await client.transport.request({
          method: 'GET',
          path: '/_wlm/stats',
        });
        return response.ok({ body: stats });
      } catch (error: any) {
        context.queryInsights.logger.error(`Failed to fetch WLM stats: ${error.message}`, {
          error: error,
        });
        return response.custom({
          statusCode: error.statusCode || 500,
          body: {
            message: `Failed to fetch WLM stats: ${error.message}`,
          },
        });
      }
    }
  );

  router.get(
    {
      path: '/api/_wlm/{nodeId}/stats',
      validate: {
        params: schema.object({
          nodeId: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const client = context.core.opensearch.client.asCurrentUser;
        const { nodeId } = request.params;
        const stats = await client.transport.request({
          method: 'GET',
          path: `/_wlm/${nodeId}/stats`,
        });
        return response.ok({ body: stats });
      } catch (error: any) {
        console.error(`Failed to fetch stats for node ${request.params.nodeId}:`, error);
        return response.custom({
          statusCode: error.statusCode || 500,
          body: {
            message: `Failed to fetch stats for node ${request.params.nodeId}: ${error.message}`,
          },
        });
      }
    }
  );

  // dashboards server-side route
  router.get(
    {
      path: '/api/_wlm/query_group',
      validate: false,
    },
    async (context, request, response) => {
      try {
        const client = context.core.opensearch.client.asCurrentUser;
        const result = await client.transport.request({
          method: 'GET',
          path: '/_wlm/query_group',
        });
        return response.ok({ body: result });
      } catch (error: any) {
        return response.customError({
          statusCode: error.statusCode || 500,
          body: { message: `Failed to fetch query groups: ${error.message}` },
        });
      }
    }
  );

  router.get(
    {
      path: '/api/_wlm/query_group/{name}',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { name } = request.params;
      try {
        const client = context.core.opensearch.client.asCurrentUser;
        const result = await client.transport.request({
          method: 'GET',
          path: `/_wlm/query_group/${name}`,
        });
        return response.ok({ body: result });
      } catch (error: any) {
        return response.custom({
          statusCode: error.statusCode || 500,
          body: { message: `Error fetching query group: ${error.message}` },
        });
      }
    }
  );

  router.put(
    {
      path: '/api/_wlm/query_group',
      validate: {
        body: schema.object({
          name: schema.string(),
          resiliency_mode: schema.string(),
          resource_limits: schema.object({
            cpu: schema.number(),
            memory: schema.number(),
          }),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const client = context.core.opensearch.client.asCurrentUser;
        const body = request.body;

        const result = await client.transport.request({
          method: 'PUT',
          path: '/_wlm/query_group',
          body,
        });

        return response.ok({ body: result });
      } catch (e: any) {
        console.error('Failed to create query group:', e);
        return response.internalError({
          body: { message: `Failed to create query group: ${e.message}` },
        });
      }
    }
  );

  router.put(
    {
      path: '/api/_wlm/query_group/{name}',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
        body: schema.object({
          resiliency_mode: schema.string(),
          resource_limits: schema.object({
            cpu: schema.number(),
            memory: schema.number(),
          }),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const client = context.core.opensearch.client.asCurrentUser;
        const { name } = request.params;
        const body = request.body;

        const result = await client.transport.request({
          method: 'PUT',
          path: `/_wlm/query_group/${name}`,
          body,
        });

        return response.ok({ body: result });
      } catch (e: any) {
        console.error('Failed to update query group:', e);
        return response.internalError({
          body: { message: `Failed to update query group: ${e.message}` },
        });
      }
    }
  );

  router.delete(
    {
      path: '/api/_wlm/query_group/{name}',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const client = context.core.opensearch.client.asCurrentUser;
        const { name } = request.params;

        const result = await client.transport.request({
          method: 'DELETE',
          path: `/_wlm/query_group/${name}`,
        });

        return response.ok({ body: result });
      } catch (e: any) {
        console.error(`Failed to delete query group '${request.params.name}':`, e);
        return response.internalError({
          body: {
            message: `Failed to delete query group '${request.params.name}': ${e.message}`,
          },
        });
      }
    }
  );

  router.get(
    {
      path: '/api/_wlm/stats/{queryGroupId}',
      validate: {
        params: schema.object({
          queryGroupId: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const client = context.core.opensearch.client.asCurrentUser;
        const { queryGroupId } = request.params;

        const result = await client.transport.request({
          method: 'GET',
          path: `/_wlm/stats/${queryGroupId}`,
        });

        return response.ok({ body: result });
      } catch (error: any) {
        console.error(`Failed to fetch WLM stats for group ${request.params.queryGroupId}:`, error);
        return response.custom({
          statusCode: error.statusCode || 500,
          body: {
            message: `Failed to fetch WLM stats for group ${request.params.queryGroupId}: ${error.message}`,
          },
        });
      }
    }
  );

  router.get(
    {
      path: '/api/_wlm_proxy/_nodes',
      validate: false,
    },
    async (context, request, response) => {
      const esClient = context.core.opensearch.client.asCurrentUser;
      try {
        const result = await esClient.nodes.info();
        return response.ok({ body: result });
      } catch (e) {
        return response.customError({
          statusCode: e.statusCode || 500,
          body: e.message,
        });
      }
    }
  );
}
