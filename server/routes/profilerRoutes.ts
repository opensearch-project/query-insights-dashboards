/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { IRouter } from '../../../../src/core/server';

export function defineRoutes(router: IRouter) {
  router.post(
    {
      path: '/api/query-insights/proxy/{path*}',
      validate: false,
    },
    async (context, request, response) => {
      try {
        const { path } = request.params;
        const client = context.core.opensearch.client.asCurrentUser;
        
        const result = await client.transport.request({
          method: request.body.method || 'GET',
          path: `/${path}`,
          body: request.body.body ? JSON.parse(request.body.body) : undefined,
        });

        return response.ok({
          body: JSON.stringify(result.body, null, 2),
        });
      } catch (error) {
        return response.customError({
          statusCode: error.statusCode || 500,
          body: error.message,
        });
      }
    }
  );
}