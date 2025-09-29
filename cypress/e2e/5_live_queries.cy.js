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
    cy.contains('Query insights - In-flight queries').should('be.visible');
  });

  it('displays metrics panels correctly', () => {
    cy.get('[data-test-subj="panel-active-queries"]').within(() => {
      cy.contains('Active queries');
      cy.get('h2 > b').should('contain.text', '20');
    });

    cy.get('[data-test-subj="panel-avg-elapsed-time"]').within(() => {
      cy.contains('Avg. elapsed time');
      cy.get('h2 > b').should('contain.text', '7.19 s');
      cy.contains('(Avg. across 20)');
    });

    cy.get('[data-test-subj="panel-longest-query"]').within(() => {
      cy.contains('Longest running query');
      cy.get('h2 > b').should('contain.text', '9.69 s');
      cy.contains('ID: node-A1B2C4E5:3614');
    });

    cy.get('[data-test-subj="panel-total-cpu"]').within(() => {
      cy.contains('Total CPU usage');
      cy.get('h2 > b').should('contain.text', '1.68 ms');
      cy.contains('(Sum across 20)');
    });

    cy.get('[data-test-subj="panel-total-memory"]').within(() => {
      cy.contains('Total memory usage');
      cy.get('h2 > b').should('contain.text', '69.12 KB');
      cy.contains('(Sum across 20)');
    });
  });

  it('verifies table headers and row content in memory table', () => {
    const expectedHeaders = [
      '',
      'Timestamp',
      'Task ID',
      'Index',
      'Coordinator node',
      'Time elapsed',
      'CPU usage',
      'Memory usage',
      'Search type',
      'Status',
      'WLM Group',
      'Actions',
    ];

    cy.get('.euiTable thead tr th').should(($headers) => {
      const actualHeaders = [...$headers].map((el) => el.innerText.trim());
      expect(actualHeaders.length).to.eq(expectedHeaders.length);
      expectedHeaders.forEach((expected, index) => {
        expect(actualHeaders[index]).to.eq(expected);
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
    cy.get('.euiTable thead tr th input[type="checkbox"]').check({ force: true });
    cy.get('.euiTable tbody tr input[type="checkbox"]:checked').then(($rows) => {
      const selectedCount = $rows.length;
      const expectedText = `Cancel ${selectedCount} queries`;

      cy.contains(expectedText).should('be.visible');
    });
  });

  it('disables auto-refresh when toggled off', () => {
    cy.get('[data-test-subj="live-queries-autorefresh-toggle"]').as('toggle');
    cy.get('[data-test-subj="live-queries-refresh-interval"]').as('dropdown');

    cy.get('@toggle').click();
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
    cy.get('[data-test-subj="panel-active-queries"]').within(() => {
      cy.contains('Active queries');
      cy.get('h2 > b').should('contain.text', '0');
    });

    cy.get('[data-test-subj="panel-avg-elapsed-time"]').within(() => {
      cy.contains('Avg. elapsed time');
      cy.get('h2 > b').should('contain.text', '0');
    });

    cy.get('[data-test-subj="panel-longest-query"]').within(() => {
      cy.contains('Longest running query');
      cy.get('h2 > b').should('contain.text', '0');
    });

    cy.get('[data-test-subj="panel-total-cpu"]').within(() => {
      cy.contains('Total CPU usage');
      cy.get('h2 > b').should('contain.text', '0');
    });

    cy.get('[data-test-subj="panel-total-memory"]').within(() => {
      cy.contains('Total memory usage');
      cy.get('h2 > b').should('contain.text', '0');
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
                latency: { number: 500 },
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

    cy.intercept('GET', '**/api/live_queries', {
      statusCode: 200,
      body: {
        response: {
          live_queries: [
            {
              measurements: {
                latency: { number: 1000000 },
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
                memory: { number: 2048 },
              },
            },
          ],
        },
      },
    }).as('getKBData');

    cy.visit('/app/query-insights-dashboards#/LiveQueries');
    cy.wait('@getKBData');
    cy.contains('h2', /2\s*KB/).should('exist');

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
                memory: { number: 2 * 1024 * 1024 },
              },
            },
          ],
        },
      },
    }).as('getMBData');

    cy.get('[data-test-subj="live-queries-refresh-button"]').click();
    cy.wait('@getMBData');
    cy.contains('h2', /2\s*MB/).should('exist');
  });

  it('does not show cancel action for already cancelled queries', () => {
    cy.fixture('stub_live_queries.json').then((data) => {
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
  it('shows a grey "Workload group" badge with a dropdown next to it', () => {
    cy.contains('.euiBadge', 'Workload group').should('be.visible');
    // The select should be the next control after the badge
    cy.contains('.euiBadge', 'Workload group')
      .parent()
      .next()
      .find('select, .euiSelect') // raw <select> or EuiSelect
      .should('exist');
  });

  it('displays WLM group as text when WLM is disabled', () => {
    cy.get('tbody tr')
      .first()
      .within(() => {
        cy.get('td').contains('ANALYTICS_WORKLOAD_GROUP').should('not.have.attr', 'href');
      });
  });
});

describe('Inflight Queries Dashboard - WLM Enabled', () => {
  beforeEach(() => {
    cy.fixture('stub_live_queries.json').then((stubResponse) => {
      cy.intercept('GET', '**/api/live_queries', {
        statusCode: 200,
        body: stubResponse,
      }).as('getLiveQueries');
    });

    cy.fixture('stub_wlm_stats.json').then((wlmStatsResponse) => {
      cy.intercept('GET', '**/api/_wlm/stats', {
        statusCode: 200,
        body: wlmStatsResponse,
      }).as('getWlmStats');
    });

    cy.intercept('GET', '**/api/cat_plugins', {
      statusCode: 200,
      body: { hasWlm: true },
    }).as('getPluginsEnabled');

    cy.intercept('GET', '**/api/_wlm/workload_group', {
      statusCode: 200,
      body: {
        workload_groups: [
          { _id: 'ANALYTICS_WORKLOAD_GROUP', name: 'ANALYTICS_WORKLOAD_GROUP' },
          { _id: 'DEFAULT_QUERY_GROUP', name: 'DEFAULT_QUERY_GROUP' },
        ],
      },
    }).as('getWorkloadGroups');
    cy.intercept('GET', '**/api/cat_plugins', {
      statusCode: 200,
      body: { hasWlm: true },
    }).as('getPluginsEnabled');

    cy.navigateToLiveQueries();
    cy.wait('@getLiveQueries');
  });

  it('displays WLM group links when WLM is enabled', () => {
    cy.wait('@getWorkloadGroups');
    cy.wait('@getPluginsEnabled');

    cy.get('tbody tr')
      .first()
      .within(() => {
        cy.get('td').contains('ANALYTICS_WORKLOAD_GROUP').click({ force: true });
      });
  });

  it('calls different API when WLM group selection changes', () => {
    // Intercept all live_queries calls
    cy.intercept('GET', '**/api/live_queries*').as('liveQueries');

    // 1) Select ANALYTICS first
    cy.get('#wlm-group-select').should('exist').select('ANALYTICS_WORKLOAD_GROUP');

    cy.wait('@liveQueries')
      .its('request.url')
      .should('include', 'wlmGroupId=ANALYTICS_WORKLOAD_GROUP');

    // Component re-fetches workload groups after selection — wait for that
    cy.wait('@getWorkloadGroups');

    // 2) Select DEFAULT_WORKLOAD_GROUP explicitly
    cy.get('#wlm-group-select').select('DEFAULT_WORKLOAD_GROUP');

    cy.wait('@liveQueries')
      .its('request.url')
      .should('include', 'wlmGroupId=DEFAULT_WORKLOAD_GROUP');
  });

  it('displays total completion, cancellation, and rejection metrics correctly', () => {
    // Trigger a refresh to ensure WLM stats are loaded
    cy.get('[data-test-subj="live-queries-refresh-button"]').click();
    cy.wait('@getWlmStats');

    cy.contains('Total completions')
      .closest('.euiPanel')
      .within(() => {
        cy.get('h2').should('contain.text', '300');
      });

    cy.contains('Total cancellations')
      .closest('.euiPanel')
      .within(() => {
        cy.get('h2').should('contain.text', '80');
      });

    cy.contains('Total rejections')
      .closest('.euiPanel')
      .within(() => {
        cy.get('h2').should('contain.text', '10');
      });
  });
});
