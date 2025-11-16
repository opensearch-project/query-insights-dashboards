/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

describe('Inflight Queries Dashboard - WLM Enabled', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/live_queries*', { fixture: 'stub_live_queries.json' }).as('liveQueries');
    cy.intercept('GET', '/api/_wlm/stats*', { fixture: 'stub_wlm_stats.json' }).as('wlmStats');
    cy.visit('/app/query-insights-dashboards#/LiveQueries');
    cy.wait(['@liveQueries', '@wlmStats']);
  });

  it('displays WLM group links when WLM is enabled', () => {
    // Check if WLM group column exists
    cy.get('table').should('exist');
    cy.contains('WLM Group').should('be.visible');

    // Check if WLM group links are clickable
    cy.get('table tbody tr')
      .first()
      .within(() => {
        cy.get('a')
          .contains(/DEFAULT_QUERY_GROUP|ANALYTICS_WORKLOAD_GROUP|SEARCH_WORKLOAD_GROUP/)
          .should('exist')
          .and('be.visible');
      });
  });

  it('calls different API when WLM group selection changes', () => {
    cy.get('[aria-label="Workload group selector"]').select('DEFAULT_QUERY_GROUP');
    cy.wait('@liveQueries').then((interception) => {
      expect(interception.request.url).to.include('wlmGroupId=DEFAULT_QUERY_GROUP');
    });
  });

  it('displays total completion, cancellation, and rejection metrics correctly', () => {
    // Check if WLM stats panels exist
    cy.contains('Total completions').should('be.visible');
    cy.contains('Total cancellations').should('be.visible');
    cy.contains('Total rejections').should('be.visible');

    // Verify metrics display numbers
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
        cy.get('h2').invoke('text').should('not.equal', '@initialCompletions');
      });
  });

  it('navigates to WLM details when clicking WLM group link', () => {
    // Click on a WLM group link in the table
    cy.get('table tbody tr')
      .first()
      .within(() => {
        cy.get('a')
          .contains(/DEFAULT_QUERY_GROUP|ANALYTICS_WORKLOAD_GROUP|SEARCH_WORKLOAD_GROUP/)
          .should('be.visible')
          .click();
      });

    // Verify navigation to WLM details page
    cy.url().should('include', '/workloadManagement');
    cy.url().should('include', 'wlm-details');
  });
});
