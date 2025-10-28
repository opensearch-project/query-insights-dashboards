/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import sampleDocument from '../../fixtures/sample_document.json';
import { METRICS } from '../../support/constants';

import MIXED from '../../fixtures/stub_top_queries.json';
import QUERY_ONLY from '../../fixtures/stub_top_queries_query_only.json';
import GROUP_ONLY from '../../fixtures/stub_top_queries_group_only.json';

const makeTimestampedBody = (raw) => {
  const body = JSON.parse(JSON.stringify(raw));
  const list = body?.response?.top_queries ?? body?.top_queries ?? [];
  const now = Date.now();
  body.response = body.response || {};
  body.response.top_queries = list.map((q, i) => ({ ...q, timestamp: now - i * 1000 }));
  return body;
};

const getRowsFromRaw = (raw) => (raw?.response?.top_queries ?? raw?.top_queries ?? []).slice();

const assertRowCountEquals = (expected) => {
  cy.get('.euiTableRow').should('have.length', expected);
};

const getHeaders = () =>
  cy.get('.euiTableHeaderCell').then(($h) =>
    $h
      .map((_, el) => Cypress.$(el).text().trim())
      .get()
      .filter(Boolean)
  );

const expectSortedBy = (label, colIdx) => {
  const extract = ($rows) =>
    [...$rows].map(($r) => {
      const txt = Cypress.$($r).find('td').eq(colIdx).text().trim();
      if (/ms|s|B|KB|MB|GB|TB/i.test(txt)) return parseFloat(txt.replace(/[^\d.]/g, '')) || 0;
      const ms = Date.parse(txt);
      if (!Number.isNaN(ms)) return ms;
      const num = parseFloat(txt.replace(/[^\d.-]/g, ''));
      return Number.isNaN(num) ? 0 : num;
    });

  cy.get('.euiTableHeaderCell').contains(label).click();
  cy.get('.euiTableRow').then(($r) => {
    const v = extract($r);
    const asc = [...v].sort((a, b) => a - b);
    expect(v, `${label} asc`).to.deep.equal(asc);
  });

  cy.get('.euiTableHeaderCell').contains(label).click();
  cy.get('.euiTableRow').then(($r) => {
    const v = extract($r);
    const desc = [...v].sort((a, b) => b - a);
    expect(v, `${label} desc`).to.deep.equal(desc);
  });
};

const norm = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();

const findFilterButton = (labels) => {
  const candidates = (Array.isArray(labels) ? labels : [labels]).map(norm);

  return cy.get('button.euiFilterButton').then(($btns) => {
    const found = [...$btns].find((btn) => {
      const txt = norm(btn.innerText);
      const aria = norm(btn.getAttribute('aria-label'));
      const title = norm(btn.getAttribute('title'));
      const subj = norm(btn.getAttribute('data-test-subj'));
      return candidates.some(
        (lab) =>
          txt.includes(lab) || aria.includes(lab) || title.includes(lab) || subj.includes(lab)
      );
    });

    if (!found) {
      const dump = [...$btns]
        .map(
          (el) =>
            norm(el.innerText) ||
            norm(el.getAttribute('aria-label')) ||
            norm(el.getAttribute('title')) ||
            norm(el.getAttribute('data-test-subj'))
        )
        .join(' | ');
      throw new Error(
        `Filter button not found. Tried [${candidates.join(', ')}]. Buttons seen: ${dump}`
      );
    }

    return cy.wrap(found);
  });
};

const openFilter = (labels) => {
  findFilterButton(labels).scrollIntoView().click();
  cy.get('.euiFilterSelectItem', { timeout: 10000 }).should('exist');
};

const clearAllOpenFilterOptions = () => {
  cy.get('.euiFilterSelectItem').each(($item) => {
    const isOn = $item.find('svg[data-euiicon-type="check"]').length > 0;
    if (isOn) cy.wrap($item).click();
  });
};

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const setListFilter = (buttonLabels, values = []) => {
  openFilter(buttonLabels);
  clearAllOpenFilterOptions();
  values.forEach((label) => {
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cy.contains('.euiFilterSelectItem', new RegExp(`^${esc(label)}$`, 'i'))
      .scrollIntoView()
      .click();
  });
  cy.get('body').click(0, 0);
  cy.wait(300);
};

const setNodeIdFilter = (nodeIds = []) => setListFilter(['Coordinator Node ID'], nodeIds);
const setSearchTypeFilter = (types = []) => setListFilter(['Search Type'], types);
const setIndicesFilter = (indices = []) => setListFilter(['Indices'], indices);

