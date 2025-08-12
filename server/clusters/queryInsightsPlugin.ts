/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export const QueryInsightsPlugin = function (Client, config, components) {
  const ca = components.clientAction.factory;
  Client.prototype.queryInsights = components.clientAction.namespaceFactory();
  const queryInsights = Client.prototype.queryInsights.prototype;

  queryInsights.getTopNQueries = ca({
    url: {
      fmt: `/_insights/top_queries`,
    },
    method: 'GET',
  });

  queryInsights.getTopNQueriesLatency = ca({
    url: {
      fmt: `/_insights/top_queries?type=latency&from=<%=from%>&to=<%=to%>&verbose=<%=verbose%>`,
      req: {
        from: {
          type: 'string',
          required: true,
        },
        to: {
          type: 'string',
          required: true,
        },
        verbose: {
          type: 'boolean',
          required: true,
        },
      },
    },
    method: 'GET',
  });

  queryInsights.getTopNQueriesCpu = ca({
    url: {
      fmt: `/_insights/top_queries?type=cpu&from=<%=from%>&to=<%=to%>&verbose=<%=verbose%>`,
      req: {
        from: {
          type: 'string',
          required: true,
        },
        to: {
          type: 'string',
          required: true,
        },
        verbose: {
          type: 'boolean',
          required: true,
        },
      },
    },
    method: 'GET',
  });

  queryInsights.getTopNQueriesMemory = ca({
    url: {
      fmt: `/_insights/top_queries?type=memory&from=<%=from%>&to=<%=to%>&verbose=<%=verbose%>`,
      req: {
        from: {
          type: 'string',
          required: true,
        },
        to: {
          type: 'string',
          required: true,
        },
        verbose: {
          type: 'boolean',
          required: true,
        },
      },
    },
    method: 'GET',
  });

  queryInsights.getTopNQueriesLatencyForId = ca({
    url: {
      fmt: `/_insights/top_queries?type=latency&from=<%=from%>&to=<%=to%><% if (id) { %>&id=<%=id%><% } %>&verbose=<%=verbose%>`,
      req: {
        from: {
          type: 'string',
          required: true,
        },
        to: {
          type: 'string',
          required: true,
        },
        id: {
          type: 'string',
          required: true,
        },
        verbose: {
          type: 'boolean',
          required: true,
        },
      },
    },
    method: 'GET',
  });

  queryInsights.getTopNQueriesCpuForId = ca({
    url: {
      fmt: `/_insights/top_queries?type=cpu&from=<%=from%>&to=<%=to%><% if (id) { %>&id=<%=id%><% } %>&verbose=<%=verbose%>`,
      req: {
        from: {
          type: 'string',
          required: true,
        },
        to: {
          type: 'string',
          required: true,
        },
        id: {
          type: 'string',
          required: true,
        },
        verbose: {
          type: 'boolean',
          required: true,
        },
      },
    },
    method: 'GET',
  });

  queryInsights.getTopNQueriesMemoryForId = ca({
    url: {
      fmt: `/_insights/top_queries?type=memory&from=<%=from%>&to=<%=to%><% if (id) { %>&id=<%=id%><% } %>&verbose=<%=verbose%>`,
      req: {
        from: {
          type: 'string',
          required: true,
        },
        to: {
          type: 'string',
          required: true,
        },
        id: {
          type: 'string',
          required: true,
        },
        verbose: {
          type: 'boolean',
          required: true,
        },
      },
    },
    method: 'GET',
  });

  queryInsights.getSettings = ca({
    url: {
      fmt: `_cluster/settings?include_defaults=true`,
    },
    method: 'GET',
  });

  queryInsights.setSettings = ca({
    url: {
      fmt: `_cluster/settings`,
    },
    method: 'PUT',
    needBody: true,
  });
};
