/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { schema } from '@osd/config-schema';
import { IRouter } from '../../../../src/core/server';

export function defineWlmRoutes(router: IRouter, dataSourceEnabled: boolean) {
  // Get WLM stats across all nodes in the cluster
  router.get(
    {
      path: '/api/_wlm/stats',
      validate: {
        query: schema.object({
          dataSourceId: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        let stats;
        if (!dataSourceEnabled || !request.query?.dataSourceId) {
          const client = context.wlm_plugin.wlmClient.asScoped(request).callAsCurrentUser;
          stats = await client('wlm.getStats');
        } else {
          const client = context.dataSource.opensearch.legacy.getClient(request.query.dataSourceId);
          stats = await client.callAPI('wlm.getStats', {});
        }
        return response.ok({ body: stats });
      } catch (error: any) {
        context.queryInsights.logger.error(`Failed to fetch WLM stats: ${error.message}`, {
          error,
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

  // Get WLM stats for a specific node
  router.get(
    {
      path: '/api/_wlm/{nodeId}/stats',
      validate: {
        params: schema.object({
          nodeId: schema.string(),
        }),
        query: schema.object({
          dataSourceId: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { nodeId } = request.params;
        let stats;
        if (!dataSourceEnabled || !request.query?.dataSourceId) {
          const client = context.wlm_plugin.wlmClient.asScoped(request).callAsCurrentUser;
          stats = await client('wlm.getNodeStats', { nodeId });
        } else {
          const client = context.dataSource.opensearch.legacy.getClient(request.query.dataSourceId);
          stats = await client.callAPI('wlm.getNodeStats', { nodeId });
        }
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

  // List all workload groups
  router.get(
    {
      path: '/api/_wlm/workload_group',
      validate: {
        query: schema.object({
          dataSourceId: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        let result;
        if (!dataSourceEnabled || !request.query?.dataSourceId) {
          const client = context.wlm_plugin.wlmClient.asScoped(request).callAsCurrentUser;
          result = await client('wlm.getWorkloadGroups');
        } else {
          const client = context.dataSource.opensearch.legacy.getClient(request.query.dataSourceId);
          result = await client.callAPI('wlm.getWorkloadGroups', {});
        }
        return response.ok({ body: result });
      } catch (error: any) {
        return response.customError({
          statusCode: error.statusCode || 500,
          body: { message: `Failed to fetch workload groups: ${error.message}` },
        });
      }
    }
  );

  // Get workload group by name
  router.get(
    {
      path: '/api/_wlm/workload_group/{name}',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
        query: schema.object({
          dataSourceId: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      const { name } = request.params;
      try {
        let result;
        if (!dataSourceEnabled || !request.query?.dataSourceId) {
          const client = context.wlm_plugin.wlmClient.asScoped(request).callAsCurrentUser;
          result = await client('wlm.getWorkloadGroup', { name });
        } else {
          const client = context.dataSource.opensearch.legacy.getClient(request.query.dataSourceId);
          result = await client.callAPI('wlm.getWorkloadGroup', { name });
        }
        return response.ok({ body: result });
      } catch (error: any) {
        return response.custom({
          statusCode: error.statusCode || 500,
          body: { message: `Error fetching workload group: ${error.message}` },
        });
      }
    }
  );

  // Create a new workload group
  router.put(
    {
      path: '/api/_wlm/workload_group',
      validate: {
        body: schema.object({
          name: schema.string(),
          resiliency_mode: schema.string(),
          resource_limits: schema.object({
            cpu: schema.maybe(schema.number()),
            memory: schema.maybe(schema.number()),
          }),
        }),
        query: schema.object({
          dataSourceId: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const body = request.body;
        let result;
        if (!dataSourceEnabled || !request.query?.dataSourceId) {
          const client = context.wlm_plugin.wlmClient.asScoped(request).callAsCurrentUser;
          result = await client('wlm.createWorkloadGroup', { body });
        } else {
          const client = context.dataSource.opensearch.legacy.getClient(request.query.dataSourceId);
          result = await client.callAPI('wlm.createWorkloadGroup', { body });
        }
        return response.ok({ body: result });
      } catch (e: any) {
        console.error('Failed to create workload group:', e);
        return response.internalError({
          body: { message: `Failed to create workload group: ${e.message}` },
        });
      }
    }
  );

  // Update a workload group by name
  router.put(
    {
      path: '/api/_wlm/workload_group/{name}',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
        body: schema.object({
          resiliency_mode: schema.string(),
          resource_limits: schema.object({
            cpu: schema.maybe(schema.number()),
            memory: schema.maybe(schema.number()),
          }),
        }),
        query: schema.object({
          dataSourceId: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { name } = request.params;
        const body = request.body;
        let result;
        if (!dataSourceEnabled || !request.query?.dataSourceId) {
          const client = context.wlm_plugin.wlmClient.asScoped(request).callAsCurrentUser;
          result = await client('wlm.updateWorkloadGroup', { name, body });
        } else {
          const client = context.dataSource.opensearch.legacy.getClient(request.query.dataSourceId);
          result = await client.callAPI('wlm.updateWorkloadGroup', { name, body });
        }
        return response.ok({ body: result });
      } catch (e: any) {
        console.error('Failed to update workload group:', e);
        return response.internalError({
          body: { message: `Failed to update workload group: ${e.message}` },
        });
      }
    }
  );

  // Delete a workload group by name
  router.delete(
    {
      path: '/api/_wlm/workload_group/{name}',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
        query: schema.object({
          dataSourceId: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { name } = request.params;
        let result;
        if (!dataSourceEnabled || !request.query?.dataSourceId) {
          const client = context.wlm_plugin.wlmClient.asScoped(request).callAsCurrentUser;
          result = await client('wlm.deleteWorkloadGroup', { name });
        } else {
          const client = context.dataSource.opensearch.legacy.getClient(request.query.dataSourceId);
          result = await client.callAPI('wlm.deleteWorkloadGroup', { name });
        }
        return response.ok({ body: result });
      } catch (e: any) {
        console.error(`Failed to delete workload group '${request.params.name}':`, e);
        return response.internalError({
          body: {
            message: `Failed to delete workload group '${request.params.name}': ${e.message}`,
          },
        });
      }
    }
  );

  // Get stats for a specific workload group
  router.get(
    {
      path: '/api/_wlm/stats/{workloadGroupId}',
      validate: {
        params: schema.object({
          workloadGroupId: schema.string(),
        }),
        query: schema.object({
          dataSourceId: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { workloadGroupId } = request.params;
        let result;
        if (!dataSourceEnabled || !request.query?.dataSourceId) {
          const client = context.wlm_plugin.wlmClient.asScoped(request).callAsCurrentUser;
          result = await client('wlm.getWorkloadGroupStats', { workloadGroupId });
        } else {
          const client = context.dataSource.opensearch.legacy.getClient(request.query.dataSourceId);
          result = await client.callAPI('wlm.getWorkloadGroupStats', { workloadGroupId });
        }
        return response.ok({ body: result });
      } catch (error: any) {
        console.error(
          `Failed to fetch WLM stats for group ${request.params.workloadGroupId}:`,
          error
        );
        return response.custom({
          statusCode: error.statusCode || 500,
          body: {
            message: `Failed to fetch WLM stats for group ${request.params.workloadGroupId}: ${error.message}`,
          },
        });
      }
    }
  );

  // Create index rule
  router.put(
    {
      path: '/api/_rules/workload_group',
      validate: {
        body: schema.object({
          description: schema.string(),
          principal: schema.maybe(
            schema.object({
              username: schema.maybe(schema.arrayOf(schema.string())),
              role: schema.maybe(schema.arrayOf(schema.string())),
            })
          ),
          index_pattern: schema.maybe(schema.arrayOf(schema.string())),
          workload_group: schema.string(),
        }),
        query: schema.object({
          dataSourceId: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const body = {
          description: request.body.description,
          index_pattern: request.body.index_pattern,
          workload_group: request.body.workload_group,
          principal: request.body.principal,
        };
        let result;
        if (!dataSourceEnabled || !request.query?.dataSourceId) {
          const client = context.wlm_plugin.wlmClient.asScoped(request).callAsCurrentUser;
          result = await client('wlm.createRule', { body });
        } else {
          const client = context.dataSource.opensearch.legacy.getClient(request.query.dataSourceId);
          result = await client.callAPI('wlm.createRule', { body });
        }
        return response.ok({ body: result });
      } catch (error: any) {
        console.error(`Failed to create rule:`, error);
        return response.custom({
          statusCode: error.statusCode || 500,
          body: { message: `Failed to create rule: ${error.message}` },
        });
      }
    }
  );

  // Get all index rules
  router.get(
    {
      path: '/api/_rules/workload_group',
      validate: {
        query: schema.object({
          dataSourceId: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        let result;
        if (!dataSourceEnabled || !request.query?.dataSourceId) {
          const client = context.wlm_plugin.wlmClient.asScoped(request).callAsCurrentUser;
          result = await client('wlm.getRules');
        } else {
          const client = context.dataSource.opensearch.legacy.getClient(request.query.dataSourceId);
          result = await client.callAPI('wlm.getRules', {});
        }
        return response.ok({ body: result });
      } catch (e: any) {
        console.error('Failed to fetch rules:', e);
        return response.internalError({
          body: { message: `Failed to fetch rules: ${e.message}` },
        });
      }
    }
  );

  // Delete index rule by ID
  router.delete(
    {
      path: '/api/_rules/workload_group/{ruleId}',
      validate: {
        params: schema.object({
          ruleId: schema.string(),
        }),
        query: schema.object({
          dataSourceId: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      const { ruleId } = request.params;
      try {
        let result;
        if (!dataSourceEnabled || !request.query?.dataSourceId) {
          const client = context.wlm_plugin.wlmClient.asScoped(request).callAsCurrentUser;
          result = await client('wlm.deleteRule', { ruleId });
        } else {
          const client = context.dataSource.opensearch.legacy.getClient(request.query.dataSourceId);
          result = await client.callAPI('wlm.deleteRule', { ruleId });
        }
        return response.ok({ body: result });
      } catch (e: any) {
        console.error(`Failed to delete index rule ${ruleId}:`, e);
        return response.internalError({
          body: { message: `Failed to delete index rule ${ruleId}: ${e.message}` },
        });
      }
    }
  );

  // Update index rule
  router.put(
    {
      path: '/api/_rules/workload_group/{ruleId}',
      validate: {
        params: schema.object({
          ruleId: schema.string(),
        }),
        body: schema.object({
          description: schema.string(),
          principal: schema.maybe(
            schema.object({
              username: schema.maybe(schema.arrayOf(schema.string())),
              role: schema.maybe(schema.arrayOf(schema.string())),
            })
          ),
          index_pattern: schema.maybe(schema.arrayOf(schema.string())),
          workload_group: schema.string(),
        }),
        query: schema.object({
          dataSourceId: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      const { ruleId } = request.params;
      const body = request.body;
      const { principal, indexPattern } = body as any;

      const hasAny =
        (indexPattern?.length ?? 0) > 0 ||
        (principal?.username?.length ?? 0) > 0 ||
        (principal?.role?.length ?? 0) > 0;

      if (!hasAny) {
        return response.custom({
          statusCode: 400,
          body: {
            message:
              'Empty rule found. Add at least one of index_pattern, principal.username, or principal.role; otherwise remove this rule.',
          },
        });
      }

      try {
        let result;
        if (!dataSourceEnabled || !request.query?.dataSourceId) {
          const client = context.wlm_plugin.wlmClient.asScoped(request).callAsCurrentUser;
          result = await client('wlm.updateRule', { ruleId, body });
        } else {
          const client = context.dataSource.opensearch.legacy.getClient(request.query.dataSourceId);
          result = await client.callAPI('wlm.updateRule', { ruleId, body });
        }
        return response.ok({ body: result });
      } catch (error) {
        console.error('Error updating rule:', error);
        return response.customError({
          body: error.message || error,
          statusCode: error.statusCode || 500,
        });
      }
    }
  );

  // Get node level cpu and memory threshold
  router.get(
    {
      path: '/api/_wlm/thresholds',
      validate: {
        query: schema.object({
          dataSourceId: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        let body;
        if (!dataSourceEnabled || !request.query?.dataSourceId) {
          const client = context.wlm_plugin.wlmClient.asScoped(request).callAsCurrentUser;
          body = await client('wlm.getThresholds', { include_defaults: true });
        } else {
          const client = context.dataSource.opensearch.legacy.getClient(request.query.dataSourceId);
          body = await client.callAPI('wlm.getThresholds', { include_defaults: true });
        }

        const cpuThreshold =
          body.transient?.wlm?.workload_group?.node?.cpu_rejection_threshold ??
          body.persistent?.wlm?.workload_group?.node?.cpu_rejection_threshold ??
          body.defaults?.wlm?.workload_group?.node?.cpu_rejection_threshold ??
          '1';

        const memoryThreshold =
          body.transient?.wlm?.workload_group?.node?.memory_rejection_threshold ??
          body.persistent?.wlm?.workload_group?.node?.memory_rejection_threshold ??
          body.defaults?.wlm?.workload_group?.node?.memory_rejection_threshold ??
          '1';

        return response.ok({
          body: {
            cpuRejectionThreshold: parseFloat(cpuThreshold),
            memoryRejectionThreshold: parseFloat(memoryThreshold),
          },
        });
      } catch (e: any) {
        const status = e?.meta?.statusCode ?? e?.statusCode ?? e?.status ?? 500;
        const message =
          e?.meta?.body?.error?.reason ??
          e?.meta?.body?.message ??
          e?.body?.message ??
          e?.message ??
          'Unexpected error';
        return response.customError({ statusCode: status, body: { message } });
      }
    }
  );
}
