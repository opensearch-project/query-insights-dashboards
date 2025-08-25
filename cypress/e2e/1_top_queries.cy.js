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
  cy.disableGrouping();
};

describe('Query Insights Dashboard', () => {
  // Setup before each test
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
    cy.waitForQueryInsightsPlugin();
  });

  /**
   * Validate the main overview page loads correctly
   */
  it('should display the main overview page', () => {
    // Verify the page title is visible (already loaded by waitForQueryInsightsPlugin)
    cy.contains('Query insights - Top N queries').should('be.visible');

    // Verify the URL is correct
    cy.url().should('include', '/queryInsights');

    // Verify the table is visible and has content
    cy.get('.euiBasicTable').should('be.visible');
    cy.get('.euiTableHeaderCell').should('have.length.greaterThan', 0);

    // Verify there are query rows in the table
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
    cy.get('.euiTableRow').should('have.length.greaterThan', 0);
  });

  it('should display a message when no top queries are found', () => {
    clearAll();
    cy.wait(10000);
    cy.reload();
    cy.contains('No items found');
  });

  it('should paginate the query table', () => {
    for (let i = 0; i < 20; i++) {
      cy.searchOnIndex(indexName);
    }
    cy.wait(10000);
    cy.reload();
    cy.get('.euiPagination').should('be.visible');
    cy.get('.euiPagination__item').contains('2').click();
    // Verify rows on the second page
    cy.get('.euiTableRow').should('have.length.greaterThan', 0);
  });

  it('should get minimal details of the query using verbose=false', () => {
    const to = new Date().toISOString();
    const from = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    return cy
      .request({
        method: 'GET',
        url: `/api/top_queries/latency`,
        qs: {
          from: from,
          to: to,
          verbose: false,
        },
      })
      .then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('ok', true);

        const responseData = response.body.response;
        expect(responseData).to.have.property('top_queries');
        expect(responseData.top_queries).to.be.an('array');
        expect(responseData.top_queries.length).to.be.greaterThan(0);

        const firstQuery = responseData.top_queries[0];
        const requiredFields = [
          'group_by',
          'id',
          'indices',
          'labels',
          'measurements',
          'node_id',
          'search_type',
          'timestamp',
          'total_shards',
        ];

        expect(firstQuery).to.include.all.keys(requiredFields);
        const typeValidations = {
          group_by: 'string',
          id: 'string',
          indices: 'array',
          labels: 'object',
          measurements: 'object',
          node_id: 'string',
          search_type: 'string',
          timestamp: 'number',
          total_shards: 'number',
        };
        Object.entries(typeValidations).forEach(([field, type]) => {
          expect(firstQuery[field]).to.be.a(type, `${field} should be a ${type}`);
        });
        expect(firstQuery.measurements).to.have.all.keys(['cpu', 'latency', 'memory']);
        ['cpu', 'latency', 'memory'].forEach((metric) => {
          expect(firstQuery.measurements[metric]).to.be.an('object');
        });
      });

    after(() => clearAll());
  });
});

