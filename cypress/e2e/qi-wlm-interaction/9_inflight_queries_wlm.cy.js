/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

describe('Inflight Queries Dashboard - WLM Enabled', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/live_queries*', { fixture: 'stub_live_queries.json' }).as('liveQueries');
    cy.intercept('GET', '/api/_wlm/stats*', { fixture: 'stub_wlm_stats.json' }).as('wlmStats');
    cy.intercept('GET', '/api/_wlm/workload_group*', {
      statusCode: 200,
      body: {
        workload_groups: [
          { _id: 'DEFAULT_WORKLOAD_GROUP', name: 'Default Group' },
          { _id: 'ANALYTICS_WORKLOAD_GROUP', name: 'Analytics Team' }
        ]
      }
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
        cy.get('a')
          .contains(/ANALYTICS_WORKLOAD_GROUP|DEFAULT_QUERY_GROUP|SEARCH_WORKLOAD_GROUP/)
          .should('exist')
          .and('be.visible');
      });
  });

  it('calls different API when WLM group selection changes', () => {
    cy.get('[aria-label="Workload group selector"]').select('ANALYTICS_WORKLOAD_GROUP');
    return cy.wait('@liveQueries').then((interception) => {
      expect(interception.request.url).to.include('wlmGroupId=ANALYTICS_WORKLOAD_GROUP');
    });
  });

  it('displays total completion, cancellation, and rejection metrics correctly', () => {
    cy.contains('Total completions').should('be.visible');
    cy.contains('Total cancellations').should('be.visible');
    cy.contains('Total rejections').should('be.visible');
    cy.contains('Total completions')
      .parent()
      .within(() => {
        cy.get('h2').should('contain.text', /^\d+$/).and('be.visible');
      });
    cy.contains('Total cancellations')
      .parent()
      .within(() => {
        cy.get('h2').should('contain.text', /^\d+$/).and('be.visible');
      });
    cy.contains('Total rejections')
      .parent()
      .within(() => {
        cy.get('h2').should('contain.text', /^\d+$/).and('be.visible');
      });
  });

  it('updates metrics when WLM group filter changes', () => {
    cy.contains('Total completions')
      .parent()
      .within(() => {
        cy.get('h2').invoke('text').as('initialCompletions');
      });
    cy.get('[aria-label="Workload group selector"]').select('All workload groups');
    cy.wait('@wlmStats');
    cy.contains('Total completions')
      .parent()
      .within(() => {
        cy.get('h2').should('be.visible');
      });
  });

  it('navigates to WLM details when clicking WLM group link', () => {
    cy.get('table tbody tr')
      .first()
      .within(() => {
        cy.get('a')
          .contains(/ANALYTICS_WORKLOAD_GROUP|DEFAULT_QUERY_GROUP|SEARCH_WORKLOAD_GROUP/)
          .should('be.visible')
          .click();
      });
    cy.url().should('include', '/workloadManagement');
    cy.url().should('include', 'wlm-details');
  });

  it('shows workload group selector with mapped names', () => {
    cy.contains('.euiBadge', 'Workload group').should('be.visible');
    cy.get('[aria-label="Workload group selector"] option').should('contain', 'ANALYTICS_WORKLOAD_GROUP');
    cy.get('[aria-label="Workload group selector"] option').should('contain', 'DEFAULT_QUERY_GROUP');
  });

  it('displays WLM stats panels when group is selected', () => {
    cy.contains('Total completions').should('be.visible');
    cy.contains('Total cancellations').should('be.visible');
    cy.contains('Total rejections').should('be.visible');
  });
});
