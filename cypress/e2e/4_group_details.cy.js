/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import sampleDocument from '../fixtures/sample_document.json';

const indexName = 'sample_index';

const clearAll = () => {
  cy.deleteIndexByName(indexName);
  cy.disableGrouping();
};

describe('Query Group Details Page', () => {
  beforeEach(() => {
    clearAll();
    cy.wait(5000);
    cy.createIndexByName(indexName, sampleDocument);
    cy.enableGrouping();
    // waiting for the query insights to stablize
    cy.wait(5000);
    cy.searchOnIndex(indexName);
    cy.searchOnIndex(indexName);
    cy.searchOnIndex(indexName);
    // waiting for the query insights queue to drain
    cy.wait(10000);
    cy.navigateToOverview();
    cy.get('.euiTableRow').first().find('button').first().trigger('mouseover');
    cy.wait(1000);
    // Click the first button in the 'group' row
    cy.get('.euiTableRow').first().find('button').first().click(); // Navigate to details
    cy.wait(1000);
  });

  it('should display correct details on the group details page', () => {
    cy.url().should('include', '/query-group-details');
    // Validate the page title
    cy.get('h1').contains('Query group details').should('be.visible');

    // Validate tooltip for query group details
    cy.get('[aria-label="Details tooltip"]').eq(0).should('be.visible');

    // Validate the Sample Query Details section
    cy.get('h1').contains('Sample query details').should('be.visible');

    // Validate tooltip for sample query details
    cy.get('[aria-label="Details tooltip"]').eq(1).should('be.visible');

    // Validate the presence of query source section
    cy.get('.euiPanel').contains('Query').should('be.visible');

    // Validate the presence of the latency chart
    cy.get('#latency').should('be.visible');
  });

  it('should validate the aggregate summary fields', () => {
    const expectedLabels = [
      'Id',
      'Average Latency',
      'Average CPU Time',
      'Average Memory Usage',
      'Group by',
    ];

    // Validate all field labels exist in the first EuiPanel
    cy.get('.euiPanel')
      .first()
      .within(() => {
        expectedLabels.forEach((label) => {
          cy.contains('h4', label).should('be.visible');
        });
      });
  });

  it('should validate the sample query summary panel fields', () => {
    const expectedLabels = [
      'Timestamp',
      'Indices',
      'Search Type',
      'Coordinator Node ID',
      'Total Shards',
    ];

    // Validate all field labels exist in the second EuiPanel
    cy.get('.euiPanel')
      .eq(1)
      .within(() => {
        expectedLabels.forEach((label) => {
          cy.contains('h4', label).should('be.visible');
        });
      });
  });

  it('should display the query source code block', () => {
    // Validate the query source code block
    cy.get('.euiCodeBlock').should('be.visible');
  });

  it('should display the latency panel correctly', () => {
    // Validate the fourth EuiPanel contains the Latency section
    cy.get('.euiPanel')
      .eq(3)
      .within(() => {
        cy.contains('h2', 'Latency').should('be.visible');
        cy.get('#latency').should('be.visible');
      });
  });

  after(() => clearAll());
});