describe('Query Insights Dashboard - Dynamic Columns with intercepted data', () => {
  // helpers (JS only)
  const expectHeaders = (expected) => {
    cy.get('.euiTableHeaderCell').should('have.length', expected.length);
    cy.get('.euiTableHeaderCell').should(($h) => {
      const actual = $h.map((_, el) => Cypress.$(el).text().trim()).get();
      expect(actual).to.deep.equal(expected);
    });
  };

  const expectRowCountFromFixture = (fixtureName, groupBy) => {
    cy.fixture(fixtureName).then((data) => {
      const resp = (data && data.response) || data || {};
      const list = resp.top_queries || [];
      const filtered = groupBy ? list.filter((t) => t.group_by === groupBy) : list;
      const unique = [...new Set(filtered.map((t) => t.id))];
      cy.get('.euiBasicTable .euiTableRow').should('have.length', unique.length);
    });
  };

  const testMetricSorting = (label, colIndex) => {
    cy.get('.euiTableHeaderCell').contains(label).click();
    cy.get('.euiTableRow').then(($rows) => {
      const vals = [...$rows].map(($r) => {
        const raw = Cypress.$($r).find('td').eq(colIndex).text().trim();
        return parseFloat(raw.replace(/[^\d.]/g, ''));
      });
      expect(vals).to.deep.equal([...vals].sort((a, b) => a - b));
    });
    cy.get('.euiTableHeaderCell').contains(label).click();
    cy.get('.euiTableRow').then(($rows) => {
      const vals = [...$rows].map(($r) => {
        const raw = Cypress.$($r).find('td').eq(colIndex).text().trim();
        return parseFloat(raw.replace(/[^\d.]/g, ''));
      });
      expect(vals).to.deep.equal([...vals].sort((a, b) => b - a));
    });
  };

  describe('mixed data (stub_top_queries.json) + explicit Type filters', () => {
    beforeEach(() => {
      cy.fixture('stub_top_queries.json').then((stub) => {
        cy.intercept('GET', '**/api/top_queries/*', { statusCode: 200, body: stub }).as(
          'getTopQueries'
        );
      });
      cy.waitForQueryInsightsPlugin();
      cy.wait('@getTopQueries');
    });

    it('shows only query headers when Type → query is applied, and row count matches', () => {
      cy.get('.euiFilterButton').contains('Type').click();
      cy.get('.euiFilterSelectItem').contains('query').click();
      cy.get('body').click(0, 0); // close popover

      const expected = [
        'Id',
        'Type',
        'Timestamp',
        'Latency',
        'CPU Time',
        'Memory Usage',
        'Indices',
        'Search Type',
        'Coordinator Node ID',
        'Total Shards',
      ];
      expectHeaders(expected);
      expectRowCountFromFixture('stub_top_queries.json', 'NONE');

      testMetricSorting('Timestamp', 2);
      testMetricSorting('Latency', 3);
      testMetricSorting('CPU Time', 4);
      testMetricSorting('Memory Usage', 5);
    });

    it('shows only group headers when Type → group is applied, and row count matches', () => {
      cy.get('.euiFilterButton').contains('Type').click();
      cy.get('.euiFilterSelectItem').contains('group').click();
      cy.get('body').click(0, 0);

      const expected = [
        'Id',
        'Type',
        'Query Count',
        'Average Latency',
        'Average CPU Time',
        'Average Memory Usage',
      ];
      expectHeaders(expected);
      expectRowCountFromFixture('stub_top_queries.json', 'SIMILARITY');

      testMetricSorting('Query Count', 2);
      testMetricSorting('Average Latency', 3);
      testMetricSorting('Average CPU Time', 4);
      testMetricSorting('Average Memory Usage', 5);
    });

    it('shows mixed headers when both query & group are selected, and row count matches all unique IDs', () => {
      cy.get('.euiFilterButton').contains('Type').click();
      cy.get('.euiFilterSelectItem').contains('query').click();
      cy.get('.euiFilterSelectItem').contains('group').click();
      cy.get('body').click(0, 0);

      const expected = [
        'Id',
        'Type',
        'Query Count',
        'Timestamp',
        'Avg Latency / Latency',
        'Avg CPU Time / CPU Time',
        'Avg Memory Usage / Memory Usage',
        'Indices',
        'Search Type',
        'Coordinator Node ID',
        'Total Shards',
      ];
      expectHeaders(expected);
      expectRowCountFromFixture('stub_top_queries.json');

      testMetricSorting('Query Count', 2);
      testMetricSorting('Timestamp', 3);
      testMetricSorting('Avg Latency / Latency', 4);
      testMetricSorting('Avg CPU Time / CPU Time', 5);
      testMetricSorting('Avg Memory Usage / Memory Usage', 6);
    });
  });

  describe('query-only data (no Type filter selected)', () => {
    beforeEach(() => {
      cy.fixture('stub_top_queries_query_only.json').then((stub) => {
        cy.intercept('GET', '**/api/top_queries/*', { statusCode: 200, body: stub }).as(
          'getTopQueriesQ'
        );
      });
      cy.waitForQueryInsightsPlugin();
      cy.wait('@getTopQueriesQ');
    });

    it('defaults to query-only headers and correct row count', () => {
      const expected = [
        'Id',
        'Type',
        'Timestamp',
        'Latency',
        'CPU Time',
        'Memory Usage',
        'Indices',
        'Search Type',
        'Coordinator Node ID',
        'Total Shards',
      ];
      expectHeaders(expected);
      expectRowCountFromFixture('stub_top_queries_query_only.json');

      testMetricSorting('Timestamp', 2);
      testMetricSorting('Latency', 3);
      testMetricSorting('CPU Time', 4);
      testMetricSorting('Memory Usage', 5);
    });
  });

  describe('group-only data (no Type filter selected)', () => {
    beforeEach(() => {
      cy.fixture('stub_top_queries_group_only.json').then((stub) => {
        cy.intercept('GET', '**/api/top_queries/*', { statusCode: 200, body: stub }).as(
          'getTopQueriesG'
        );
      });
      cy.waitForQueryInsightsPlugin();
      cy.wait('@getTopQueriesG');
    });

    it('defaults to group-only headers and correct row count', () => {
      const expected = [
        'Id',
        'Type',
        'Query Count',
        'Average Latency',
        'Average CPU Time',
        'Average Memory Usage',
      ];
      expectHeaders(expected);
      expectRowCountFromFixture('stub_top_queries_group_only.json');

      testMetricSorting('Query Count', 2);
      testMetricSorting('Average Latency', 3);
      testMetricSorting('Average CPU Time', 4);
      testMetricSorting('Average Memory Usage', 5);
    });
  });
});

// Add below your existing "Dynamic Columns ..." suite

