/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { defineWlmRoutes } from './wlmRoutes';
import '@testing-library/jest-dom';

const REG: Record<string, (ctx: any, req: any, res: any) => Promise<any> | any> = {};
const router = {
  get: jest.fn((cfg: any, h: any) => {
    REG[`GET ${cfg.path}`] = h;
  }),
  put: jest.fn((cfg: any, h: any) => {
    REG[`PUT ${cfg.path}`] = h;
  }),
  delete: jest.fn((cfg: any, h: any) => {
    REG[`DELETE ${cfg.path}`] = h;
  }),
} as any;

const makeCtx = () => ({
  core: {
    opensearch: {
      client: {
        asCurrentUser: { transport: { request: jest.fn() } },
        asInternalUser: { cluster: { getSettings: jest.fn() } },
      },
    },
  },
  queryInsights: { logger: { error: jest.fn() } },
});

const makeRes = () => ({
  ok: jest.fn(),
  custom: jest.fn(),
  customError: jest.fn(),
  internalError: jest.fn(),
});

const expectNoMeta = (body: any) => {
  expect(body).toBeDefined();
  expect(body).not.toHaveProperty('meta');
  expect(JSON.stringify(body)).not.toContain('"meta"');
};

beforeAll(() => {
  defineWlmRoutes(router);
});

