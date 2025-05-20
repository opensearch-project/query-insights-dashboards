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
        cy.get('h2').contains(15);
      });

    cy.get('.euiPanel')
      .eq(1)
      .within(() => {
        cy.contains('Avg. elapsed time');
        cy.get('h2').contains('5.93 s');
      });

    cy.get('.euiPanel')
      .eq(2)
      .within(() => {
        cy.contains('Longest running query');
        cy.get('h2').contains('9.57 s');
        cy.contains('ID: n90fvIkHTVuE3LkB_014');
      });

    cy.get('.euiPanel')
      .eq(3)
      .within(() => {
        cy.contains('Total CPU usage');
        cy.get('h2').contains('9.25 ms');
      });

    cy.get('.euiPanel')
      .eq(4)
      .within(() => {
        cy.contains('Total memory usage');
        cy.get('h2').contains('340.66 KB');
      });
  });

  it('renders charts and allows switching between chart types', () => {
    cy.contains('h3', 'Queries by Node').closest('.euiPanel').as('nodeChart');
    cy.contains('h3', 'Queries by Index').closest('.euiPanel').as('indexChart');

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

      cy.get('.euiButtonGroup').contains('Bar').click();
      cy.wait(500);

      cy.get('.euiButtonGroup').contains('Donut').click();
      cy.wait(500);
    });
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

    cy.contains('h3', 'Queries by Node')
      .closest('.euiPanel')
      .within(() => {
        cy.contains('No data available').should('be.visible');
      });

    cy.contains('h3', 'Queries by Index')
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
    // Test KB display
    cy.intercept('GET', '**/api/live_queries', {
      statusCode: 200,
      body: {
        response: {
          live_queries: [
            {
              measurements: {
                memory: { number: 2048 }, // 2KB
              },
            },
          ],
        },
      },
    }).as('getKBData');

    cy.wait('@getKBData');
    cy.get('.euiPanel')
      .eq(4)
      .within(() => {
        cy.get('h2').contains(/2\.00\s*KB/);
      });

    // Test MB display
    cy.intercept('GET', '**/api/live_queries', {
      statusCode: 200,
      body: {
        response: {
          live_queries: [
            {
              measurements: {
                memory: { number: 2097152 }, // 2MB
              },
            },
          ],
        },
      },
    }).as('getMBData');

    cy.wait('@getMBData');
    cy.get('.euiPanel')
      .eq(4)
      .within(() => {
        cy.get('h2').contains(/2\.00\s*MB/);
      });
  });

  it('handles error states', () => {
    cy.intercept('GET', '**/api/live_queries', {
      statusCode: 500,
      body: { error: 'Internal Server Error' },
    }).as('getErrorResponse');

    cy.navigateToLiveQueries();
    cy.wait('@getErrorResponse');

    cy.get('.euiPanel').each(($panel) => {
      cy.wrap($panel).within(() => {
        cy.get('h2').contains('0');
      });
    });

    cy.contains('h3', 'Queries by Node').closest('.euiPanel').contains('No data available');

    cy.contains('h3', 'Queries by Index').closest('.euiPanel').contains('No data available');
  });

  it('verifies chart toggle button states', () => {
    cy.contains('h3', 'Queries by Node')
      .closest('.euiPanel')
      .within(() => {
        cy.get('.euiButtonGroup')
          .contains('Donut')
          .should('have.class', 'euiButtonGroupButton-isSelected');
        cy.get('.euiButtonGroup').contains('Bar').click();
        cy.get('.euiButtonGroup')
          .contains('Bar')
          .should('have.class', 'euiButtonGroupButton-isSelected');
      });

    cy.contains('h3', 'Queries by Index')
      .closest('.euiPanel')
      .within(() => {
        cy.get('.euiButtonGroup')
          .contains('Donut')
          .should('have.class', 'euiButtonGroupButton-isSelected');
        cy.get('.euiButtonGroup').contains('Bar').click();
        cy.get('.euiButtonGroup')
          .contains('Bar')
          .should('have.class', 'euiButtonGroupButton-isSelected');
      });
  });
});
