/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

describe('Top N Queries - WLM Available', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/top_queries*', { fixture: 'stub_top_queries.json' }).as('topQueries');
    cy.intercept('GET', '/api/_wlm/workload_group*', {
      statusCode: 200,
      body: {
        workload_groups: [
          { _id: 'DEFAULT_WORKLOAD_GROUP', name: 'Default Group' },
          { _id: 'ANALYTICS_GROUP', name: 'Analytics Team' }
        ]
      }
    }).as('wlmGroups');
    cy.visit('/app/query-insights-dashboards#/queryInsights');
    cy.wait(['@topQueries', '@wlmGroups']);
  });

  it('displays WLM Group column with clickable links', () => {
    cy.get('table').should('exist');
    cy.contains('WLM Group').should('be.visible');
    cy.get('table tbody tr')
      .first()
      .within(() => {
        cy.get('td a')
          .contains(/DEFAULT_WORKLOAD_GROUP|ANALYTICS_GROUP/)
          .should('exist');
      });
  });

  it('shows mapped WLM group names in filter options', () => {
    cy.contains('button', 'WLM Group').click();
    cy.get('[role="option"]').should('contain', 'DEFAULT_WORKLOAD_GROUP');
    cy.get('[role="option"]').should('contain', 'ANALYTICS_GROUP');
  });

  it('navigates to WLM details when clicking group link', () => {
    cy.get('table tbody tr')
      .first()
      .within(() => {
        cy.get('td a').first().click();
      });
    cy.url().should('include', '/workloadManagement');
  });
});