describe('defineWlmRoutes: responses must not expose `meta`', () => {
  test('GET /api/_wlm/stats', async () => {
    const handler = REG['GET /api/_wlm/stats'];
    expect(handler).toBeDefined();
    const ctx = makeCtx();
    (ctx.core.opensearch.client.asCurrentUser.transport.request as jest.Mock).mockResolvedValue({
      body: { nodes: { n1: {} } },
      meta: { shouldNotLeak: true },
    });
    const res = makeRes();
    await handler(ctx, {}, res);
    expectNoMeta(res.ok.mock.calls[0][0].body);
  });

  test('GET /api/_wlm/{nodeId}/stats', async () => {
    const handler = REG['GET /api/_wlm/{nodeId}/stats'];
    const ctx = makeCtx();
    (ctx.core.opensearch.client.asCurrentUser.transport.request as jest.Mock).mockResolvedValue({
      body: { node: 'abc', stats: {} },
      meta: { nope: true },
    });
    const res = makeRes();
    await handler(ctx, { params: { nodeId: 'abc' } }, res);
    expectNoMeta(res.ok.mock.calls[0][0].body);
  });

  test('GET /api/_wlm/workload_group', async () => {
    const handler = REG['GET /api/_wlm/workload_group'];
    const ctx = makeCtx();
    (ctx.core.opensearch.client.asCurrentUser.transport.request as jest.Mock).mockResolvedValue({
      body: { workload_groups: [{ name: 'DEFAULT_WORKLOAD_GROUP' }] },
      meta: { nope: true },
    });
    const res = makeRes();
    await handler(ctx, {}, res);
    expectNoMeta(res.ok.mock.calls[0][0].body);
  });

  test('GET /api/_wlm/workload_group/{name}', async () => {
    const handler = REG['GET /api/_wlm/workload_group/{name}'];
    const ctx = makeCtx();
    (ctx.core.opensearch.client.asCurrentUser.transport.request as jest.Mock).mockResolvedValue({
      body: { name: 'G1', resource_limits: { cpu: 0, memory: 0 } },
      meta: { nope: true },
    });
    const res = makeRes();
    await handler(ctx, { params: { name: 'G1' } }, res);
    expectNoMeta(res.ok.mock.calls[0][0].body);
  });

  test('PUT /api/_wlm/workload_group', async () => {
    const handler = REG['PUT /api/_wlm/workload_group'];
    const ctx = makeCtx();
    (ctx.core.opensearch.client.asCurrentUser.transport.request as jest.Mock).mockResolvedValue({
      body: { acknowledged: true, id: 'g' },
      meta: { nope: true },
    });
    const res = makeRes();
    await handler(
      ctx,
      { body: { name: 'g', resiliency_mode: 'soft', resource_limits: { cpu: 0, memory: 0 } } },
      res
    );
    expectNoMeta(res.ok.mock.calls[0][0].body);
  });

  test('PUT /api/_wlm/workload_group/{name}', async () => {
    const handler = REG['PUT /api/_wlm/workload_group/{name}'];
    const ctx = makeCtx();
    (ctx.core.opensearch.client.asCurrentUser.transport.request as jest.Mock).mockResolvedValue({
      body: { updated: true },
      meta: { nope: true },
    });
    const res = makeRes();
    await handler(
      ctx,
      {
        params: { name: 'g' },
        body: { resiliency_mode: 'soft', resource_limits: { cpu: 0, memory: 0 } },
      },
      res
    );
    expectNoMeta(res.ok.mock.calls[0][0].body);
  });

  test('DELETE /api/_wlm/workload_group/{name}', async () => {
    const handler = REG['DELETE /api/_wlm/workload_group/{name}'];
    const ctx = makeCtx();
    (ctx.core.opensearch.client.asCurrentUser.transport.request as jest.Mock).mockResolvedValue({
      body: { acknowledged: true },
      meta: { nope: true },
    });
    const res = makeRes();
    await handler(ctx, { params: { name: 'g' } }, res);
    expectNoMeta(res.ok.mock.calls[0][0].body);
  });

  test('GET /api/_wlm/stats/{workloadGroupId}', async () => {
    const handler = REG['GET /api/_wlm/stats/{workloadGroupId}'];
    const ctx = makeCtx();
    (ctx.core.opensearch.client.asCurrentUser.transport.request as jest.Mock).mockResolvedValue({
      body: { id: 'wg-1', stats: {} },
      meta: { nope: true },
    });
    const res = makeRes();
    await handler(ctx, { params: { workloadGroupId: 'wg-1' } }, res);
    expectNoMeta(res.ok.mock.calls[0][0].body);
  });

  test('PUT /api/_rules/workload_group', async () => {
    const handler = REG['PUT /api/_rules/workload_group'];
    const ctx = makeCtx();
    (ctx.core.opensearch.client.asCurrentUser.transport.request as jest.Mock).mockResolvedValue({
      body: { created: true, ruleId: 'r1' },
      meta: { nope: true },
    });
    const res = makeRes();
    await handler(
      ctx,
      { body: { description: 'd', index_pattern: ['logs-*'], workload_group: 'g' } },
      res
    );
    expectNoMeta(res.ok.mock.calls[0][0].body);
  });

  test('GET /api/_rules/workload_group', async () => {
    const handler = REG['GET /api/_rules/workload_group'];
    const ctx = makeCtx();
    (ctx.core.opensearch.client.asCurrentUser.transport.request as jest.Mock).mockResolvedValue({
      body: { rules: [] },
      meta: { nope: true },
    });
    const res = makeRes();
    await handler(ctx, {}, res);
    expectNoMeta(res.ok.mock.calls[0][0].body);
  });

  test('DELETE /api/_rules/workload_group/{ruleId}', async () => {
    const handler = REG['DELETE /api/_rules/workload_group/{ruleId}'];
    const ctx = makeCtx();
    (ctx.core.opensearch.client.asCurrentUser.transport.request as jest.Mock).mockResolvedValue({
      body: { acknowledged: true },
      meta: { nope: true },
    });
    const res = makeRes();
    await handler(ctx, { params: { ruleId: 'r1' } }, res);
    expectNoMeta(res.ok.mock.calls[0][0].body);
  });

  test('PUT /api/_rules/workload_group/{ruleId}', async () => {
    const handler = REG['PUT /api/_rules/workload_group/{ruleId}'];
    const ctx = makeCtx();
    (ctx.core.opensearch.client.asCurrentUser.transport.request as jest.Mock).mockResolvedValue({
      body: { updated: true },
      meta: { nope: true },
    });
    const res = makeRes();
    await handler(
      ctx,
      {
        params: { ruleId: 'r1' },
        body: { description: 'd', index_pattern: ['a*'], workload_group: 'g' },
      },
      res
    );
    expectNoMeta(res.ok.mock.calls[0][0].body);
  });

  test('GET /api/_wlm/thresholds', async () => {
    const handler = REG['GET /api/_wlm/thresholds'];
    const ctx = makeCtx();
    (ctx.core.opensearch.client.asInternalUser.cluster.getSettings as jest.Mock).mockResolvedValue({
      body: {
        defaults: {
          wlm: {
            workload_group: {
              node: { cpu_rejection_threshold: '0.8', memory_rejection_threshold: '0.6' },
            },
          },
        },
      },
      meta: { nope: true },
    });
    const res = makeRes();
    await handler(ctx, {}, res);
    const payload = res.ok.mock.calls[0][0].body;
    expectNoMeta(payload);
    expect(payload).toEqual({ cpuRejectionThreshold: 0.8, memoryRejectionThreshold: 0.6 });
  });
});