describe('Filters with intercepted data (mixed fixture)', () => {
  const FIXTURE = 'stub_top_queries.json';

  // helpers (JS only)
  const expectHeaders = (expected) => {
    cy.get('.euiTableHeaderCell').should('have.length', expected.length);
    cy.get('.euiTableHeaderCell').should(($h) => {
      const actual = $h.map((_, el) => Cypress.$(el).text().trim()).get();
      expect(actual).to.deep.equal(expected);
    });
  };

  const countRowsBy = (fixtureName, where = {}) => {
    cy.fixture(fixtureName).then((data) => {
      let list = (data && data.response && data.response.top_queries) || data.top_queries || [];
      if (where.groupBy) list = list.filter((t) => t.group_by === where.groupBy);
      if (where.indices) list = list.filter((t) => (t.indices || []).includes(where.indices));
      if (where.searchType) list = list.filter((t) => t.search_type === where.searchType);
      if (where.nodeId) list = list.filter((t) => t.node_id === where.nodeId);
      if (where.idIncludes)
        list = list.filter((t) => String(t.id || '').includes(where.idIncludes));
      const unique = [...new Set(list.map((t) => t.id))];
      cy.get('.euiBasicTable .euiTableRow').should('have.length', unique.length);
    });
  };

  const expectQueryHeaders = () =>
    expectHeaders([
      'Id',
      'Type',
      'Timestamp',
      'Latency',
      'CPU Time',
      'Memory Usage',
      'Indices',
      'Search Type',
      'Coordinator Node ID',
      'Total Shards',
    ]);

  beforeEach(() => {
    cy.fixture(FIXTURE).then((stub) => {
      cy.intercept('GET', '**/api/top_queries/*', { statusCode: 200, body: stub }).as(
        'getTopQueries'
      );
    });
    cy.waitForQueryInsightsPlugin();
    cy.wait('@getTopQueries');
  });

  it('filters by Indices → my-index (non-group filter forces query view)', () => {
    cy.get('.euiFilterButton').contains('Indices').click();
    cy.get('.euiFilterSelectItem').contains('my-index').click();
    cy.get('body').click(0, 0); // close popover

    expectQueryHeaders();
    countRowsBy(FIXTURE, { groupBy: 'NONE', indices: 'my-index' });
  });

  it('filters by Search Type → query_then_fetch (non-group filter forces query view)', () => {
    cy.get('.euiFilterButton').contains('Search Type').click();
    cy.get('.euiFilterSelectItem').contains('query_then_fetch').click();
    cy.get('body').click(0, 0);

    expectQueryHeaders();
    countRowsBy(FIXTURE, { groupBy: 'NONE', searchType: 'query_then_fetch' });
  });

  it('filters by Coordinator Node ID (non-group filter forces query view)', () => {
    // value from your stub fixture
    const NODE = 'UYKFun8PSAeJvkkt9cWf0w';

    cy.get('.euiFilterButton').contains('Coordinator Node ID').click();
    cy.get('.euiFilterSelectItem').contains(NODE).click();
    cy.get('body').click(0, 0);

    expectQueryHeaders();
    countRowsBy(FIXTURE, { groupBy: 'NONE', nodeId: NODE });
  });

  it('Type both selected, then apply Indices → should auto-switch back to query view', () => {
    cy.get('.euiFilterButton').contains('Type').click();
    cy.get('.euiFilterSelectItem').contains('query').click();
    cy.get('.euiFilterSelectItem').contains('group').click();
    cy.get('body').click(0, 0);

    cy.get('.euiFilterButton').contains('Indices').click();
    cy.get('.euiFilterSelectItem').contains('my-index').click();
    cy.get('body').click(0, 0);

    expectQueryHeaders(); // non-group filter active → query columns
    countRowsBy(FIXTURE, { groupBy: 'NONE', indices: 'my-index' });
  });

  it('free-text search by partial id → filters rows and keeps query view', () => {
    // pick a partial id from the stub; using "a2e1c822" from your sample
    const PARTIAL = 'a2e1c822';
    cy.get('.euiFieldSearch').type(PARTIAL);

    expectQueryHeaders();
    countRowsBy(FIXTURE, { groupBy: 'NONE', idIncludes: PARTIAL });

    // clear search resets (still using intercepted data)
    cy.get('.euiFieldSearch').clear();
    // should be > 0 rows again
    cy.get('.euiBasicTable .euiTableRow').its('length').should('be.greaterThan', 0);
  });

  it('can clear Indices filter (toggle off) and return to mixed default', () => {
    // apply
    cy.get('.euiFilterButton').contains('Indices').click();
    cy.get('.euiFilterSelectItem').contains('my-index').click();
    cy.get('body').click(0, 0);
    expectQueryHeaders();

    // clear by toggling same option again
    cy.get('.euiFilterButton').contains('Indices').click();
    cy.get('.euiFilterSelectItem').contains('my-index').click();
    cy.get('body').click(0, 0);

    // with mixed stub and no filters → the mixed header set should appear
    expectHeaders([
      'Id',
      'Type',
      'Query Count',
      'Timestamp',
      'Avg Latency / Latency',
      'Avg CPU Time / CPU Time',
      'Avg Memory Usage / Memory Usage',
      'Indices',
      'Search Type',
      'Coordinator Node ID',
      'Total Shards',
    ]);
  });
});
