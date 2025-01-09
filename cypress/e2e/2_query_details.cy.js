/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import sampleDocument from '../fixtures/sample_document.json';
import { METRICS } from '../support/constants';

const indexName = 'sample_index';

const clearAll = () => {
  cy.deleteIndexByName(indexName);
  cy.disableTopQueries(METRICS.LATENCY);
  cy.disableTopQueries(METRICS.CPU);
  cy.disableTopQueries(METRICS.MEMORY);
};

describe('Top Queries Details Page', () => {
  beforeEach(() => {
    clearAll();
    cy.createIndexByName(indexName, sampleDocument);
    cy.enableTopQueries(METRICS.LATENCY);
    cy.enableTopQueries(METRICS.CPU);
    cy.enableTopQueries(METRICS.MEMORY);
    cy.searchOnIndex(indexName);
    cy.searchOnIndex(indexName);
    cy.searchOnIndex(indexName);
    // waiting for the query insights queue to drain
    cy.wait(10000);
    cy.navigateToOverview();
    cy.get('.euiTableRow').first().find('button').click(); // Navigate to details
  });

  it('should display correct details on the query details page', () => {
    // cy.get('.euiBasicTable a').first().click(); // Navigate to details
    cy.url().should('include', '/query-details');
    // Validate the page title
    cy.get('h1').contains('Query details').should('be.visible');
    // Validate the summary section
    cy.get('[data-test-subj="query-details-summary-section"]').should('be.visible');
    // Validate the presence of latency chart
    cy.get('[data-test-subj="query-details-latency-chart"]').should('be.visible');
    // Validate the presence of query source details section
    cy.get('[data-test-subj="query-details-source-section"]').should('be.visible');
  });

  /**
   * Validate summary panel has valid labels
   */
  it('the summary panel should display correctly', () => {
    // Validate all field labels exist
    const fieldLabels = [
      'Timestamp',
      'Latency',
      'CPU Time',
      'Memory Usage',
      'Indices',
      'Search type',
      'Coordinator node ID',
      'Total shards',
    ];
    fieldLabels.forEach((label) => {
      cy.get('.euiPanel').contains('h4', label).should('be.visible');
    });
  });

  /**
   * Validate each field in the summary panel has valid content
   */
  it('should display correct values for all fields in the summary panel', () => {
    cy.get('[data-test-subj="query-details-summary-section"]').within(() => {
      // Validate Timestamp
      cy.contains('h4', 'Timestamp')
        .parent()
        .next()
        .invoke('text')
        .should('match', /\w{3} \d{2}, \d{4} @ \d{1,2}:\d{2}:\d{2} [AP]M/);
      // Validate Latency
      cy.contains('h4', 'Latency')
        .parent()
        .next()
        .invoke('text')
        .should('match', /^\d+ ms$/);
      // Validate CPU Time
      cy.contains('h4', 'CPU Time')
        .parent()
        .next()
        .invoke('text')
        .should('match', /^\d+(\.\d+)? ms$/);
      // Validate Memory Usage
      cy.contains('h4', 'Memory Usage')
        .parent()
        .next()
        .invoke('text')
        .should('match', /^\d+ B$/);
      // Validate Indices
      cy.contains('h4', 'Indices').parent().next().invoke('text').should('not.be.empty');
      // Validate Search Type
      cy.contains('h4', 'Search type')
        .parent()
        .next()
        .invoke('text')
        .should('equal', 'query then fetch');
      // Validate Coordinator Node ID
      cy.contains('h4', 'Coordinator node ID')
        .parent()
        .next()
        .invoke('text')
        .should('not.be.empty');
      // Validate Total Shards
      cy.contains('h4', 'Total shards')
        .parent()
        .next()
        .invoke('text')
        .then((text) => {
          const shardCount = parseInt(text.trim(), 10);
          expect(shardCount).to.be.a('number').and.to.be.greaterThan(0);
        });
    });
  });

  /**
   * Validate the latency chart interaction
   */
  it('should render the latency chart and allow interaction', () => {
    // Ensure the chart is visible
    cy.get('#latency').should('be.visible');
    cy.get('.plot-container').should('be.visible');
    // Simulate hover over the chart for a data point
    cy.get('#latency').trigger('mousemove', { clientX: 100, clientY: 100 });
  });

  after(() => clearAll());
});