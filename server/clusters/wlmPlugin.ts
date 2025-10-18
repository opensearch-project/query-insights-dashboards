/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export const WlmPlugin = function (Client: any, config: any, components: any) {
  const ca = components.clientAction.factory;
  Client.prototype.wlm = components.clientAction.namespaceFactory();
  const wlm = Client.prototype.wlm.prototype;

  // Get WLM stats across all nodes
  wlm.getStats = ca({
    url: { fmt: '/_wlm/stats' },
    method: 'GET',
  });

  // Get WLM stats for a specific node
  wlm.getNodeStats = ca({
    url: {
      fmt: '/_wlm/<%=nodeId%>/stats',
      req: {
        nodeId: { type: 'string', required: true },
      },
    },
    method: 'GET',
  });

  // List all workload groups
  wlm.getWorkloadGroups = ca({
    url: { fmt: '/_wlm/workload_group' },
    method: 'GET',
  });

  // Get workload group by name
  wlm.getWorkloadGroup = ca({
    url: {
      fmt: '/_wlm/workload_group/<%=name%>',
      req: {
        name: { type: 'string', required: true },
      },
    },
    method: 'GET',
  });

  // Create workload group
  wlm.createWorkloadGroup = ca({
    url: { fmt: '/_wlm/workload_group' },
    method: 'PUT',
    needBody: true,
  });

  // Update workload group
  wlm.updateWorkloadGroup = ca({
    url: {
      fmt: '/_wlm/workload_group/<%=name%>',
      req: {
        name: { type: 'string', required: true },
      },
    },
    method: 'PUT',
    needBody: true,
  });

  // Delete workload group
  wlm.deleteWorkloadGroup = ca({
    url: {
      fmt: '/_wlm/workload_group/<%=name%>',
      req: {
        name: { type: 'string', required: true },
      },
    },
    method: 'DELETE',
  });

  // Get stats for specific workload group
  wlm.getWorkloadGroupStats = ca({
    url: {
      fmt: '/_wlm/stats/<%=workloadGroupId%>',
      req: {
        workloadGroupId: { type: 'string', required: true },
      },
    },
    method: 'GET',
  });

  // Create index rule
  wlm.createRule = ca({
    url: { fmt: '/_rules/workload_group' },
    method: 'PUT',
    needBody: true,
  });

  // Get all index rules
  wlm.getRules = ca({
    url: { fmt: '/_rules/workload_group' },
    method: 'GET',
  });

  // Delete index rule
  wlm.deleteRule = ca({
    url: {
      fmt: '/_rules/workload_group/<%=ruleId%>',
      req: {
        ruleId: { type: 'string', required: true },
      },
    },
    method: 'DELETE',
  });

  // Update index rule
  wlm.updateRule = ca({
    url: {
      fmt: '/_rules/workload_group/<%=ruleId%>',
      req: {
        ruleId: { type: 'string', required: true },
      },
    },
    method: 'PUT',
    needBody: true,
  });

  // Get node level cpu and memory threshold
  wlm.getThresholds = ca({
    url: { fmt: '/_cluster/settings' },
    method: 'GET',
    needBody: false,
    qs: ['include_defaults'],
  });
};
