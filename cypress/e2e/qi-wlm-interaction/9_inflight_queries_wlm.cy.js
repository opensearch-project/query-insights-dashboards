/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

describe('Inflight Queries Dashboard - WLM Enabled', () => {
  beforeEach(() => {
    cy.visit('/app/query-insights-dashboards#/LiveQueries');
    cy.wait(2000);
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
          .contains(/DEFAULT_WORKLOAD_GROUP|ANALYTICS_GROUP|SEARCH_GROUP/)
          .should('exist')
          .and('be.visible');
      });
  });

  it('calls different API when WLM group selection changes', () => {
    // Intercept API calls
    cy.intercept('GET', '/api/live_queries*').as('liveQueriesAPI');
    cy.intercept('GET', '/api/_wlm/stats*').as('wlmStatsAPI');

    // Initial load
    cy.wait('@liveQueriesAPI');
    cy.wait('@wlmStatsAPI');

    // Change WLM group selection
    cy.get('[aria-label="Workload group selector"]').should('exist');
    cy.get('[aria-label="Workload group selector"]').select('DEFAULT_WORKLOAD_GROUP');

    // Verify API is called with new parameters
    return cy.wait('@liveQueriesAPI').then((interception) => {
      expect(interception.request.url).to.include('wlmGroupId=DEFAULT_WORKLOAD_GROUP');
    });
    cy.wait('@wlmStatsAPI');
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
    // Intercept WLM stats API
    cy.intercept('GET', '/api/_wlm/stats*').as('wlmStats');

    // Get initial completion count
    cy.contains('Total completions')
      .parent()
      .within(() => {
        cy.get('h2').invoke('text').as('initialCompletions');
      });

    // Change WLM group filter
    cy.get('[aria-label="Workload group selector"]').select('All workload groups');
    cy.wait('@wlmStats');

    // Verify metrics updated
    cy.contains('Total completions')
      .parent()
      .within(() => {
        cy.get('h2').invoke('text').should('not.equal', '@initialCompletions').and('be.visible');
      });
  });

  it('navigates to WLM details when clicking WLM group link', () => {
    // Click on a WLM group link in the table
    cy.get('table tbody tr')
      .first()
      .within(() => {
        cy.get('a')
          .contains(/DEFAULT_WORKLOAD_GROUP|ANALYTICS_GROUP|SEARCH_GROUP/)
          .should('be.visible')
          .click();
      });

    // Verify navigation to WLM details page
    cy.url().should('include', '/workloadManagement');
    cy.url().should('include', 'wlm-details');
  });
});