const setTypeFilter = (mode /* 'query' | 'group' | 'both' */) => {
  cy.contains('button', /^Type\b/).click();
  const ensureToggle = (label, on) => {
    cy.contains('.euiFilterSelectItem', new RegExp(`^${esc(label)}$`, 'i')).then(($item) => {
      const isOn = $item.find('svg[data-euiicon-type="check"]').length > 0;
      if (isOn !== on) cy.wrap($item).click();
    });
  };
  if (mode === 'query') {
    ensureToggle('query', true);
    ensureToggle('group', false);
  } else if (mode === 'group') {
    ensureToggle('query', false);
    ensureToggle('group', true);
  } else {
    ensureToggle('query', true);
    ensureToggle('group', true);
  }
  cy.get('body').click(0, 0);
  cy.wait(300);
};

const resetTypeFilterToNone = () => {
  cy.contains('button', /^Type\b/).click();
  ['query', 'group'].forEach((label) => {
    cy.contains('.euiFilterSelectItem', new RegExp(`^${esc(label)}$`, 'i')).then(($item) => {
      const isOn = $item.find('svg[data-euiicon-type="check"]').length > 0;
      if (isOn) cy.wrap($item).click();
    });
  });
  cy.get('body').click(0, 0);
  cy.wait(300);
};

const deriveExpectations = (payload, type = 'all') => {
  const allRows = getRowsFromRaw(payload);

  let rows = allRows;
  if (type === 'query') {
    rows = allRows.filter((r) => String(r.group_by).toUpperCase() === 'NONE');
  } else if (type === 'group') {
    rows = allRows.filter((r) => String(r.group_by).toUpperCase() !== 'NONE');
  }

  const uniq = (arr) => [...new Set(arr)];
  const countBy = (items, keyFn) =>
    items.reduce((acc, item) => {
      const k = keyFn(item);
      if (Array.isArray(k)) {
        k.filter(Boolean).forEach((kk) => {
          acc[kk] = (acc[kk] || 0) + 1;
        });
      } else if (k) {
        acc[k] = (acc[k] || 0) + 1;
      }
      return acc;
    }, {});

  const nodeIds = uniq(rows.map((r) => r.node_id).filter(Boolean));
  const indexNames = uniq(rows.flatMap((r) => r.indices || []).filter(Boolean));
  const searchTypes = uniq(rows.map((r) => r.search_type).filter(Boolean));

  return {
    appliedType: type,
    rows,
    totalRowCount: rows.length,
    nodeIds,
    nodeIdCounts: countBy(rows, (r) => r.node_id),
    indexNames,
    indexCounts: countBy(rows, (r) => r.indices || []),
    searchTypes,
    searchTypeCounts: countBy(rows, (r) => r.search_type),
  };
};

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

describe('Query Insights — Dynamic Columns with Intercepted Top Queries (MIXED)', () => {
  const mixedRows = getRowsFromRaw(MIXED);
  const totalRowCount = mixedRows.length;

  beforeEach(() => {
    cy.intercept('GET', '**/api/top_queries/**', (req) => {
      req.reply({ statusCode: 200, body: makeTimestampedBody(MIXED) });
    }).as('topQueries');

    cy.waitForQueryInsightsPlugin();
    cy.wait('@topQueries');
  });

  it('renders combined headers when Nothing is selected in type', () => {
    resetTypeFilterToNone();
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
    getHeaders().should('deep.equal', expected);
    assertRowCountEquals(totalRowCount);
    expectSortedBy('Query Count', 2);
    expectSortedBy('Avg Latency / Latency', 4);
    expectSortedBy('Avg CPU Time / CPU Time', 5);
    expectSortedBy('Avg Memory Usage / Memory Usage', 6);
  });

  it('renders query-only headers when Type=query', () => {
    setTypeFilter('query');
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
    getHeaders().should('deep.equal', expected);

    const queryOnlyCount = mixedRows.filter((r) => String(r.group_by).toUpperCase() === 'NONE')
      .length;
    assertRowCountEquals(queryOnlyCount);

    expectSortedBy('Timestamp', 2);
    expectSortedBy('Latency', 3);
    expectSortedBy('CPU Time', 4);
    expectSortedBy('Memory Usage', 5);
  });

  it('renders group-only headers when Type=group', () => {
    setTypeFilter('group');
    const expected = [
      'Id',
      'Type',
      'Query Count',
      'Average Latency',
      'Average CPU Time',
      'Average Memory Usage',
    ];
    getHeaders().should('deep.equal', expected);

    const groupOnlyCount = mixedRows.filter((r) => String(r.group_by).toUpperCase() !== 'NONE')
      .length;
    assertRowCountEquals(groupOnlyCount);

    expectSortedBy('Query Count', 2);
    expectSortedBy('Average Latency', 3);
    expectSortedBy('Average CPU Time', 4);
    expectSortedBy('Average Memory Usage', 5);
  });

  it('renders combined headers when Type=both', () => {
    setTypeFilter('both');
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
    getHeaders().should('deep.equal', expected);
    assertRowCountEquals(totalRowCount);

    expectSortedBy('Query Count', 2);
    expectSortedBy('Avg Latency / Latency', 4);
    expectSortedBy('Avg CPU Time / CPU Time', 5);
    expectSortedBy('Avg Memory Usage / Memory Usage', 6);
  });
});

