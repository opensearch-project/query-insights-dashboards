/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

describe('Inflight Queries Dashboard - WLM Enabled', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/live_queries*', { fixture: 'stub_live_queries.json' }).as(
      'liveQueries'
    );
    cy.intercept('GET', '/api/_wlm/stats*', {
      statusCode: 200,
      body: {
        node1: {
          workload_groups: {
            ANALYTICS_WORKLOAD_GROUP: {
              total_completions: 10,
              total_cancellations: 0,
              total_rejections: 0,
            },
          },
        },
      },
    }).as('wlmStats');
    cy.intercept('GET', '/api/_wlm/workload_group*', {
      statusCode: 200,
      body: {
        workload_groups: [{ _id: 'ANALYTICS_WORKLOAD_GROUP', name: 'Analytics Team' }],
      },
    }).as('wlmGroups');
    cy.visit('/app/query-insights-dashboards#/LiveQueries');
    cy.wait(['@liveQueries', '@wlmStats', '@wlmGroups']);
  });

  it('displays WLM group links when WLM is enabled', () => {
    cy.get('table').should('exist');
    cy.contains('WLM Group').should('be.visible');
    cy.get('table tbody tr')
      .first()
      .within(() => {
        cy.get('button')
          .contains(/ANALYTICS_WORKLOAD_GROUP|DEFAULT_QUERY_GROUP|SEARCH_WORKLOAD_GROUP/)
          .should('exist')
          .and('be.visible');
      });
  });

  it('calls different API when WLM group selection changes', () => {
    cy.get('[aria-label="Workload group selector"]').select('ANALYTICS_WORKLOAD_GROUP');
    cy.wait('@liveQueries');
    cy.wait('@wlmStats');
  });

  it('displays total completion, cancellation, and rejection metrics correctly', () => {
    cy.contains('Total completions').should('be.visible');
    cy.contains('Total cancellations').should('be.visible');
    cy.contains('Total rejections').should('be.visible');
    cy.contains('Total completions')
      .closest('.euiPanel')
      .within(() => {
        cy.get('h2').should('be.visible');
      });
    cy.contains('Total cancellations')
      .closest('.euiPanel')
      .within(() => {
        cy.get('h2').should('be.visible');
      });
    cy.contains('Total rejections')
      .closest('.euiPanel')
      .within(() => {
        cy.get('h2').should('be.visible');
      });
  });

  it('shows workload group selector with mapped names', () => {
    cy.contains('.euiBadge', 'Workload group').should('be.visible');
    cy.get('[aria-label="Workload group selector"]').should('be.visible');
  });
});
