/**
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 * @jest-environment node
 */

import { createServer } from 'http';
import { Client } from 'elasticsearch';
import { QueryInsightsPlugin } from './queryInsightsPlugin';

describe('live query WLM group requests', () => {
  it.each(['DEFAULT_WORKLOAD_GROUP', 'group/with spaces & symbols'])(
    'preserves the exact group alongside verbose and finished-cache parameters: %s',
    async (group) => {
      let received: string | undefined;
      const server = createServer((request, response) => {
        received = request.url;
        response.setHeader('Content-Type', 'application/json');
        response.end('{"live_queries":[]}');
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Missing test server address');
      const client = new Client({
        host: `http://127.0.0.1:${address.port}`,
        plugins: [QueryInsightsPlugin],
        log: [],
      });
      try {
        await (client as any).queryInsights.getLiveQueriesWLMGroup({
          wlmGroupId: group,
          verbose: true,
          use_finished_cache: true,
        });
        const url = new URL(received!, 'http://localhost');
        expect(url.pathname).toBe('/_insights/live_queries');
        expect(url.searchParams.get('wlmGroupId')).toBe(group);
        expect(url.searchParams.get('verbose')).toBe('true');
        expect(url.searchParams.get('use_finished_cache')).toBe('true');
      } finally {
        client.close();
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve()))
        );
      }
    }
  );
});
