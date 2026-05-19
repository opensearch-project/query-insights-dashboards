/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

describe('Top N Queries - WLM Available', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/top_queries/latency**', {
      fixture: 'stub_top_queries_query_only.json',
    }).as('latency');
    cy.intercept('GET', '**/api/top_queries/cpu**', {
      fixture: 'stub_top_queries_query_only.json',
    }).as('cpu');
    cy.intercept('GET', '**/api/top_queries/memory**', {
      fixture: 'stub_top_queries_query_only.json',
    }).as('memory');
    cy.intercept('GET', '**/api/_wlm/workload_group**', {
      statusCode: 200,
      body: {
        workload_groups: [
          { _id: '9mK2pL8QR7Vb4n1xC6dE2F', name: 'Analytics Team' },
          { _id: '3zY5wT9NQ8Hj7m2sA4bG1X', name: 'Search Team' },
        ],
      },
    }).as('wlmGroups');
    cy.visit('/app/query-insights-dashboards#/queryInsights');
    cy.wait(['@latency', '@cpu', '@memory', '@wlmGroups']);
    cy.get('.euiBasicTable', { timeout: 30000 }).last().should('be.visible');
  });

  it('displays correct number of queries from fixture', () => {
    cy.get('.euiBasicTable').last().find('tbody tr').should('have.length', 3);
  });

  it('shows WLM Group column with correct values', () => {
    // WLM Group column exists in the table
    cy.get('.euiBasicTable').last().should('contain.text', 'WLM Group');
    cy.get('.euiBasicTable')
      .last()
      .find('tbody tr')
      .eq(0)
      .should('contain', 'DEFAULT_WORKLOAD_GROUP');
    cy.get('.euiBasicTable').last().find('tbody tr').eq(1).should('contain', 'Analytics Team');
    cy.get('.euiBasicTable').last().find('tbody tr').eq(2).should('contain', 'Search Team');
  });

  it('filters by WLM group using search bar', () => {
    const searchInput = 'input[placeholder="e.g. latency >= 100 AND type = query"]';
    cy.get(searchInput).clear({ force: true }).type('wlm_group_id = DEFAULT_WORKLOAD_GROUP');
    cy.wait(300);
    cy.get('.euiBasicTable').last().find('tbody tr').should('have.length', 1);
    cy.get('.euiBasicTable')
      .last()
      .find('tbody tr')
      .eq(0)
      .should('contain', 'DEFAULT_WORKLOAD_GROUP');
  });

  it('shows WLM group links when mapped', () => {
    cy.get('.euiBasicTable')
      .last()
      .find('tbody tr')
      .eq(0)
      .find('button')
      .should('contain', 'DEFAULT_WORKLOAD_GROUP');
    cy.get('.euiBasicTable')
      .last()
      .find('tbody tr')
      .eq(1)
      .find('button')
      .should('contain', 'Analytics Team');
    cy.get('.euiBasicTable')
      .last()
      .find('tbody tr')
      .eq(2)
      .find('button')
      .should('contain', 'Search Team');
  });

  it('shows dash for group type records', () => {
    cy.intercept('GET', '**/api/top_queries/latency**', {
      body: {
        ok: true,
        response: {
          top_queries: [
            {
              id: 'group-1',
              group_by: 'SIMILARITY',
              wlm_group_id: 'some-group-id',
              measurements: { latency: { number: 100, count: 5 } },
            },
          ],
        },
      },
    }).as('groupData');
    cy.intercept('GET', '**/api/_wlm/workload_group**', {
      statusCode: 200,
      body: { workload_groups: [] },
    }).as('wlmGroups2');
    cy.reload();
    cy.wait(['@groupData', '@wlmGroups2']);
    cy.get('.euiBasicTable').last().find('tbody tr').eq(0).find('span').should('contain', '-');
  });

  it('shows dash for unmapped wlm_group_id', () => {
    cy.intercept('GET', '**/api/_wlm/workload_group**', {
      statusCode: 200,
      body: { workload_groups: [] },
    }).as('wlmGroups3');
    cy.reload();
    cy.wait(['@wlmGroups3']);
    cy.get('.euiBasicTable').last().find('tbody tr').eq(2).find('span').should('contain', '-');
  });
});
