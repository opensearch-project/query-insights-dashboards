/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import sampleDocument from '../fixtures/sample_document.json';
import { METRICS } from '../support/constants';

// Name of the test index used in tests
const indexName = 'sample_index';

/**
  Helper function to clean up the environment:
  - Deletes the test index.
  - Disables the top queries features.
 */
const clearAll = () => {
  cy.deleteIndexByName(indexName);
  cy.disableTopQueries(METRICS.LATENCY);
  cy.disableTopQueries(METRICS.CPU);
  cy.disableTopQueries(METRICS.MEMORY);
};

describe('Query Insights Dashboard', () => {
  // // Setup before each test
  beforeEach(() => {
    clearAll();
    cy.createIndexByName(indexName, sampleDocument);
    cy.enableTopQueries(METRICS.LATENCY);
    cy.enableTopQueries(METRICS.CPU);
    cy.enableTopQueries(METRICS.MEMORY);
    cy.searchOnIndex(indexName);
    // wait for 1s to avoid same timestamp
    cy.wait(1000);
    cy.searchOnIndex(indexName);
    cy.wait(1000);
    cy.searchOnIndex(indexName);
    // waiting for the query insights queue to drain
    cy.wait(10000);
    cy.navigateToOverview();
  });

  /**
   * Validate the main overview page loads correctly
   */
  it('should display the main overview page', () => {
    cy.get('.euiBasicTable').should('be.visible');
    cy.contains('Query insights - Top N queries');
    cy.url().should('include', '/queryInsights');

    // should display the query table on the overview page
    cy.get('.euiBasicTable').should('be.visible');
    cy.get('.euiTableHeaderCell').should('have.length.greaterThan', 0);
    // should have top n queries displayed on the table
    cy.get('.euiTableRow').should('have.length.greaterThan', 0);
  });

  /**
   * Validate sorting by the "Timestamp" column works correctly
   */
  it('should sort the table by the Timestamp column', () => {
    // waiting for the query insights queue to drain
    cy.wait(10000);
    cy.navigateToOverview();
    // Click the Timestamp column header to sort
    cy.get('.euiTableHeaderCell').contains('Timestamp').click();
    // eslint-disable-next-line jest/valid-expect-in-promise
    cy.get('.euiTableRow')
      .first()
      .invoke('text')
      .then((firstRowAfterSort) => {
        const firstTimestamp = firstRowAfterSort.trim();
        cy.get('.euiTableHeaderCell').contains('Timestamp').click();
        // eslint-disable-next-line jest/valid-expect-in-promise
        cy.get('.euiTableRow')
          .first()
          .invoke('text')
          .then((firstRowAfterSecondSort) => {
            expect(firstRowAfterSecondSort.trim()).to.not.equal(firstTimestamp);
          });
      });
  });

  /**
   * Validate pagination works as expected
   */
  it('should paginate the query table', () => {
    for (let i = 0; i < 20; i++) {
      cy.searchOnIndex(indexName);
    }
    // waiting for the query insights queue to drain
    cy.wait(10000);
    cy.reload();
    cy.get('.euiPagination').should('be.visible');
    cy.get('.euiPagination__item').contains('2').click();
    // Verify rows on the second page
    cy.get('.euiTableRow').should('have.length.greaterThan', 0);
  });

  it('should switch between tabs', () => {
    // Click Configuration tab
    cy.getElementByText('.euiTab', 'Configuration').click({ force: true });
    cy.contains('Query insights - Configuration');
    cy.url().should('include', '/configuration');

    // Click back to Query Insights tab
    cy.getElementByText('.euiTab', 'Top N queries').click({ force: true });
    cy.url().should('include', '/queryInsights');
  });

  it('should filter queries', () => {
    cy.get('.euiFieldSearch').should('be.visible');
    cy.get('.euiFieldSearch').type('sample_index');
    // Add assertions for filtered results
    cy.get('.euiTableRow').should('have.length.greaterThan', 0);
  });

  it('should clear the search input and reset results', () => {
    cy.get('.euiFieldSearch').type('random_string');
    cy.get('.euiTableRow').should('have.length.greaterThan', 0);
    cy.get('.euiFieldSearch').clear();
    cy.get('.euiTableRow').should('have.length.greaterThan', 0); // Validate reset
  });

  it('should display a message when no top queries are found', () => {
    clearAll(); // disable top n queries
    // waiting for the query insights queue to drain
    cy.wait(10000);
    cy.reload();
    cy.contains('No items found');
  });

  it('should render the expected column headers by default', () => {
    const expectedHeaders = [
      'ID',
      'Type',
      'Query Count',
      'Latency',
      'CPU Time',
      'Memory Usage',
      'Timestamp',
      'Indices',
      'Search Type',
      'Node ID',
      'Total Shards',
    ];

    // Wait for the table to load by checking if headers are visible
    cy.get('.euiTableHeaderCell').should('have.length.greaterThan', 6);

    // Verify each expected header exists
    expectedHeaders.forEach((header) => {
      cy.contains('.euiTableHeaderCell', header).should('exist');
    });
  });

  it('should render only individual query-related headers when NONE filter is applied', () => {
    cy.get('.euiFilterButton').contains('Type').click();
    cy.get('.euiFilterSelectItem').contains('query').click();

    // Wait for table update
    cy.get('.euiTableHeaderCell').should('have.length.greaterThan', 6);

    const expectedHeaders = [
      'ID',
      'Type',
      'Query Count',
      'Latency',
      'CPU Time',
      'Memory Usage',
      'Timestamp',
      'Indices',
      'Search Type',
      'Node ID',
      'Total Shards',
    ];

    expectedHeaders.forEach((header) => {
      cy.contains('.euiTableHeaderCell', header).should('exist');
    });
  });
  beforeEach(() => {
    clearAll();
    cy.createIndexByName(indexName, sampleDocument);

    cy.enableTopQueries(METRICS.LATENCY);
    cy.enableTopQueries(METRICS.CPU);
    cy.enableTopQueries(METRICS.MEMORY);

    cy.enableTopQueries('SIMILARITY');

    cy.searchOnIndex(indexName);
    cy.wait(1000);
    cy.searchOnIndex(indexName);
    cy.wait(1000);
    cy.searchOnIndex(indexName);

    cy.wait(10000); // Waiting for query queue to drain

    cy.navigateToOverview();
  });
  it('should render only group-related headers when SIMILARITY filter is applied', () => {
    cy.get('.euiFilterButton').contains('Type').click();
    cy.get('.euiFilterSelectItem').contains('group').click();

    // Wait for table update
    cy.get('.euiTableHeaderCell').should('have.length.lessThan', 20);

    const expectedHeaders = ['Id', 'Type', 'Query Count', 'Latency', 'CPU Time', 'Memory Usage'];

    expectedHeaders.forEach((header) => {
      cy.contains('.euiTableHeaderCell', header).should('exist');
    });
  });

  after(() => clearAll());
});