// ---- QUERY ONLY fixture (no Type toggle)
describe('Query Insights — Dynamic Columns (QUERY ONLY fixture)', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/top_queries/**', (req) => {
      req.reply({ statusCode: 200, body: makeTimestampedBody(QUERY_ONLY) });
    }).as('topQueries');

    cy.waitForQueryInsightsPlugin();
    cy.wait('@topQueries');
  });

  it('renders only query headers (without changing Type filter)', () => {
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
    getHeaders().should('deep.equal', expected);
    assertRowCountEquals(getRowsFromRaw(QUERY_ONLY).length);
  });
});

// ---- GROUP ONLY fixture (no Type toggle)
describe('Query Insights — Dynamic Columns (GROUP ONLY fixture)', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/top_queries/**', (req) => {
      req.reply({ statusCode: 200, body: makeTimestampedBody(GROUP_ONLY) });
    }).as('topQueries');

    cy.waitForQueryInsightsPlugin();
    cy.wait('@topQueries');
  });

  it('renders only group headers (without changing Type filter)', () => {
    const expected = [
      'Id',
      'Type',
      'Query Count',
      'Average Latency',
      'Average CPU Time',
      'Average Memory Usage',
    ];
    getHeaders().should('deep.equal', expected);
    assertRowCountEquals(getRowsFromRaw(GROUP_ONLY).length);
  });
});

describe('Query Insights — Filters: Node ID, Search Type, Indices (QUERY_ONLY, no Type toggle)', () => {
  let expected;
  let expectingAll;
  let primaryNodeId;
  let secondaryNodeId;
  let primaryIndexName;
  let secondaryIndexName;
  let defaultSearchType;

  before(() => {
    // derive expectations from query-only payload
    expected = deriveExpectations(MIXED, 'query');
    expectingAll = deriveExpectations(MIXED);
    [primaryNodeId, secondaryNodeId] = expected.nodeIds;
    [primaryIndexName, secondaryIndexName] = expected.indexNames;
    [defaultSearchType] = expected.searchTypes;
  });

  beforeEach(() => {
    // intercept with ONLY query rows, plus fresh timestamps
    cy.intercept('GET', '**/api/top_queries/**', (req) => {
      req.reply({ statusCode: 200, body: makeTimestampedBody(MIXED) });
    }).as('topQueries');

    cy.waitForQueryInsightsPlugin();
    cy.wait('@topQueries');
  });

  it('filters by Node ID', () => {
    if (primaryNodeId) {
      setNodeIdFilter([primaryNodeId]);
      assertRowCountEquals(expected.nodeIdCounts[primaryNodeId]);
      cy.get('.euiTableRow').each(($r) => cy.wrap($r).contains('td', primaryNodeId));
    }
    setNodeIdFilter([primaryNodeId]); // clear

    if (secondaryNodeId) {
      setNodeIdFilter([secondaryNodeId]);
      assertRowCountEquals(expected.nodeIdCounts[secondaryNodeId]);
      cy.get('.euiTableRow').each(($r) => cy.wrap($r).contains('td', secondaryNodeId));
    }
    setNodeIdFilter([secondaryNodeId]); // clear
    assertRowCountEquals(expectingAll.totalRowCount);
  });

  it('filters by Search Type', () => {
    if (defaultSearchType) {
      setSearchTypeFilter([defaultSearchType]);
      assertRowCountEquals(expected.searchTypeCounts[defaultSearchType]);
      cy.get('.euiTableRow').each(($r) => cy.wrap($r).contains('td', 'query then fetch'));
    }
    setSearchTypeFilter([defaultSearchType]);

    assertRowCountEquals(expectingAll.totalRowCount);
  });

  it('filters by Indices', () => {
    if (primaryIndexName) {
      setIndicesFilter([primaryIndexName]);
      assertRowCountEquals(expected.indexCounts[primaryIndexName]);
      cy.get('.euiTableRow').each(($r) => cy.wrap($r).contains('td', primaryIndexName));
    }
    setIndicesFilter([primaryIndexName]);

    if (secondaryIndexName) {
      setIndicesFilter([secondaryIndexName]);
      assertRowCountEquals(expected.indexCounts[secondaryIndexName]);
      cy.get('.euiTableRow').each(($r) => cy.wrap($r).contains('td', secondaryIndexName));
    }
    setIndicesFilter([secondaryIndexName]);

    const both = [primaryIndexName, secondaryIndexName].filter(Boolean);
    if (both.length > 1) {
      setIndicesFilter(both);
      assertRowCountEquals(expected.totalRowCount);
    }

    setIndicesFilter([]); // clear
    assertRowCountEquals(expected.totalRowCount);
  });
});
