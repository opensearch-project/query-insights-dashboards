/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

describe('Inflight Queries Dashboard', () => {
  beforeEach(() => {
    cy.fixture('stub_live_queries.json').then((stubResponse) => {
      cy.intercept('GET', '**/api/live_queries', {
        statusCode: 200,
        body: stubResponse,
      }).as('getLiveQueries');
    });

    cy.navigateToLiveQueries();
    cy.wait(1000);
    cy.wait('@getLiveQueries');
  });

  it('displays the correct page title', () => {
    cy.contains('Query insights - In-flight queries scoreboard').should('be.visible');
  });

  it('displays metrics panels correctly', () => {
    cy.get('.euiPanel')
      .eq(0)
      .within(() => {
        cy.contains('Active queries');
        cy.get('h2').contains(20);
      });

    cy.get('.euiPanel')
      .eq(1)
      .within(() => {
        cy.contains('Avg. elapsed time');
        cy.get('h2').contains('7.19 s');
      });

    cy.get('.euiPanel')
      .eq(2)
      .within(() => {
        cy.contains('Longest running query');
        cy.get('h2').contains('9.69 s');
        cy.contains('ID: node-A1B2C4E5:3614');
      });

    cy.get('.euiPanel')
      .eq(3)
      .within(() => {
        cy.contains('Total CPU usage');
        cy.get('h2').contains('1.68 ms');
      });

    cy.get('.euiPanel')
      .eq(4)
      .within(() => {
        cy.contains('Total memory usage');
        cy.get('h2').contains('69.12 KB');
      });
  });

  it('verifies table headers and row content in memory table', () => {
    const expectedHeaders = [
      '',
      'Timestamp',
      'Task ID',
      'Index',
      'Node',
      'Time elapsed',
      'CPU usage',
      'Memory usage',
      'Search type',
      'Coordinator node',
      'Status',
      'Actions',
    ];

    const expectedRow = [
      'Jun 05, 2025 @ 10:24:26 PM',
      'node-A1B2C3D4E5:3600',
      'top_queries-2025.06.06-11009',
      'Node 1',
      '7.99 s',
      '89.95 µs',
      '3.73 KB',
      'QUERY_THEN_FETCH',
      'node-A1B2C3D4E5',
      'Cancelled',
      '', // Action column
    ];

    cy.get('.euiTable thead tr th').should(($headers) => {
      const actualHeaders = [...$headers].map((el) => el.innerText.trim());
      expect(actualHeaders.length).to.eq(expectedHeaders.length);
      expectedHeaders.forEach((expected, index) => {
        expect(actualHeaders[index]).to.eq(expected);
      });
    });

    cy.get('.euiTable tbody tr')
      .first()
      .find('td')
      .should(($cells) => {
        const actualCells = [...$cells].map((el) => el.innerText.trim());
        const visibleData = actualCells.slice(1, expectedRow.length + 1);

        expectedRow.forEach((expected, index) => {
          const valueToCheck = visibleData[index];
          expect(valueToCheck).to.eq(expected);
        });
      });
  });

  it('navigates to next page in table pagination', () => {
    cy.wait('@getLiveQueries');
    cy.get('.euiPagination').should('be.visible');
    cy.get('.euiPagination__item').contains('2').click();
    cy.get('tbody tr').should('exist');
  });

  it('selects all checkboxes and shows bulk cancel text', () => {
    // Click the header checkbox to select all
    cy.get('.euiTable thead tr th input[type="checkbox"]').check({ force: true });

    // Count the number of rows selected
    cy.get('.euiTable tbody tr input[type="checkbox"]:checked').then(($rows) => {
      const selectedCount = $rows.length;
      const expectedText = `Cancel ${selectedCount} queries`;

      // Assert the bulk action banner shows the correct message
      cy.contains(expectedText).should('be.visible');
    });
  });

  it('disables auto-refresh when toggled off', () => {
    cy.get('[data-test-subj="live-queries-autorefresh-toggle"]').as('toggle');
    cy.get('[data-test-subj="live-queries-refresh-interval"]').as('dropdown');

    cy.get('@toggle').click(); // Turn it off
    cy.get('@toggle').should('have.attr', 'aria-checked', 'false');
    cy.get('@dropdown').should('be.disabled');
  });

  it('has expected refresh interval options', () => {
    cy.get('[data-test-subj="live-queries-refresh-interval"] option').should(($options) => {
      const values = [...$options].map((opt) => opt.innerText.trim());
      expect(values).to.include.members(['5 seconds', '10 seconds', '30 seconds', '1 minute']);
    });
  });

  it('manually refreshes data', () => {
    cy.get('[data-test-subj="live-queries-refresh-button"]').click();
    cy.wait('@getLiveQueries');
  });

  it('updates data periodically', () => {
    cy.fixture('stub_live_queries.json').then((initialData) => {
      let callCount = 0;
      cy.intercept('GET', '**/api/live_queries', (req) => {
        callCount++;
        const modifiedData = {
          ...initialData,
          response: {
            ...initialData.response,
            live_queries: initialData.response.live_queries.map((query) => ({
              ...query,
              id: `query${callCount}_${query.id}`,
            })),
          },
        };
        req.reply(modifiedData);
      }).as('getPeriodicQueries');
    });

    cy.navigateToLiveQueries();

    cy.wait('@getPeriodicQueries');
    cy.wait('@getPeriodicQueries');
    cy.wait('@getPeriodicQueries');

    cy.get('@getPeriodicQueries.all').should('have.length.at.least', 3);
  });

  it('handles empty response state', () => {
    cy.intercept('GET', '**/api/live_queries', (req) => {
      req.reply({
        statusCode: 200,
        body: {
          ok: true,
          response: {
            live_queries: [],
          },
        },
      });
    }).as('getEmptyQueries');

    cy.navigateToLiveQueries();
    cy.wait('@getEmptyQueries');
    cy.get('.euiPanel')
      .eq(0)
      .within(() => {
        cy.contains('Active queries');
        cy.get('h2').contains('0');
      });

    cy.get('.euiPanel')
      .eq(1)
      .within(() => {
        cy.contains('Avg. elapsed time');
        cy.get('h2').contains('0');
      });

    cy.get('.euiPanel')
      .eq(2)
      .within(() => {
        cy.contains('Longest running query');
        cy.get('h2').contains('0');
      });

    cy.get('.euiPanel')
      .eq(3)
      .within(() => {
        cy.contains('Total CPU usage');
        cy.get('h2').contains('0');
      });

    cy.get('.euiPanel')
      .eq(4)
      .within(() => {
        cy.contains('Total memory usage');
        cy.get('h2').contains('0');
      });

    cy.contains('p', 'Queries by Node')
      .closest('.euiPanel')
      .within(() => {
        cy.contains('No data available').should('be.visible');
      });

    cy.contains('p', 'Queries by Index')
      .closest('.euiPanel')
      .within(() => {
        cy.contains('No data available').should('be.visible');
      });
  });
  it('validates time unit conversions', () => {
    cy.intercept('GET', '**/api/live_queries', {
      statusCode: 200,
      body: {
        response: {
          live_queries: [
            {
              measurements: {
                latency: { number: 500 }, // 500 nanoseconds = 0.5 microseconds
                cpu: { number: 100 },
                memory: { number: 1000 },
              },
            },
          ],
        },
      },
    }).as('getMicrosecondsData');

    cy.wait('@getMicrosecondsData');
    cy.get('.euiPanel')
      .eq(1)
      .within(() => {
        cy.get('h2').contains(/0\.50\s*µs/);
      });

    // Test milliseconds
    cy.intercept('GET', '**/api/live_queries', {
      statusCode: 200,
      body: {
        response: {
          live_queries: [
            {
              measurements: {
                latency: { number: 1000000 }, // 1 millisecond
                cpu: { number: 100000 },
                memory: { number: 1000 },
              },
            },
          ],
        },
      },
    }).as('getMillisecondsData');

    cy.wait('@getMillisecondsData');
    cy.get('.euiPanel')
      .eq(1)
      .within(() => {
        cy.get('h2').contains(/1\.00\s*ms/);
      });
  });

  it('validates memory unit conversions', () => {
    // Intercept and assert 2.00 KB
    cy.intercept('GET', '**/api/live_queries', {
      statusCode: 200,
      body: {
        response: {
          live_queries: [
            {
              timestamp: Date.now(),
              id: 'kb-test',
              node_id: 'n1',
              description: 'test',
              measurements: {
                latency: { number: 1 },
                cpu: { number: 1 },
                memory: { number: 2048 }, // 2 KB
              },
            },
          ],
        },
      },
    }).as('getKBData');

    cy.visit('/app/query-insights-dashboards#/LiveQueries');
    cy.wait('@getKBData');
    cy.contains('h2', /2\s*KB/).should('exist');

    // Intercept and assert 2.00 MB
    cy.intercept('GET', '**/api/live_queries', {
      statusCode: 200,
      body: {
        response: {
          live_queries: [
            {
              timestamp: Date.now(),
              id: 'mb-test',
              node_id: 'n1',
              description: 'test',
              measurements: {
                latency: { number: 1 },
                cpu: { number: 1 },
                memory: { number: 2 * 1024 * 1024 }, // 2 MB
              },
            },
          ],
        },
      },
    }).as('getMBData');

    // Click refresh button to trigger re-fetch
    cy.get('[data-test-subj="live-queries-refresh-button"]').click();
    cy.wait('@getMBData');
    cy.contains('h2', /2\s*MB/).should('exist');
  });

  it('does not show cancel action for already cancelled queries', () => {
    cy.fixture('stub_live_queries.json').then((data) => {
      data.response.live_queries[0].measurements.is_cancelled = true;

      cy.intercept('GET', '**/api/live_queries', {
        statusCode: 200,
        body: data,
      }).as('getCancelledQuery');

      cy.navigateToLiveQueries();
      cy.wait('@getCancelledQuery');

      cy.contains(data.response.live_queries[0].id)
        .parents('tr')
        .within(() => {
          cy.get('[aria-label="Cancel this query"]').should('not.exist');
        });

      cy.contains(data.response.live_queries[0].id)
        .parents('tr')
        .find('input[type="checkbox"]')
        .should('be.disabled');
    });
  });

  it('handles error states', () => {
    cy.intercept('GET', '**/api/live_queries', {
      statusCode: 500,
      body: { error: 'Internal Server Error' },
    }).as('getErrorResponse');

    cy.navigateToLiveQueries();
    cy.wait('@getErrorResponse');

    // Check that exactly 5 metric panels show '0'
    cy.get('.euiPanel')
      .filter((_, el) => el.querySelector('h2')?.textContent.trim() === '0')
      .should('have.length', 5);

    // Check for "No data available" in charts
    cy.contains('p', 'Queries by Node').closest('.euiPanel').contains('No data available');
    cy.contains('p', 'Queries by Index').closest('.euiPanel').contains('No data available');
  });

  it('filters table to show only "opensearch" index queries', () => {
    cy.contains('button', 'Index').click();
    cy.contains('[role="option"]', 'opensearch').click();
    cy.get('tbody tr').should('have.length', 1);
    cy.get('tbody tr')
      .first()
      .within(() => {
        cy.contains('td', 'opensearch');
      });
  });

  it('renders charts and allows switching between chart types', () => {
    cy.contains('p', 'Queries by Node').closest('.euiPanel').as('nodeChart');
    cy.contains('p', 'Queries by Index').closest('.euiPanel').as('indexChart');

    cy.get('@nodeChart').within(() => {
      cy.get('.euiButtonGroup').should('exist');
      cy.get('.euiButtonGroup').contains('Donut').should('exist');
      cy.get('.euiButtonGroup').contains('Bar').should('exist');
      cy.get('.vega-embed').should('exist');

      cy.get('.euiButtonGroup').contains('Bar').click();
      cy.wait(500);
      cy.get('.euiButtonGroup').contains('Donut').click();
      cy.wait(500);
    });

    cy.get('@indexChart').within(() => {
      cy.get('.euiButtonGroup').should('exist');
      cy.get('.euiButtonGroup').contains('Donut').should('exist');
      cy.get('.euiButtonGroup').contains('Bar').should('exist');
      cy.get('.vega-embed').should('exist');

      cy.get('.euiButtonGroup').contains('Bar').click({ force: true });
      cy.wait(500);
      cy.get('.euiButtonGroup').contains('Donut').click({ force: true });
      cy.wait(500);
    });
  });

  it('displays "others" in Vega chart legend when there are > 9 nodes', () => {
    cy.get('[data-test-subj="vega-chart-node"] svg')
      .should('exist')
      .contains(/others/i)
      .should('exist');
  });
});
