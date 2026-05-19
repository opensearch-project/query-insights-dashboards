/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

describe('User Info Columns with Security Enabled', () => {
  const queriesWithUserInfo = {
    ok: true,
    response: {
      top_queries: [
        {
          id: 'query-1',
          timestamp: Date.now() - 5000,
          measurements: { latency: { number: 5000000, count: 1 } },
          indices: ['test-index'],
          search_type: 'query_then_fetch',
          node_id: 'node1',
          total_shards: 1,
          group_by: 'NONE',
          username: 'admin',
          user_roles: ['all_access', 'security_rest_api_access'],
          labels: { 'X-Opaque-Id': 'admin-console' },
        },
        {
          id: 'query-2',
          timestamp: Date.now() - 3000,
          measurements: { latency: { number: 3000000, count: 1 } },
          indices: ['analytics-data'],
          search_type: 'query_then_fetch',
          node_id: 'node1',
          total_shards: 2,
          group_by: 'NONE',
          username: 'alice',
          user_roles: ['analyst', 'readall'],
          labels: { 'X-Opaque-Id': 'analytics-app' },
        },
        {
          id: 'query-3',
          timestamp: Date.now() - 1000,
          measurements: { latency: { number: 8000000, count: 1 } },
          indices: ['ml-features'],
          search_type: 'dfs_query_then_fetch',
          node_id: 'node1',
          total_shards: 3,
          group_by: 'NONE',
          username: 'bob',
          user_roles: ['engineer'],
          labels: { 'X-Opaque-Id': 'ml-pipeline' },
        },
      ],
    },
  };

  const queriesWithoutUserInfo = {
    ok: true,
    response: {
      top_queries: [
        {
          id: 'query-no-user',
          timestamp: Date.now(),
          measurements: { latency: { number: 2000000, count: 1 } },
          indices: ['test'],
          search_type: 'query_then_fetch',
          node_id: 'node1',
          total_shards: 1,
          group_by: 'NONE',
        },
      ],
    },
  };

  describe('when queries have user info', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/top_queries/**', {
        statusCode: 200,
        body: queriesWithUserInfo,
      }).as('topQueries');

      cy.waitForQueryInsightsPlugin();
      cy.wait('@topQueries');
    });

    it('shows Username column', () => {
      cy.get('.euiBasicTable').last().should('contain.text', 'Username');
    });

    it('shows User Roles column', () => {
      cy.get('.euiBasicTable').last().should('contain.text', 'User Roles');
    });

    it('shows Application ID column', () => {
      cy.get('.euiBasicTable').last().should('contain.text', 'Application ID');
    });

    it('displays correct username values', () => {
      cy.get('.euiBasicTable').last().find('tbody').should('contain.text', 'admin');
      cy.get('.euiBasicTable').last().find('tbody').should('contain.text', 'alice');
      cy.get('.euiBasicTable').last().find('tbody').should('contain.text', 'bob');
    });

    it('displays correct user roles', () => {
      cy.get('.euiBasicTable').last().find('tbody').should('contain.text', 'all_access');
      cy.get('.euiBasicTable').last().find('tbody').should('contain.text', 'analyst');
      cy.get('.euiBasicTable').last().find('tbody').should('contain.text', 'engineer');
    });

    it('displays correct Application ID values', () => {
      cy.get('.euiBasicTable').last().find('tbody').should('contain.text', 'admin-console');
      cy.get('.euiBasicTable').last().find('tbody').should('contain.text', 'analytics-app');
      cy.get('.euiBasicTable').last().find('tbody').should('contain.text', 'ml-pipeline');
    });
  });

  describe('when queries do not have user info (security disabled)', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/top_queries/**', {
        statusCode: 200,
        body: queriesWithoutUserInfo,
      }).as('topQueries');

      cy.waitForQueryInsightsPlugin();
      cy.wait('@topQueries');
    });

    it('hides Username column', () => {
      cy.get('.euiBasicTable').last().should('not.contain.text', 'Username');
    });

    it('hides User Roles column', () => {
      cy.get('.euiBasicTable').last().should('not.contain.text', 'User Roles');
    });

    it('still shows Application ID column when labels exist', () => {
      // Application ID is always shown regardless of security
      cy.get('.euiBasicTable').last().should('contain.text', 'Application ID');
    });
  });
});
