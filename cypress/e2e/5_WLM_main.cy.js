/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

describe('WLM Main Page', () => {
  beforeEach(() => {
    cy.visit('/app/workload-management#/workloadManagement');
    cy.get('.euiBasicTable .euiTableRow').should('have.length.greaterThan', 0);
  });

  it('should display the WLM page with the workload group table', () => {
    cy.contains('Workload groups').should('be.visible');
    cy.get('.euiBasicTable').should('exist');
    cy.get('.euiTableRow').should('have.length.greaterThan', 0);
  });

  it('should filter workload groups with the search bar', () => {
    cy.get('.euiFieldSearch').type('DEFAULT_QUERY_GROUP');
    cy.get('.euiTableRow').should('have.length.at.least', 1);
    cy.get('.euiFieldSearch').clear();
    cy.get('.euiTableRow').should('have.length.greaterThan', 0);
  });

  it('should refresh stats on clicking the refresh button', () => {
    cy.get('button').contains('Refresh').click();
    cy.wait(3000);
    cy.get('.euiTableRow').should('have.length.greaterThan', 0);
  });

  it('should switch between nodes using dropdown', () => {
    cy.get('select').should('exist');
    cy.get('select option').then((options) => {
      if (options.length > 1) {
        cy.get('select').select(options[1].value);
        cy.wait(2000);
        cy.get('.euiTableRow').should('have.length.greaterThan', 0);
      }
    });
  });

  it('should not switch nodes if only one node is available', () => {
    cy.get('select').should('exist');
    cy.get('select option').then((options) => {
      if (options.length === 1) {
        cy.get('select').should('have.value', options[0].value);
        cy.get('.euiTableRow').should('have.length.greaterThan', 0);
      }
    });
  });

  it('should display the WLM main page with workload group table and summary stats', () => {
    // Confirm table exists
    cy.get('.euiBasicTable').should('be.visible');
    cy.get('.euiTableRow').should('have.length.greaterThan', 0);

    // Confirm stat cards exist
    const titles = [
      'Total workload groups',
      'Total groups exceeding limits',
      'Total completion',
      'Total rejections',
      'Total cancellations',
    ];

    titles.forEach((title) => {
      cy.contains(title).should('be.visible');
    });
  });

  it('should display CPU and memory usage tooltips on hover', () => {
    cy.get('.echarts-for-react')
      .first()
      .trigger('mouseover', { force: true })
      .then(() => {
        cy.get('.echarts-tooltip').should('exist').and('contain.text', 'Usage across nodes');
      });
  });

  it('should filter workload groups by name in search', () => {
    cy.get('.euiFieldSearch').type('DEFAULT_QUERY_GROUP');
    cy.get('.euiTableRow').should('contain.text', 'DEFAULT_QUERY_GROUP');
  });

  it('should route to workload group detail page when clicking a group name', () => {
    cy.get('.euiTableRow')
      .first()
      .within(() => {
        cy.get('a').first().click({ force: true });
      });

    cy.contains('Workload group name', { timeout: 10000 }).should('exist');
  });
});
