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
          // Core/plugin client (your current implementation)
          wlm_plugin: {
            wlmClient: {
              asScoped: jest.fn(() => ({
                // usage: const client = asScoped(request).callAsCurrentUser; client('wlm.getStats', params?)
                callAsCurrentUser: mockWlmCall,
              })),
            },
          },

          // Data source legacy client
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

          // Thresholds (core/internal client)
          core: {
            opensearch: {
              client: {
                asInternalUser: { cluster: { getSettings: mockCoreGetSettings } },
              },
            },
          },

          queryInsights: { logger: { error: jest.fn() } },
        };

        return {
          ctx,
          mockWlmCall,
          mockDsCallAPI,
          mockDsGetSettings,
          mockCoreGetSettings,
        };
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
      // /api/_wlm/stats
      //
      test('GET /api/_wlm/stats — branch selection and payload', async () => {
        const handler = REG['GET /api/_wlm/stats'];
        const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
        const res = makeRes();

        // Case A: choose branch based on dsEnabled + query.dataSourceId
        if (dataSourceEnabled) {
          // DS branch when dataSourceId is present
          mockDsCallAPI.mockResolvedValue({ nodes: { n2: {} } });
          await handler(ctx, { query: { dataSourceId: 'ds-1' } }, res);
          expect(ctx.dataSource.opensearch.legacy.getClient).toHaveBeenCalledWith('ds-1');
          expect(mockDsCallAPI).toHaveBeenCalledWith('wlm.getStats', {});
          let payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ nodes: { n2: {} } });
          expectNoMeta(payload);

          // Core/plugin branch when no dataSourceId
          res.ok.mockClear();
          mockWlmCall.mockResolvedValue({ nodes: { n1: {} } });
          await handler(ctx, { query: {} }, res);
          expect(mockWlmCall).toHaveBeenCalledWith('wlm.getStats');
          payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ nodes: { n1: {} } });
          expectNoMeta(payload);
        } else {
          // When dsEnabled=false, always core/plugin branch (ignore dataSourceId if passed)
          mockWlmCall.mockResolvedValue({ nodes: { n1: {} } });
          await handler(ctx, { query: { dataSourceId: 'ds-ignored' } }, res);
          expect(mockWlmCall).toHaveBeenCalledWith('wlm.getStats');
          expect(ctx.dataSource.opensearch.legacy.getClient).not.toHaveBeenCalled();
          const payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ nodes: { n1: {} } });
          expectNoMeta(payload);
        }
      });

      //
      // /api/_wlm/{nodeId}/stats
      //
      test('GET /api/_wlm/{nodeId}/stats — branch selection and payload', async () => {
        const handler = REG['GET /api/_wlm/{nodeId}/stats'];
        const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
        const res = makeRes();

        if (dataSourceEnabled) {
          // DS branch
          mockDsCallAPI.mockResolvedValue({ node: 'def', stats: {} });
          await handler(ctx, { params: { nodeId: 'def' }, query: { dataSourceId: 'ds-x' } }, res);
          expect(ctx.dataSource.opensearch.legacy.getClient).toHaveBeenCalledWith('ds-x');
          expect(mockDsCallAPI).toHaveBeenCalledWith('wlm.getNodeStats', { nodeId: 'def' });
          let payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ node: 'def', stats: {} });
          expectNoMeta(payload);

          // Core/plugin branch
          res.ok.mockClear();
          mockWlmCall.mockResolvedValue({ node: 'abc', stats: {} });
          await handler(ctx, { params: { nodeId: 'abc' }, query: {} }, res);
          expect(mockWlmCall).toHaveBeenCalledWith('wlm.getNodeStats', { nodeId: 'abc' });
          payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ node: 'abc', stats: {} });
          expectNoMeta(payload);
        } else {
          // Always core/plugin
          mockWlmCall.mockResolvedValue({ node: 'abc', stats: {} });
          await handler(ctx, { params: { nodeId: 'abc' }, query: { dataSourceId: 'ignored' } }, res);
          expect(mockWlmCall).toHaveBeenCalledWith('wlm.getNodeStats', { nodeId: 'abc' });
          const payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ node: 'abc', stats: {} });
          expectNoMeta(payload);
        }
      });

      //
      // /api/_wlm/workload_group (list)
      //
      test('GET /api/_wlm/workload_group — branch selection and payload', async () => {
        const handler = REG['GET /api/_wlm/workload_group'];
        const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
        const res = makeRes();

        if (dataSourceEnabled) {
          // DS
          mockDsCallAPI.mockResolvedValue({ workload_groups: [{ name: 'DEFAULT_WORKLOAD_GROUP' }] });
          await handler(ctx, { query: { dataSourceId: 'ds-1' } }, res);
          expect(ctx.dataSource.opensearch.legacy.getClient).toHaveBeenCalledWith('ds-1');
          expect(mockDsCallAPI).toHaveBeenCalledWith('wlm.getWorkloadGroups', {});
          let payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ workload_groups: [{ name: 'DEFAULT_WORKLOAD_GROUP' }] });
          expectNoMeta(payload);

          // Core/plugin
          res.ok.mockClear();
          mockWlmCall.mockResolvedValue({ workload_groups: [{ name: 'DEFAULT_WORKLOAD_GROUP' }] });
          await handler(ctx, { query: {} }, res);
          expect(mockWlmCall).toHaveBeenCalledWith('wlm.getWorkloadGroups');
          payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ workload_groups: [{ name: 'DEFAULT_WORKLOAD_GROUP' }] });
          expectNoMeta(payload);
        } else {
          mockWlmCall.mockResolvedValue({ workload_groups: [{ name: 'DEFAULT_WORKLOAD_GROUP' }] });
          await handler(ctx, { query: { dataSourceId: 'ignored' } }, res);
          expect(mockWlmCall).toHaveBeenCalledWith('wlm.getWorkloadGroups');
          const payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ workload_groups: [{ name: 'DEFAULT_WORKLOAD_GROUP' }] });
          expectNoMeta(payload);
        }
      });

      //
      // /api/_wlm/workload_group/{name} (get one)
      //
      test('GET /api/_wlm/workload_group/{name} — branch selection and payload', async () => {
        const handler = REG['GET /api/_wlm/workload_group/{name}'];
        const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
        const res = makeRes();

        if (dataSourceEnabled) {
          mockDsCallAPI.mockResolvedValue({ name: 'G1', resource_limits: { cpu: 0, memory: 0 } });
          await handler(ctx, { params: { name: 'G1' }, query: { dataSourceId: 'ds-1' } }, res);
          expect(ctx.dataSource.opensearch.legacy.getClient).toHaveBeenCalledWith('ds-1');
          expect(mockDsCallAPI).toHaveBeenCalledWith('wlm.getWorkloadGroup', { name: 'G1' });
          let payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ name: 'G1', resource_limits: { cpu: 0, memory: 0 } });
          expectNoMeta(payload);

          res.ok.mockClear();
          mockWlmCall.mockResolvedValue({ name: 'G1', resource_limits: { cpu: 0, memory: 0 } });
          await handler(ctx, { params: { name: 'G1' }, query: {} }, res);
          expect(mockWlmCall).toHaveBeenCalledWith('wlm.getWorkloadGroup', { name: 'G1' });
          payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ name: 'G1', resource_limits: { cpu: 0, memory: 0 } });
          expectNoMeta(payload);
        } else {
          mockWlmCall.mockResolvedValue({ name: 'G1', resource_limits: { cpu: 0, memory: 0 } });
          await handler(ctx, { params: { name: 'G1' }, query: { dataSourceId: 'ignored' } }, res);
          expect(mockWlmCall).toHaveBeenCalledWith('wlm.getWorkloadGroup', { name: 'G1' });
          const payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ name: 'G1', resource_limits: { cpu: 0, memory: 0 } });
          expectNoMeta(payload);
        }
      });

      //
      // Create workload group
      //
      test('PUT /api/_wlm/workload_group — branch selection and payload', async () => {
        const handler = REG['PUT /api/_wlm/workload_group'];
        const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
        const res = makeRes();
        const body = { name: 'g', resiliency_mode: 'soft', resource_limits: { cpu: 0, memory: 0 } };

        if (dataSourceEnabled) {
          mockDsCallAPI.mockResolvedValue({ acknowledged: true, id: 'g' });
          await handler(ctx, { body, query: { dataSourceId: 'ds-1' } }, res);
          expect(ctx.dataSource.opensearch.legacy.getClient).toHaveBeenCalledWith('ds-1');
          expect(mockDsCallAPI).toHaveBeenCalledWith('wlm.createWorkloadGroup', { body });
          let payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ acknowledged: true, id: 'g' });
          expectNoMeta(payload);

          res.ok.mockClear();
          mockWlmCall.mockResolvedValue({ acknowledged: true, id: 'g' });
          await handler(ctx, { body, query: {} }, res);
          expect(mockWlmCall).toHaveBeenCalledWith('wlm.createWorkloadGroup', { body });
          payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ acknowledged: true, id: 'g' });
          expectNoMeta(payload);
        } else {
          mockWlmCall.mockResolvedValue({ acknowledged: true, id: 'g' });
          await handler(ctx, { body, query: { dataSourceId: 'ignored' } }, res);
          expect(mockWlmCall).toHaveBeenCalledWith('wlm.createWorkloadGroup', { body });
          const payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ acknowledged: true, id: 'g' });
          expectNoMeta(payload);
        }
      });

      //
      // Update workload group
      //
      test('PUT /api/_wlm/workload_group/{name} — branch selection and payload', async () => {
        const handler = REG['PUT /api/_wlm/workload_group/{name}'];
        const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
        const res = makeRes();
        const body = { resiliency_mode: 'soft', resource_limits: { cpu: 0, memory: 0 } };

        if (dataSourceEnabled) {
          mockDsCallAPI.mockResolvedValue({ updated: true });
          await handler(ctx, { params: { name: 'g' }, body, query: { dataSourceId: 'ds-1' } }, res);
          expect(ctx.dataSource.opensearch.legacy.getClient).toHaveBeenCalledWith('ds-1');
          expect(mockDsCallAPI).toHaveBeenCalledWith('wlm.updateWorkloadGroup', {
            name: 'g',
            body,
          });
          let payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ updated: true });
          expectNoMeta(payload);

          res.ok.mockClear();
          mockWlmCall.mockResolvedValue({ updated: true });
          await handler(ctx, { params: { name: 'g' }, body, query: {} }, res);
          expect(mockWlmCall).toHaveBeenCalledWith('wlm.updateWorkloadGroup', { name: 'g', body });
          payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ updated: true });
          expectNoMeta(payload);
        } else {
          mockWlmCall.mockResolvedValue({ updated: true });
          await handler(ctx, { params: { name: 'g' }, body, query: { dataSourceId: 'ignored' } }, res);
          expect(mockWlmCall).toHaveBeenCalledWith('wlm.updateWorkloadGroup', { name: 'g', body });
          const payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ updated: true });
          expectNoMeta(payload);
        }
      });

      //
      // Delete workload group
      //
      test('DELETE /api/_wlm/workload_group/{name} — branch selection and payload', async () => {
        const handler = REG['DELETE /api/_wlm/workload_group/{name}'];
        const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
        const res = makeRes();

        if (dataSourceEnabled) {
          mockDsCallAPI.mockResolvedValue({ acknowledged: true });
          await handler(ctx, { params: { name: 'g' }, query: { dataSourceId: 'ds-1' } }, res);
          expect(ctx.dataSource.opensearch.legacy.getClient).toHaveBeenCalledWith('ds-1');
          expect(mockDsCallAPI).toHaveBeenCalledWith('wlm.deleteWorkloadGroup', { name: 'g' });
          let payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ acknowledged: true });
          expectNoMeta(payload);

          res.ok.mockClear();
          mockWlmCall.mockResolvedValue({ acknowledged: true });
          await handler(ctx, { params: { name: 'g' }, query: {} }, res);
          expect(mockWlmCall).toHaveBeenCalledWith('wlm.deleteWorkloadGroup', { name: 'g' });
          payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ acknowledged: true });
          expectNoMeta(payload);
        } else {
          mockWlmCall.mockResolvedValue({ acknowledged: true });
          await handler(ctx, { params: { name: 'g' }, query: { dataSourceId: 'ignored' } }, res);
          expect(mockWlmCall).toHaveBeenCalledWith('wlm.deleteWorkloadGroup', { name: 'g' });
          const payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ acknowledged: true });
          expectNoMeta(payload);
        }
      });

      //
      // Workload group stats
      //
      test('GET /api/_wlm/stats/{workloadGroupId} — branch selection and payload', async () => {
        const handler = REG['GET /api/_wlm/stats/{workloadGroupId}'];
        const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
        const res = makeRes();

        if (dataSourceEnabled) {
          mockDsCallAPI.mockResolvedValue({ id: 'wg-1', stats: {} });
          await handler(
              ctx,
              { params: { workloadGroupId: 'wg-1' }, query: { dataSourceId: 'ds-1' } },
              res
          );
          expect(ctx.dataSource.opensearch.legacy.getClient).toHaveBeenCalledWith('ds-1');
          expect(mockDsCallAPI).toHaveBeenCalledWith('wlm.getWorkloadGroupStats', {
            workloadGroupId: 'wg-1',
          });
          let payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ id: 'wg-1', stats: {} });
          expectNoMeta(payload);

          res.ok.mockClear();
          mockWlmCall.mockResolvedValue({ id: 'wg-1', stats: {} });
          await handler(ctx, { params: { workloadGroupId: 'wg-1' }, query: {} }, res);
          expect(mockWlmCall).toHaveBeenCalledWith('wlm.getWorkloadGroupStats', {
            workloadGroupId: 'wg-1',
          });
          payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ id: 'wg-1', stats: {} });
          expectNoMeta(payload);
        } else {
          mockWlmCall.mockResolvedValue({ id: 'wg-1', stats: {} });
          await handler(
              ctx,
              { params: { workloadGroupId: 'wg-1' }, query: { dataSourceId: 'ignored' } },
              res
          );
          expect(mockWlmCall).toHaveBeenCalledWith('wlm.getWorkloadGroupStats', {
            workloadGroupId: 'wg-1',
          });
          const payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ id: 'wg-1', stats: {} });
          expectNoMeta(payload);
        }
      });

      //
      // Create rule
      //
      test('PUT /api/_rules/workload_group — branch selection and payload', async () => {
        const handler = REG['PUT /api/_rules/workload_group'];
        const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
        const res = makeRes();
        const body = { description: 'd', index_pattern: ['logs-*'], workload_group: 'g' };

        if (dataSourceEnabled) {
          mockDsCallAPI.mockResolvedValue({ created: true, ruleId: 'r1' });
          await handler(ctx, { body, query: { dataSourceId: 'ds-1' } }, res);
          expect(ctx.dataSource.opensearch.legacy.getClient).toHaveBeenCalledWith('ds-1');
          expect(mockDsCallAPI).toHaveBeenCalledWith('wlm.createRule', { body });
          let payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ created: true, ruleId: 'r1' });
          expectNoMeta(payload);

          res.ok.mockClear();
          mockWlmCall.mockResolvedValue({ created: true, ruleId: 'r1' });
          await handler(ctx, { body, query: {} }, res);
          expect(mockWlmCall).toHaveBeenCalledWith('wlm.createRule', { body });
          payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ created: true, ruleId: 'r1' });
          expectNoMeta(payload);
        } else {
          mockWlmCall.mockResolvedValue({ created: true, ruleId: 'r1' });
          await handler(ctx, { body, query: { dataSourceId: 'ignored' } }, res);
          expect(mockWlmCall).toHaveBeenCalledWith('wlm.createRule', { body });
          const payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ created: true, ruleId: 'r1' });
          expectNoMeta(payload);
        }
      });

      //
      // Get rules
      //
      test('GET /api/_rules/workload_group — branch selection and payload', async () => {
        const handler = REG['GET /api/_rules/workload_group'];
        const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
        const res = makeRes();

        if (dataSourceEnabled) {
          mockDsCallAPI.mockResolvedValue({ rules: [] });
          await handler(ctx, { query: { dataSourceId: 'ds-1' } }, res);
          expect(ctx.dataSource.opensearch.legacy.getClient).toHaveBeenCalledWith('ds-1');
          expect(mockDsCallAPI).toHaveBeenCalledWith('wlm.getRules', {});
          let payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ rules: [] });
          expectNoMeta(payload);

          res.ok.mockClear();
          mockWlmCall.mockResolvedValue({ rules: [] });
          await handler(ctx, { query: {} }, res);
          expect(mockWlmCall).toHaveBeenCalledWith('wlm.getRules');
          payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ rules: [] });
          expectNoMeta(payload);
        } else {
          mockWlmCall.mockResolvedValue({ rules: [] });
          await handler(ctx, { query: { dataSourceId: 'ignored' } }, res);
          expect(mockWlmCall).toHaveBeenCalledWith('wlm.getRules');
          const payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ rules: [] });
          expectNoMeta(payload);
        }
      });

      //
      // Delete rule
      //
      test('DELETE /api/_rules/workload_group/{ruleId} — branch selection and payload', async () => {
        const handler = REG['DELETE /api/_rules/workload_group/{ruleId}'];
        const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
        const res = makeRes();

        if (dataSourceEnabled) {
          mockDsCallAPI.mockResolvedValue({ acknowledged: true });
          await handler(ctx, { params: { ruleId: 'r1' }, query: { dataSourceId: 'ds-1' } }, res);
          expect(ctx.dataSource.opensearch.legacy.getClient).toHaveBeenCalledWith('ds-1');
          expect(mockDsCallAPI).toHaveBeenCalledWith('wlm.deleteRule', { ruleId: 'r1' });
          let payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ acknowledged: true });
          expectNoMeta(payload);

          res.ok.mockClear();
          mockWlmCall.mockResolvedValue({ acknowledged: true });
          await handler(ctx, { params: { ruleId: 'r1' }, query: {} }, res);
          expect(mockWlmCall).toHaveBeenCalledWith('wlm.deleteRule', { ruleId: 'r1' });
          payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ acknowledged: true });
          expectNoMeta(payload);
        } else {
          mockWlmCall.mockResolvedValue({ acknowledged: true });
          await handler(ctx, { params: { ruleId: 'r1' }, query: { dataSourceId: 'ignored' } }, res);
          expect(mockWlmCall).toHaveBeenCalledWith('wlm.deleteRule', { ruleId: 'r1' });
          const payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ acknowledged: true });
          expectNoMeta(payload);
        }
      });

      //
      // Update rule
      //
      test('PUT /api/_rules/workload_group/{ruleId} — branch selection and payload', async () => {
        const handler = REG['PUT /api/_rules/workload_group/{ruleId}'];
        const { ctx, mockWlmCall, mockDsCallAPI } = makeCtx();
        const res = makeRes();
        const body = { description: 'd', index_pattern: ['a*'], workload_group: 'g' };

        if (dataSourceEnabled) {
          mockDsCallAPI.mockResolvedValue({ updated: true });
          await handler(
              ctx,
              { params: { ruleId: 'r1' }, body, query: { dataSourceId: 'ds-1' } },
              res
          );
          expect(ctx.dataSource.opensearch.legacy.getClient).toHaveBeenCalledWith('ds-1');
          expect(mockDsCallAPI).toHaveBeenCalledWith('wlm.updateRule', { ruleId: 'r1', body });
          let payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ updated: true });
          expectNoMeta(payload);

          res.ok.mockClear();
          mockWlmCall.mockResolvedValue({ updated: true });
          await handler(ctx, { params: { ruleId: 'r1' }, body, query: {} }, res);
          expect(mockWlmCall).toHaveBeenCalledWith('wlm.updateRule', { ruleId: 'r1', body });
          payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ updated: true });
          expectNoMeta(payload);
        } else {
          mockWlmCall.mockResolvedValue({ updated: true });
          await handler(
              ctx,
              { params: { ruleId: 'r1' }, body, query: { dataSourceId: 'ignored' } },
              res
          );
          expect(mockWlmCall).toHaveBeenCalledWith('wlm.updateRule', { ruleId: 'r1', body });
          const payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ updated: true });
          expectNoMeta(payload);
        }
      });

      //
      // Thresholds
      //
      test('GET /api/_wlm/thresholds — branch selection and payload', async () => {
        const handler = REG['GET /api/_wlm/thresholds'];
        const { ctx, mockCoreGetSettings, mockDsGetSettings } = makeCtx();
        const res = makeRes();

        if (dataSourceEnabled) {
          // DS when dataSourceId present
          mockDsGetSettings.mockResolvedValue({
            body: {
              persistent: {
                wlm: {
                  workload_group: {
                    node: { cpu_rejection_threshold: '0.7', memory_rejection_threshold: '0.5' },
                  },
                },
              },
            },
          });
          await handler(ctx, { query: { dataSourceId: 'ds-xyz' } }, res);
          expect(ctx.dataSource.opensearch.legacy.getClient).toHaveBeenCalledWith('ds-xyz');
          expect(mockDsGetSettings).toHaveBeenCalledWith({ include_defaults: true });
          let payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ cpuRejectionThreshold: 0.7, memoryRejectionThreshold: 0.5 });
          expectNoMeta(payload);

          // Core/internal when no DS id
          res.ok.mockClear();
          mockCoreGetSettings.mockResolvedValue({
            body: {
              defaults: {
                wlm: {
                  workload_group: {
                    node: { cpu_rejection_threshold: '0.9', memory_rejection_threshold: '0.6' },
                  },
                },
              },
            },
          });
          await handler(ctx, { query: {} }, res);
          expect(mockCoreGetSettings).toHaveBeenCalledWith({ include_defaults: true });
          payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ cpuRejectionThreshold: 0.9, memoryRejectionThreshold: 0.6 });
          expectNoMeta(payload);
        } else {
          // Always core/internal (ignore DS id)
          mockCoreGetSettings.mockResolvedValue({
            body: {
              defaults: {
                wlm: {
                  workload_group: {
                    node: { cpu_rejection_threshold: '0.8', memory_rejection_threshold: '0.6' },
                  },
                },
              },
            },
          });
          await handler(ctx, { query: { dataSourceId: 'ignored' } }, res);
          expect(mockCoreGetSettings).toHaveBeenCalledWith({ include_defaults: true });
          expect(mockDsGetSettings).not.toHaveBeenCalled();
          const payload = res.ok.mock.calls[0][0].body;
          expect(payload).toEqual({ cpuRejectionThreshold: 0.8, memoryRejectionThreshold: 0.6 });
          expectNoMeta(payload);
        }
      });
    }
);
