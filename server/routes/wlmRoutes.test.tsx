/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { defineWlmRoutes } from './wlmRoutes';
import '@testing-library/jest-dom';

type Handler = (ctx: any, req: any, res: any) => Promise<any> | any;

const expectNoMeta = (body: any) => {
  expect(body).toBeDefined();
  expect(body).not.toHaveProperty('meta');
  expect(JSON.stringify(body)).not.toContain('"meta"');
};

describe.each<[boolean]>([[true], [false]])(
  'defineWlmRoutes (dataSourceEnabled=%s)',
  (dataSourceEnabled) => {
    let REG: Record<string, Handler>;
    let router: any;

    const makeRouter = () => {
      const reg: Record<string, Handler> = {};
      const r = {
        get: jest.fn((cfg: any, h: Handler) => {
          reg[`GET ${cfg.path}`] = h;
        }),
        put: jest.fn((cfg: any, h: Handler) => {
          reg[`PUT ${cfg.path}`] = h;
        }),
        delete: jest.fn((cfg: any, h: Handler) => {
          reg[`DELETE ${cfg.path}`] = h;
        }),
      } as any;
      return { reg, r };
    };

    const makeCtx = () => {
      const mockWlmCall = jest.fn();
      const mockDsCallAPI = jest.fn();
      const mockDsGetSettings = jest.fn();
      const mockCoreGetSettings = jest.fn();

      const ctx = {
        wlm_plugin: {
          wlmClient: {
            asScoped: jest.fn(() => ({ callAsCurrentUser: mockWlmCall })),
          },
        },
        dataSource: {
          opensearch: {
            legacy: {
              getClient: jest.fn(() => ({
                callAPI: mockDsCallAPI,
                cluster: { getSettings: mockDsGetSettings },
              })),
            },
          },
        },
        queryInsights: { logger: { error: jest.fn() } },
      };

      return { ctx, mockWlmCall, mockDsCallAPI, mockDsGetSettings, mockCoreGetSettings };
    };

    const makeRes = () => ({
      ok: jest.fn(),
      custom: jest.fn(),
      customError: jest.fn(),
      internalError: jest.fn(),
    });

    beforeEach(() => {
      jest.resetAllMocks();
      const { reg, r } = makeRouter();
      REG = reg;
      router = r;
      defineWlmRoutes(router, dataSourceEnabled);
    });

    //
    // 1) GET /api/_wlm/stats
    //
    test('GET /api/_wlm/stats (with dataSourceId)', async () => {
      const handler = REG['GET /api/_wlm/stats'];
      const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
      const res = makeRes();

      mockDsCallAPI.mockResolvedValue({ nodes: { n2: {} } });
      mockWlmCall.mockResolvedValue({ nodes: { n1: {} } });

      await handler(ctx, { query: { dataSourceId: 'ds-1' } }, res);

      const expectedDsCalls = dataSourceEnabled ? [['wlm.getStats', {}]] : [];
      const expectedCoreCalls = dataSourceEnabled ? [] : [['wlm.getStats']];

      expect(ctx.dataSource.opensearch.legacy.getClient.mock.calls).toEqual(
        dataSourceEnabled ? [['ds-1']] : []
      );
      expect(mockDsCallAPI.mock.calls).toEqual(expectedDsCalls);
      expect(mockWlmCall.mock.calls).toEqual(expectedCoreCalls);

      const expectedPayload = dataSourceEnabled ? { nodes: { n2: {} } } : { nodes: { n1: {} } };
      const body = res.ok.mock.calls[0][0].body;
      expect(body).toEqual(expectedPayload);
      expectNoMeta(body);
    });

    test('GET /api/_wlm/stats (no dataSourceId)', async () => {
      const handler = REG['GET /api/_wlm/stats'];
      const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
      const res = makeRes();

      mockWlmCall.mockResolvedValue({ nodes: { n1: {} } });

      await handler(ctx, { query: {} }, res);

      expect(ctx.dataSource.opensearch.legacy.getClient.mock.calls).toEqual([]);
      expect(mockDsCallAPI.mock.calls).toEqual([]);
      expect(mockWlmCall.mock.calls).toEqual([['wlm.getStats']]);

      const body = res.ok.mock.calls[0][0].body;
      expect(body).toEqual({ nodes: { n1: {} } });
      expectNoMeta(body);
    });

    //
    // 2) GET /api/_wlm/{nodeId}/stats
    //
    test('GET /api/_wlm/{nodeId}/stats (with dataSourceId)', async () => {
      const handler = REG['GET /api/_wlm/{nodeId}/stats'];
      const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
      const res = makeRes();
      const params = { nodeId: 'node-1' };

      mockDsCallAPI.mockResolvedValue({ node: 'node-1', stats: {} });
      mockWlmCall.mockResolvedValue({ node: 'node-1', stats: {} });

      await handler(ctx, { params, query: { dataSourceId: 'ds-x' } }, res);

      expect(ctx.dataSource.opensearch.legacy.getClient.mock.calls).toEqual(
        dataSourceEnabled ? [['ds-x']] : []
      );
      expect(mockDsCallAPI.mock.calls).toEqual(
        dataSourceEnabled ? [['wlm.getNodeStats', params]] : []
      );
      expect(mockWlmCall.mock.calls).toEqual(
        dataSourceEnabled ? [] : [['wlm.getNodeStats', params]]
      );

      const body = res.ok.mock.calls[0][0].body;
      expect(body).toEqual({ node: 'node-1', stats: {} });
      expectNoMeta(body);
    });

    test('GET /api/_wlm/{nodeId}/stats (no dataSourceId)', async () => {
      const handler = REG['GET /api/_wlm/{nodeId}/stats'];
      const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
      const res = makeRes();
      const params = { nodeId: 'node-2' };

      mockWlmCall.mockResolvedValue({ node: 'node-2', stats: {} });

      await handler(ctx, { params, query: {} }, res);

      expect(ctx.dataSource.opensearch.legacy.getClient.mock.calls).toEqual([]);
      expect(mockDsCallAPI.mock.calls).toEqual([]);
      expect(mockWlmCall.mock.calls).toEqual([['wlm.getNodeStats', params]]);

      const body = res.ok.mock.calls[0][0].body;
      expect(body).toEqual({ node: 'node-2', stats: {} });
      expectNoMeta(body);
    });

    //
    // 3) GET /api/_wlm/workload_group
    //
    test('GET /api/_wlm/workload_group (with dataSourceId)', async () => {
      const handler = REG['GET /api/_wlm/workload_group'];
      const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
      const res = makeRes();

      mockDsCallAPI.mockResolvedValue({ workload_groups: [{ name: 'DEFAULT_WORKLOAD_GROUP' }] });
      mockWlmCall.mockResolvedValue({ workload_groups: [{ name: 'DEFAULT_WORKLOAD_GROUP' }] });

      await handler(ctx, { query: { dataSourceId: 'ds-1' } }, res);

      expect(ctx.dataSource.opensearch.legacy.getClient.mock.calls).toEqual(
        dataSourceEnabled ? [['ds-1']] : []
      );
      expect(mockDsCallAPI.mock.calls).toEqual(
        dataSourceEnabled ? [['wlm.getWorkloadGroups', {}]] : []
      );
      expect(mockWlmCall.mock.calls).toEqual(dataSourceEnabled ? [] : [['wlm.getWorkloadGroups']]);

      const body = res.ok.mock.calls[0][0].body;
      expect(body).toEqual({ workload_groups: [{ name: 'DEFAULT_WORKLOAD_GROUP' }] });
      expectNoMeta(body);
    });

    test('GET /api/_wlm/workload_group (no dataSourceId)', async () => {
      const handler = REG['GET /api/_wlm/workload_group'];
      const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
      const res = makeRes();

      mockWlmCall.mockResolvedValue({ workload_groups: [{ name: 'DEFAULT_WORKLOAD_GROUP' }] });

      await handler(ctx, { query: {} }, res);

      expect(ctx.dataSource.opensearch.legacy.getClient.mock.calls).toEqual([]);
      expect(mockDsCallAPI.mock.calls).toEqual([]);
      expect(mockWlmCall.mock.calls).toEqual([['wlm.getWorkloadGroups']]);

      const body = res.ok.mock.calls[0][0].body;
      expect(body).toEqual({ workload_groups: [{ name: 'DEFAULT_WORKLOAD_GROUP' }] });
      expectNoMeta(body);
    });

    //
    // 4) GET /api/_wlm/workload_group/{name}
    //
    test('GET /api/_wlm/workload_group/{name} (with dataSourceId)', async () => {
      const handler = REG['GET /api/_wlm/workload_group/{name}'];
      const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
      const res = makeRes();
      const params = { name: 'G1' };

      mockDsCallAPI.mockResolvedValue({ name: 'G1', resource_limits: { cpu: 0, memory: 0 } });
      mockWlmCall.mockResolvedValue({ name: 'G1', resource_limits: { cpu: 0, memory: 0 } });

      await handler(ctx, { params, query: { dataSourceId: 'ds-1' } }, res);

      expect(ctx.dataSource.opensearch.legacy.getClient.mock.calls).toEqual(
        dataSourceEnabled ? [['ds-1']] : []
      );
      expect(mockDsCallAPI.mock.calls).toEqual(
        dataSourceEnabled ? [['wlm.getWorkloadGroup', params]] : []
      );
      expect(mockWlmCall.mock.calls).toEqual(
        dataSourceEnabled ? [] : [['wlm.getWorkloadGroup', params]]
      );

      const body = res.ok.mock.calls[0][0].body;
      expect(body).toEqual({ name: 'G1', resource_limits: { cpu: 0, memory: 0 } });
      expectNoMeta(body);
    });

    test('GET /api/_wlm/workload_group/{name} (no dataSourceId)', async () => {
      const handler = REG['GET /api/_wlm/workload_group/{name}'];
      const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
      const res = makeRes();
      const params = { name: 'G1' };

      mockWlmCall.mockResolvedValue({ name: 'G1', resource_limits: { cpu: 0, memory: 0 } });

      await handler(ctx, { params, query: {} }, res);

      expect(ctx.dataSource.opensearch.legacy.getClient.mock.calls).toEqual([]);
      expect(mockDsCallAPI.mock.calls).toEqual([]);
      expect(mockWlmCall.mock.calls).toEqual([['wlm.getWorkloadGroup', params]]);

      const body = res.ok.mock.calls[0][0].body;
      expect(body).toEqual({ name: 'G1', resource_limits: { cpu: 0, memory: 0 } });
      expectNoMeta(body);
    });

    //
    // 5) PUT /api/_wlm/workload_group
    //
    test('PUT /api/_wlm/workload_group (with dataSourceId)', async () => {
      const handler = REG['PUT /api/_wlm/workload_group'];
      const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
      const res = makeRes();
      const bodyIn = { name: 'g', resiliency_mode: 'soft', resource_limits: { cpu: 0, memory: 0 } };

      mockDsCallAPI.mockResolvedValue({ acknowledged: true, id: 'g' });
      mockWlmCall.mockResolvedValue({ acknowledged: true, id: 'g' });

      await handler(ctx, { body: bodyIn, query: { dataSourceId: 'ds-1' } }, res);

      expect(ctx.dataSource.opensearch.legacy.getClient.mock.calls).toEqual(
        dataSourceEnabled ? [['ds-1']] : []
      );
      expect(mockDsCallAPI.mock.calls).toEqual(
        dataSourceEnabled ? [['wlm.createWorkloadGroup', { body: bodyIn }]] : []
      );
      expect(mockWlmCall.mock.calls).toEqual(
        dataSourceEnabled ? [] : [['wlm.createWorkloadGroup', { body: bodyIn }]]
      );

      const payload = res.ok.mock.calls[0][0].body;
      expect(payload).toEqual({ acknowledged: true, id: 'g' });
      expectNoMeta(payload);
    });

    test('PUT /api/_wlm/workload_group (no dataSourceId)', async () => {
      const handler = REG['PUT /api/_wlm/workload_group'];
      const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
      const res = makeRes();
      const bodyIn = { name: 'g', resiliency_mode: 'soft', resource_limits: { cpu: 0, memory: 0 } };

      mockWlmCall.mockResolvedValue({ acknowledged: true, id: 'g' });

      await handler(ctx, { body: bodyIn, query: {} }, res);

      expect(ctx.dataSource.opensearch.legacy.getClient.mock.calls).toEqual([]);
      expect(mockDsCallAPI.mock.calls).toEqual([]);
      expect(mockWlmCall.mock.calls).toEqual([['wlm.createWorkloadGroup', { body: bodyIn }]]);

      const payload = res.ok.mock.calls[0][0].body;
      expect(payload).toEqual({ acknowledged: true, id: 'g' });
      expectNoMeta(payload);
    });

    //
    // 6) PUT /api/_wlm/workload_group/{name}
    //
    test('PUT /api/_wlm/workload_group/{name} (with dataSourceId)', async () => {
      const handler = REG['PUT /api/_wlm/workload_group/{name}'];
      const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
      const res = makeRes();
      const params = { name: 'g' };
      const bodyIn = { resiliency_mode: 'soft', resource_limits: { cpu: 0, memory: 0 } };

      mockDsCallAPI.mockResolvedValue({ updated: true });
      mockWlmCall.mockResolvedValue({ updated: true });

      await handler(ctx, { params, body: bodyIn, query: { dataSourceId: 'ds-1' } }, res);

      expect(ctx.dataSource.opensearch.legacy.getClient.mock.calls).toEqual(
        dataSourceEnabled ? [['ds-1']] : []
      );

      expect(mockDsCallAPI.mock.calls).toEqual(
        dataSourceEnabled ? [['wlm.updateWorkloadGroup', { name: 'g', body: bodyIn }]] : []
      );

      expect(mockWlmCall.mock.calls).toEqual(
        dataSourceEnabled ? [] : [['wlm.updateWorkloadGroup', { name: 'g', body: bodyIn }]]
      );

      const payload = res.ok.mock.calls[0][0].body;
      expect(payload).toEqual({ updated: true });
      expectNoMeta(payload);
    });

    test('PUT /api/_wlm/workload_group/{name} (no dataSourceId)', async () => {
      const handler = REG['PUT /api/_wlm/workload_group/{name}'];
      const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
      const res = makeRes();
      const params = { name: 'g' };
      const bodyIn = { resiliency_mode: 'soft', resource_limits: { cpu: 0, memory: 0 } };

      mockWlmCall.mockResolvedValue({ updated: true });

      await handler(ctx, { params, body: bodyIn, query: {} }, res);

      expect(ctx.dataSource.opensearch.legacy.getClient.mock.calls).toEqual([]);
      expect(mockDsCallAPI.mock.calls).toEqual([]);
      expect(mockWlmCall.mock.calls).toEqual([
        ['wlm.updateWorkloadGroup', { name: 'g', body: bodyIn }],
      ]);

      const payload = res.ok.mock.calls[0][0].body;
      expect(payload).toEqual({ updated: true });
      expectNoMeta(payload);
    });

    //
    // 7) DELETE /api/_wlm/workload_group/{name}
    //
    test('DELETE /api/_wlm/workload_group/{name} (with dataSourceId)', async () => {
      const handler = REG['DELETE /api/_wlm/workload_group/{name}'];
      const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
      const res = makeRes();
      const params = { name: 'g' };

      mockDsCallAPI.mockResolvedValue({ acknowledged: true });
      mockWlmCall.mockResolvedValue({ acknowledged: true });

      await handler(ctx, { params, query: { dataSourceId: 'ds-1' } }, res);

      expect(ctx.dataSource.opensearch.legacy.getClient.mock.calls).toEqual(
        dataSourceEnabled ? [['ds-1']] : []
      );
      expect(mockDsCallAPI.mock.calls).toEqual(
        dataSourceEnabled ? [['wlm.deleteWorkloadGroup', params]] : []
      );
      expect(mockWlmCall.mock.calls).toEqual(
        dataSourceEnabled ? [] : [['wlm.deleteWorkloadGroup', params]]
      );

      const payload = res.ok.mock.calls[0][0].body;
      expect(payload).toEqual({ acknowledged: true });
      expectNoMeta(payload);
    });

    test('DELETE /api/_wlm/workload_group/{name} (no dataSourceId)', async () => {
      const handler = REG['DELETE /api/_wlm/workload_group/{name}'];
      const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
      const res = makeRes();
      const params = { name: 'g' };

      mockWlmCall.mockResolvedValue({ acknowledged: true });

      await handler(ctx, { params, query: {} }, res);

      expect(ctx.dataSource.opensearch.legacy.getClient.mock.calls).toEqual([]);
      expect(mockDsCallAPI.mock.calls).toEqual([]);
      expect(mockWlmCall.mock.calls).toEqual([['wlm.deleteWorkloadGroup', params]]);

      const payload = res.ok.mock.calls[0][0].body;
      expect(payload).toEqual({ acknowledged: true });
      expectNoMeta(payload);
    });

    //
    // 8) GET /api/_wlm/stats/{workloadGroupId}
    //
    test('GET /api/_wlm/stats/{workloadGroupId} (with dataSourceId)', async () => {
      const handler = REG['GET /api/_wlm/stats/{workloadGroupId}'];
      const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
      const res = makeRes();
      const params = { workloadGroupId: 'wg-1' };

      mockDsCallAPI.mockResolvedValue({ id: 'wg-1', stats: {} });
      mockWlmCall.mockResolvedValue({ id: 'wg-1', stats: {} });

      await handler(ctx, { params, query: { dataSourceId: 'ds-1' } }, res);

      expect(ctx.dataSource.opensearch.legacy.getClient.mock.calls).toEqual(
        dataSourceEnabled ? [['ds-1']] : []
      );
      expect(mockDsCallAPI.mock.calls).toEqual(
        dataSourceEnabled ? [['wlm.getWorkloadGroupStats', params]] : []
      );
      expect(mockWlmCall.mock.calls).toEqual(
        dataSourceEnabled ? [] : [['wlm.getWorkloadGroupStats', params]]
      );

      const payload = res.ok.mock.calls[0][0].body;
      expect(payload).toEqual({ id: 'wg-1', stats: {} });
      expectNoMeta(payload);
    });

    test('GET /api/_wlm/stats/{workloadGroupId} (no dataSourceId)', async () => {
      const handler = REG['GET /api/_wlm/stats/{workloadGroupId}'];
      const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
      const res = makeRes();
      const params = { workloadGroupId: 'wg-1' };

      mockWlmCall.mockResolvedValue({ id: 'wg-1', stats: {} });

      await handler(ctx, { params, query: {} }, res);

      expect(ctx.dataSource.opensearch.legacy.getClient.mock.calls).toEqual([]);
      expect(mockDsCallAPI.mock.calls).toEqual([]);
      expect(mockWlmCall.mock.calls).toEqual([['wlm.getWorkloadGroupStats', params]]);

      const payload = res.ok.mock.calls[0][0].body;
      expect(payload).toEqual({ id: 'wg-1', stats: {} });
      expectNoMeta(payload);
    });

    //
    // 9) PUT /api/_rules/workload_group
    //
    test('PUT /api/_rules/workload_group (with dataSourceId)', async () => {
      const handler = REG['PUT /api/_rules/workload_group'];
      const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
      const res = makeRes();
      const bodyIn = { description: 'd', index_pattern: ['logs-*'], workload_group: 'g' };

      mockDsCallAPI.mockResolvedValue({ created: true, ruleId: 'r1' });
      mockWlmCall.mockResolvedValue({ created: true, ruleId: 'r1' });

      await handler(ctx, { body: bodyIn, query: { dataSourceId: 'ds-1' } }, res);

      expect(ctx.dataSource.opensearch.legacy.getClient.mock.calls).toEqual(
        dataSourceEnabled ? [['ds-1']] : []
      );
      expect(mockDsCallAPI.mock.calls).toEqual(
        dataSourceEnabled ? [['wlm.createRule', { body: bodyIn }]] : []
      );
      expect(mockWlmCall.mock.calls).toEqual(
        dataSourceEnabled ? [] : [['wlm.createRule', { body: bodyIn }]]
      );

      const payload = res.ok.mock.calls[0][0].body;
      expect(payload).toEqual({ created: true, ruleId: 'r1' });
      expectNoMeta(payload);
    });

    test('PUT /api/_rules/workload_group (no dataSourceId)', async () => {
      const handler = REG['PUT /api/_rules/workload_group'];
      const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
      const res = makeRes();
      const bodyIn = { description: 'd', index_pattern: ['logs-*'], workload_group: 'g' };

      mockWlmCall.mockResolvedValue({ created: true, ruleId: 'r1' });

      await handler(ctx, { body: bodyIn, query: {} }, res);

      expect(ctx.dataSource.opensearch.legacy.getClient.mock.calls).toEqual([]);
      expect(mockDsCallAPI.mock.calls).toEqual([]);
      expect(mockWlmCall.mock.calls).toEqual([['wlm.createRule', { body: bodyIn }]]);

      const payload = res.ok.mock.calls[0][0].body;
      expect(payload).toEqual({ created: true, ruleId: 'r1' });
      expectNoMeta(payload);
    });

    //
    // 10) GET /api/_rules/workload_group
    //
    test('GET /api/_rules/workload_group (with dataSourceId)', async () => {
      const handler = REG['GET /api/_rules/workload_group'];
      const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
      const res = makeRes();

      mockDsCallAPI.mockResolvedValue({ rules: [] });
      mockWlmCall.mockResolvedValue({ rules: [] });

      await handler(ctx, { query: { dataSourceId: 'ds-1' } }, res);

      expect(ctx.dataSource.opensearch.legacy.getClient.mock.calls).toEqual(
        dataSourceEnabled ? [['ds-1']] : []
      );
      expect(mockDsCallAPI.mock.calls).toEqual(dataSourceEnabled ? [['wlm.getRules', {}]] : []);
      expect(mockWlmCall.mock.calls).toEqual(dataSourceEnabled ? [] : [['wlm.getRules']]);

      const payload = res.ok.mock.calls[0][0].body;
      expect(payload).toEqual({ rules: [] });
      expectNoMeta(payload);
    });

    test('GET /api/_rules/workload_group (no dataSourceId)', async () => {
      const handler = REG['GET /api/_rules/workload_group'];
      const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
      const res = makeRes();

      mockWlmCall.mockResolvedValue({ rules: [] });

      await handler(ctx, { query: {} }, res);

      expect(ctx.dataSource.opensearch.legacy.getClient.mock.calls).toEqual([]);
      expect(mockDsCallAPI.mock.calls).toEqual([]);
      expect(mockWlmCall.mock.calls).toEqual([['wlm.getRules']]);

      const payload = res.ok.mock.calls[0][0].body;
      expect(payload).toEqual({ rules: [] });
      expectNoMeta(payload);
    });

    //
    // 11) DELETE /api/_rules/workload_group/{ruleId}
    //
    test('DELETE /api/_rules/workload_group/{ruleId} (with dataSourceId)', async () => {
      const handler = REG['DELETE /api/_rules/workload_group/{ruleId}'];
      const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
      const res = makeRes();
      const params = { ruleId: 'r1' };

      mockDsCallAPI.mockResolvedValue({ acknowledged: true });
      mockWlmCall.mockResolvedValue({ acknowledged: true });

      await handler(ctx, { params, query: { dataSourceId: 'ds-1' } }, res);

      expect(ctx.dataSource.opensearch.legacy.getClient.mock.calls).toEqual(
        dataSourceEnabled ? [['ds-1']] : []
      );
      expect(mockDsCallAPI.mock.calls).toEqual(
        dataSourceEnabled ? [['wlm.deleteRule', params]] : []
      );
      expect(mockWlmCall.mock.calls).toEqual(dataSourceEnabled ? [] : [['wlm.deleteRule', params]]);

      const payload = res.ok.mock.calls[0][0].body;
      expect(payload).toEqual({ acknowledged: true });
      expectNoMeta(payload);
    });

    test('DELETE /api/_rules/workload_group/{ruleId} (no dataSourceId)', async () => {
      const handler = REG['DELETE /api/_rules/workload_group/{ruleId}'];
      const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
      const res = makeRes();
      const params = { ruleId: 'r1' };

      mockWlmCall.mockResolvedValue({ acknowledged: true });

      await handler(ctx, { params, query: {} }, res);

      expect(ctx.dataSource.opensearch.legacy.getClient.mock.calls).toEqual([]);
      expect(mockDsCallAPI.mock.calls).toEqual([]);
      expect(mockWlmCall.mock.calls).toEqual([['wlm.deleteRule', params]]);

      const payload = res.ok.mock.calls[0][0].body;
      expect(payload).toEqual({ acknowledged: true });
      expectNoMeta(payload);
    });

    //
    // 12) PUT /api/_rules/workload_group/{ruleId}
    //
    test('PUT /api/_rules/workload_group/{ruleId} (with dataSourceId)', async () => {
      const handler = REG['PUT /api/_rules/workload_group/{ruleId}'];
      const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
      const res = makeRes();
      const params = { ruleId: 'r1' };
      const bodyIn = { description: 'd', index_pattern: ['a*'], workload_group: 'g' };

      mockDsCallAPI.mockResolvedValue({ updated: true });
      mockWlmCall.mockResolvedValue({ updated: true });

      await handler(ctx, { params, body: bodyIn, query: { dataSourceId: 'ds-1' } }, res);

      expect(ctx.dataSource.opensearch.legacy.getClient.mock.calls).toEqual(
        dataSourceEnabled ? [['ds-1']] : []
      );
      expect(mockDsCallAPI.mock.calls).toEqual(
        dataSourceEnabled ? [['wlm.updateRule', { ruleId: 'r1', body: bodyIn }]] : []
      );
      expect(mockWlmCall.mock.calls).toEqual(
        dataSourceEnabled ? [] : [['wlm.updateRule', { ruleId: 'r1', body: bodyIn }]]
      );

      const payload = res.ok.mock.calls[0][0].body;
      expect(payload).toEqual({ updated: true });
      expectNoMeta(payload);
    });

    test('PUT /api/_rules/workload_group/{ruleId} (no dataSourceId)', async () => {
      const handler = REG['PUT /api/_rules/workload_group/{ruleId}'];
      const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
      const res = makeRes();
      const params = { ruleId: 'r1' };
      const bodyIn = { description: 'd', index_pattern: ['a*'], workload_group: 'g' };

      mockWlmCall.mockResolvedValue({ updated: true });

      await handler(ctx, { params, body: bodyIn, query: {} }, res);

      expect(ctx.dataSource.opensearch.legacy.getClient.mock.calls).toEqual([]);
      expect(mockDsCallAPI.mock.calls).toEqual([]);
      expect(mockWlmCall.mock.calls).toEqual([['wlm.updateRule', { ruleId: 'r1', body: bodyIn }]]);

      const payload = res.ok.mock.calls[0][0].body;
      expect(payload).toEqual({ updated: true });
      expectNoMeta(payload);
    });

    //
    // 13) GET /api/_wlm/thresholds
    //
    test('GET /api/_wlm/thresholds (with dataSourceId)', async () => {
      const handler = REG['GET /api/_wlm/thresholds'];
      const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
      const res = makeRes();

      // DS returns only defaults; values are strings that should be parsed to numbers
      mockDsCallAPI.mockResolvedValue({
        defaults: {
          wlm: {
            workload_group: {
              node: { cpu_rejection_threshold: '0.8', memory_rejection_threshold: '0.6' },
            },
          },
        },
      });
      // Core would return something different
      mockWlmCall.mockResolvedValue({
        defaults: {
          wlm: {
            workload_group: {
              node: { cpu_rejection_threshold: '0.1', memory_rejection_threshold: '0.2' },
            },
          },
        },
      });

      await handler(ctx, { query: { dataSourceId: 'ds-1' } }, res);

      // When dataSourceEnabled is true, DS client is used; otherwise core client is used
      const expectedDsCalls = dataSourceEnabled
        ? [['wlm.getThresholds', { include_defaults: true }]]
        : [];
      const expectedCoreCalls = dataSourceEnabled
        ? []
        : [['wlm.getThresholds', { include_defaults: true }]]; // note: our handler uses callAsCurrentUser('wlm.getThresholds', { include_defaults: true })

      expect(ctx.dataSource.opensearch.legacy.getClient.mock.calls).toEqual(
        dataSourceEnabled ? [['ds-1']] : []
      );
      expect(mockDsCallAPI.mock.calls).toEqual(expectedDsCalls);
      expect(mockWlmCall.mock.calls).toEqual(expectedCoreCalls);

      const { body } = res.ok.mock.calls[0][0];
      // If DS path used → 0.8/0.6; if core path used → 0.1/0.2
      const expected = dataSourceEnabled
        ? { cpuRejectionThreshold: 0.8, memoryRejectionThreshold: 0.6 }
        : { cpuRejectionThreshold: 0.1, memoryRejectionThreshold: 0.2 };
      expect(body).toEqual(expected);
      expectNoMeta(body);
    });

    test('GET /api/_wlm/thresholds (no dataSourceId) uses core and respects fallback: transient → persistent → defaults', async () => {
      const handler = REG['GET /api/_wlm/thresholds'];
      const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
      const res = makeRes();

      mockWlmCall.mockResolvedValue({
        transient: { wlm: { workload_group: { node: { cpu_rejection_threshold: '0.75' } } } },
        persistent: { wlm: { workload_group: { node: { memory_rejection_threshold: '0.55' } } } },
        defaults: {
          wlm: {
            workload_group: {
              node: { cpu_rejection_threshold: '0.33', memory_rejection_threshold: '0.22' },
            },
          },
        },
      });

      await handler(ctx, { query: {} }, res);

      // No DS path when no dataSourceId
      expect(ctx.dataSource.opensearch.legacy.getClient).not.toHaveBeenCalled();
      expect(mockDsCallAPI).not.toHaveBeenCalled();
      // Called with include_defaults true
      expect(mockWlmCall).toHaveBeenCalledWith('wlm.getThresholds', { include_defaults: true });

      const { body } = res.ok.mock.calls[0][0];
      // cpu from transient (0.75), memory from persistent (0.55)
      expect(body).toEqual({ cpuRejectionThreshold: 0.75, memoryRejectionThreshold: 0.55 });
      expectNoMeta(body);
    });

    test('GET /api/_wlm/thresholds falls back to 1.0 when nothing provided', async () => {
      const handler = REG['GET /api/_wlm/thresholds'];
      const { ctx, mockWlmCall } = makeCtx();
      const res = makeRes();

      mockWlmCall.mockResolvedValue({}); // no transient/persistent/defaults

      await handler(ctx, { query: {} }, res);

      const { body } = res.ok.mock.calls[0][0];
      expect(body).toEqual({ cpuRejectionThreshold: 1, memoryRejectionThreshold: 1 });
      expectNoMeta(body);
    });

    test('GET /api/_wlm/thresholds bubbles OpenSearch error via customError', async () => {
      const handler = REG['GET /api/_wlm/thresholds'];
      const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
      const res = makeRes();

      const err = Object.assign(new Error('Boom'), {
        meta: { statusCode: 503, body: { error: { reason: 'service unavailable' } } },
      });

      if (dataSourceEnabled) {
        mockDsCallAPI.mockRejectedValue(err);
        await handler(ctx, { query: { dataSourceId: 'ds-1' } }, res);
      } else {
        mockWlmCall.mockRejectedValue(err);
        await handler(ctx, { query: { dataSourceId: 'ds-1' } }, res); // since dataSourceEnabled is false, still goes core path
      }

      expect(res.customError).toHaveBeenCalledWith({
        statusCode: 503,
        body: { message: 'service unavailable' },
      });
    });
  }
);
