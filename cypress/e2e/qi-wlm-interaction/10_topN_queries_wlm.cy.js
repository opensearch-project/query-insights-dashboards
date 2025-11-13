/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

describe('Top N Queries - WLM Integration', () => {
  beforeEach(() => {
    cy.visit('/app/query-insights-dashboards#/queryInsights');
    cy.wait(2000);
  });

  it('displays WLM Group column in Top N Queries table', () => {
    cy.get('table').should('exist');
    cy.contains('WLM Group').should('be.visible');

    // Verify WLM Group column shows group names
    cy.get('table tbody tr')
      .first()
      .within(() => {
        cy.get('td')
          .contains(/DEFAULT_WORKLOAD_GROUP|ANALYTICS_GROUP|SEARCH_GROUP/)
          .should('exist');
      });
  });

  it('filters queries by WLM group using filter dropdown', () => {
    // Open WLM Group filter
    cy.contains('button', 'WLM Group').click();
    cy.get('[role="option"]').contains('DEFAULT_WORKLOAD_GROUP').click();

    // Verify filtered results
    cy.get('table tbody tr').each(($row) => {
      cy.wrap($row).should('contain', 'DEFAULT_WORKLOAD_GROUP');
    });
  });

  it('handles WLM group URL parameter for filtering', () => {
    // Visit with WLM group parameter
    cy.visit('/app/query-insights-dashboards#/queryInsights?wlmGroupId=ANALYTICS_GROUP');
    cy.wait(2000);

    // Verify filter is applied
    cy.get('table tbody tr').should('have.length.greaterThan', 0);
    cy.get('table tbody tr').each(($row) => {
      cy.wrap($row).should('contain', 'ANALYTICS_GROUP');
    });
  });

  it('displays mapped WLM group names instead of IDs', () => {
    // Intercept workload groups API
    cy.intercept('GET', '/api/_wlm/workload_group*', {
      statusCode: 200,
      body: {
        workload_groups: [
          { _id: 'DEFAULT_WORKLOAD_GROUP', name: 'Default Group' },
          { _id: 'ANALYTICS_GROUP', name: 'Analytics Team' },
          { _id: 'SEARCH_GROUP', name: 'Search Team' },
        ],
      },
    }).as('getWorkloadGroups');

    cy.reload();
    cy.wait('@getWorkloadGroups');

    // Verify mapped names are displayed
    cy.get('table tbody tr')
      .first()
      .within(() => {
        cy.get('td').should('contain.text', /Default Group|Analytics Team|Search Team/);
      });
  });

  it('shows WLM group filter options with mapped names', () => {
    // Intercept workload groups API
    cy.intercept('GET', '/api/_wlm/workload_group*', {
      statusCode: 200,
      body: {
        workload_groups: [
          { _id: 'DEFAULT_WORKLOAD_GROUP', name: 'Default Group' },
          { _id: 'ANALYTICS_GROUP', name: 'Analytics Team' },
        ],
      },
    }).as('getWorkloadGroups');

    cy.reload();
    cy.wait('@getWorkloadGroups');

    // Open WLM Group filter
    cy.contains('button', 'WLM Group').click();

    // Verify filter options show mapped names
    cy.get('[role="option"]').should('contain', 'Default Group');
    cy.get('[role="option"]').should('contain', 'Analytics Team');
  });

  it('searches queries by WLM group using search box', () => {
    // Use search box to filter by WLM group
    cy.get('input[placeholder="Search queries"]').type('wlm_group_id:(DEFAULT_WORKLOAD_GROUP)');
    cy.wait(1000);

    // Verify search results
    cy.get('table tbody tr').should('have.length.greaterThan', 0);
    cy.get('table tbody tr').each(($row) => {
      cy.wrap($row).should('contain', 'DEFAULT_WORKLOAD_GROUP');
    });
  });

  it('clears WLM group filter correctly', () => {
    // Apply WLM group filter
    cy.contains('button', 'WLM Group').click();
    cy.get('[role="option"]').contains('DEFAULT_WORKLOAD_GROUP').click();

    // Clear filter
    cy.get('[data-test-subj="clearFiltersButton"]').click();

    // Verify all queries are shown
    cy.get('table tbody tr').should('have.length.greaterThan', 1);
  });

  it('combines WLM group filter with other filters', () => {
    // Apply WLM group filter
    cy.contains('button', 'WLM Group').click();
    cy.get('[role="option"]').first().click();

    // Apply another filter (e.g., Type)
    cy.contains('button', 'Type').click();
    cy.get('[role="option"]').contains('query').click();

    // Verify both filters are applied
    cy.get('table tbody tr').should('have.length.greaterThan', 0);
  });

  it('displays WLM group as clickable link when WLM is installed', () => {
    // Mock WLM availability
    cy.intercept('GET', '/api/_wlm/workload_group*', {
      statusCode: 200,
      body: {
        workload_groups: [
          { _id: 'DEFAULT_WORKLOAD_GROUP', name: 'Default Group' },
          { _id: 'ANALYTICS_GROUP', name: 'Analytics Team' },
        ],
      },
    }).as('getWorkloadGroups');

    cy.reload();
    cy.wait('@getWorkloadGroups');

    // Verify WLM group is displayed as clickable link
    cy.get('table tbody tr')
      .first()
      .within(() => {
        cy.get('td a')
          .contains(/Default Group|Analytics Team/)
          .should('exist');
        cy.get('td a').should('have.attr', 'href').and('not.be.empty');
      });
  });

  it('navigates to WLM details when clicking WLM group link', () => {
    // Mock WLM availability
    cy.intercept('GET', '/api/_wlm/workload_group*', {
      statusCode: 200,
      body: {
        workload_groups: [{ _id: 'DEFAULT_WORKLOAD_GROUP', name: 'Default Group' }],
      },
    }).as('getWorkloadGroups');

    cy.reload();
    cy.wait('@getWorkloadGroups');

    // Click on WLM group link
    cy.get('table tbody tr')
      .first()
      .within(() => {
        cy.get('td a').contains('Default Group').click();
      });

    // Verify navigation to WLM details
    cy.url().should('include', '/workloadManagement');
    cy.url().should('include', 'wlm-details');
  });

  it('displays WLM group as plain text when WLM is not available', () => {
    // Mock WLM unavailability
    cy.intercept('GET', '/api/_wlm/workload_group*', {
      statusCode: 404,
    }).as('getWorkloadGroupsError');

    cy.reload();
    cy.wait('@getWorkloadGroupsError');

    // Verify WLM group is displayed as plain text
    cy.get('table tbody tr')
      .first()
      .within(() => {
        cy.get('td')
          .contains(/DEFAULT_WORKLOAD_GROUP|ANALYTICS_GROUP/)
          .should('not.have.attr', 'href');
        cy.get('td a').should('not.exist');
      });
  });
});
