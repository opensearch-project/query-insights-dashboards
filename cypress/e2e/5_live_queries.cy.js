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

  // it('displays the correct page title', () => {
  //   cy.contains('Query insights - In-flight queries').should('be.visible');
  // });
  //
  // it('displays metrics panels correctly', () => {
  //   cy.get('[data-test-subj="panel-active-queries"]').within(() => {
  //     cy.contains('Active queries');
  //     cy.get('h2 > b').should('contain.text', '20');
  //   });
  //
  //   cy.get('[data-test-subj="panel-avg-elapsed-time"]').within(() => {
  //     cy.contains('Avg. elapsed time');
  //     cy.get('h2 > b').should('contain.text', '7.19 s');
  //     cy.contains('(Avg. across 20)');
  //   });
  //
  //   cy.get('[data-test-subj="panel-longest-query"]').within(() => {
  //     cy.contains('Longest running query');
  //     cy.get('h2 > b').should('contain.text', '9.69 s');
  //     cy.contains('ID: node-A1B2C4E5:3614');
  //   });
  //
  //   cy.get('[data-test-subj="panel-total-cpu"]').within(() => {
  //     cy.contains('Total CPU usage');
  //     cy.get('h2 > b').should('contain.text', '1.68 ms');
  //     cy.contains('(Sum across 20)');
  //   });
  //
  //   cy.get('[data-test-subj="panel-total-memory"]').within(() => {
  //     cy.contains('Total memory usage');
  //     cy.get('h2 > b').should('contain.text', '69.12 KB');
  //     cy.contains('(Sum across 20)');
  //   });
  // });
  //
  // it('verifies table headers and row content in memory table', () => {
  //   const expectedHeaders = [
  //     '',
  //     'Timestamp',
  //     'Task ID',
  //     'Index',
  //     'Coordinator node',
  //     'Time elapsed',
  //     'CPU usage',
  //     'Memory usage',
  //     'Search type',
  //     'Status',
  //     'WLM Group',
  //     'Actions',
  //   ];
  //
  //   cy.get('.euiTable thead tr th').should(($headers) => {
  //     const actualHeaders = [...$headers].map((el) => el.innerText.trim());
  //     expect(actualHeaders.length).to.eq(expectedHeaders.length);
  //     expectedHeaders.forEach((expected, index) => {
  //       expect(actualHeaders[index]).to.eq(expected);
  //     });
  //   });
  // });
  //
  // it('navigates to next page in table pagination', () => {
  //   cy.wait('@getLiveQueries');
  //   cy.get('.euiPagination').should('be.visible');
  //   cy.get('.euiPagination__item').contains('2').click();
  //   cy.get('tbody tr').should('exist');
  // });
  //
  // it('selects all checkboxes and shows bulk cancel text', () => {
  //   cy.get('.euiTable thead tr th input[type="checkbox"]').check({ force: true });
  //   cy.get('.euiTable tbody tr input[type="checkbox"]:checked').then(($rows) => {
  //     const selectedCount = $rows.length;
  //     const expectedText = `Cancel ${selectedCount} queries`;
  //
  //     cy.contains(expectedText).should('be.visible');
  //   });
  // });
  //
  // it('disables auto-refresh when toggled off', () => {
  //   cy.get('[data-test-subj="live-queries-autorefresh-toggle"]').as('toggle');
  //   cy.get('[data-test-subj="live-queries-refresh-interval"]').as('dropdown');
  //
  //   cy.get('@toggle').click();
  //   cy.get('@toggle').should('have.attr', 'aria-checked', 'false');
  //   cy.get('@dropdown').should('be.disabled');
  // });
  //
  // it('has expected refresh interval options', () => {
  //   cy.get('[data-test-subj="live-queries-refresh-interval"] option').should(($options) => {
  //     const values = [...$options].map((opt) => opt.innerText.trim());
  //     expect(values).to.include.members(['5 seconds', '10 seconds', '30 seconds', '1 minute']);
  //   });
  // });
  //
  // it('manually refreshes data', () => {
  //   cy.get('[data-test-subj="live-queries-refresh-button"]').click();
  //   cy.wait('@getLiveQueries');
  // });
  //
  // it('updates data periodically', () => {
  //   cy.fixture('stub_live_queries.json').then((initialData) => {
  //     let callCount = 0;
  //     cy.intercept('GET', '**/api/live_queries', (req) => {
  //       callCount++;
  //       const modifiedData = {
  //         ...initialData,
  //         response: {
  //           ...initialData.response,
  //           live_queries: initialData.response.live_queries.map((query) => ({
  //             ...query,
  //             id: `query${callCount}_${query.id}`,
  //           })),
  //         },
  //       };
  //       req.reply(modifiedData);
  //     }).as('getPeriodicQueries');
  //   });
  //
  //   cy.navigateToLiveQueries();
  //
  //   cy.wait('@getPeriodicQueries');
  //   cy.wait('@getPeriodicQueries');
  //   cy.wait('@getPeriodicQueries');
  //
  //   cy.get('@getPeriodicQueries.all').should('have.length.at.least', 3);
  // });
  //
  // it('handles empty response state', () => {
  //   cy.intercept('GET', '**/api/live_queries', (req) => {
  //     req.reply({
  //       statusCode: 200,
  //       body: {
  //         ok: true,
  //         response: {
  //           live_queries: [],
  //         },
  //       },
  //     });
  //   }).as('getEmptyQueries');
  //
  //   cy.navigateToLiveQueries();
  //   cy.wait('@getEmptyQueries');
  //   cy.get('[data-test-subj="panel-active-queries"]').within(() => {
  //     cy.contains('Active queries');
  //     cy.get('h2 > b').should('contain.text', '0');
  //   });
  //
  //   cy.get('[data-test-subj="panel-avg-elapsed-time"]').within(() => {
  //     cy.contains('Avg. elapsed time');
  //     cy.get('h2 > b').should('contain.text', '0');
  //   });
  //
  //   cy.get('[data-test-subj="panel-longest-query"]').within(() => {
  //     cy.contains('Longest running query');
  //     cy.get('h2 > b').should('contain.text', '0');
  //   });
  //
  //   cy.get('[data-test-subj="panel-total-cpu"]').within(() => {
  //     cy.contains('Total CPU usage');
  //     cy.get('h2 > b').should('contain.text', '0');
  //   });
  //
  //   cy.get('[data-test-subj="panel-total-memory"]').within(() => {
  //     cy.contains('Total memory usage');
  //     cy.get('h2 > b').should('contain.text', '0');
  //   });
  //
  //   cy.contains('p', 'Queries by Node')
  //     .closest('.euiPanel')
  //     .within(() => {
  //       cy.contains('No data available').should('be.visible');
  //     });
  //
  //   cy.contains('p', 'Queries by Index')
  //     .closest('.euiPanel')
  //     .within(() => {
  //       cy.contains('No data available').should('be.visible');
  //     });
  // });
  // it('validates time unit conversions', () => {
  //   cy.intercept('GET', '**/api/live_queries', {
  //     statusCode: 200,
  //     body: {
  //       response: {
  //         live_queries: [
  //           {
  //             measurements: {
  //               latency: { number: 500 },
  //               cpu: { number: 100 },
  //               memory: { number: 1000 },
  //             },
  //           },
  //         ],
  //       },
  //     },
  //   }).as('getMicrosecondsData');
  //
  //   cy.wait('@getMicrosecondsData');
  //   cy.get('.euiPanel')
  //     .eq(1)
  //     .within(() => {
  //       cy.get('h2').contains(/0\.50\s*µs/);
  //     });
  //
  //   cy.intercept('GET', '**/api/live_queries', {
  //     statusCode: 200,
  //     body: {
  //       response: {
  //         live_queries: [
  //           {
  //             measurements: {
  //               latency: { number: 1000000 },
  //               cpu: { number: 100000 },
  //               memory: { number: 1000 },
  //             },
  //           },
  //         ],
  //       },
  //     },
  //   }).as('getMillisecondsData');
  //
  //   cy.wait('@getMillisecondsData');
  //   cy.get('.euiPanel')
  //     .eq(1)
  //     .within(() => {
  //       cy.get('h2').contains(/1\.00\s*ms/);
  //     });
  // });
  //
  // it('validates memory unit conversions', () => {
  //   cy.intercept('GET', '**/api/live_queries', {
  //     statusCode: 200,
  //     body: {
  //       response: {
  //         live_queries: [
  //           {
  //             timestamp: Date.now(),
  //             id: 'kb-test',
  //             node_id: 'n1',
  //             description: 'test',
  //             measurements: {
  //               latency: { number: 1 },
  //               cpu: { number: 1 },
  //               memory: { number: 2048 },
  //             },
  //           },
  //         ],
  //       },
  //     },
  //   }).as('getKBData');
  //
  //   cy.visit('/app/query-insights-dashboards#/LiveQueries');
  //   cy.wait('@getKBData');
  //   cy.contains('h2', /2\s*KB/).should('exist');
  //
  //   cy.intercept('GET', '**/api/live_queries', {
  //     statusCode: 200,
  //     body: {
  //       response: {
  //         live_queries: [
  //           {
  //             timestamp: Date.now(),
  //             id: 'mb-test',
  //             node_id: 'n1',
  //             description: 'test',
  //             measurements: {
  //               latency: { number: 1 },
  //               cpu: { number: 1 },
  //               memory: { number: 2 * 1024 * 1024 },
  //             },
  //           },
  //         ],
  //       },
  //     },
  //   }).as('getMBData');
  //
  //   cy.get('[data-test-subj="live-queries-refresh-button"]').click();
  //   cy.wait('@getMBData');
  //   cy.contains('h2', /2\s*MB/).should('exist');
  // });
  //
  // it('does not show cancel action for already cancelled queries', () => {
  //   cy.fixture('stub_live_queries.json').then((data) => {
  //     data.response.live_queries[0].measurements.is_cancelled = true;
  //
  //     cy.intercept('GET', '**/api/live_queries', {
  //       statusCode: 200,
  //       body: data,
  //     }).as('getCancelledQuery');
  //
  //     cy.navigateToLiveQueries();
  //     cy.wait('@getCancelledQuery');
  //
  //     cy.contains(data.response.live_queries[0].id)
  //       .parents('tr')
  //       .within(() => {
  //         cy.get('[aria-label="Cancel this query"]').should('not.exist');
  //       });
  //
  //     cy.contains(data.response.live_queries[0].id)
  //       .parents('tr')
  //       .find('input[type="checkbox"]')
  //       .should('be.disabled');
  //   });
  // });
  //
  // it('filters table to show only "opensearch" index queries', () => {
  //   cy.contains('button', 'Index').click();
  //   cy.contains('[role="option"]', 'opensearch').click();
  //   cy.get('tbody tr').should('have.length', 1);
  //   cy.get('tbody tr')
  //     .first()
  //     .within(() => {
  //       cy.contains('td', 'opensearch');
  //     });
  // });
  // it('shows a grey "Workload group" badge with a dropdown next to it', () => {
  //   cy.contains('.euiBadge', 'Workload group').should('be.visible');
  //   // The select should be the next control after the badge
  //   cy.contains('.euiBadge', 'Workload group')
  //     .parent()
  //     .next()
  //     .find('select, .euiSelect') // raw <select> or EuiSelect
  //     .should('exist');
  // });
  // it('renders WLM group cell as plain text when plugin unavailable', () => {
  //   // Stub plugin unavailable BEFORE visiting the page
  //   cy.intercept('GET', '**/api/wlm/cat_plugins*', { body: { ok: true, hasWlm: false } }).as('noWlm');
  //   cy.navigateToLiveQueries();
  //   cy.wait('@noWlm');
  //
  //   // Find the column index of "WLM Group"
  //   cy.get('.euiTable thead tr th').then(($ths) => {
  //     const idx = [...$ths].findIndex((th) => th.innerText.trim() === 'WLM Group');
  //     expect(idx).to.be.greaterThan(-1);
  //
  //     // In the first row, make sure there's NO <a> anchor in that cell
  //     cy.get('tbody tr').first().find('td').eq(idx).find('a').should('not.exist');
  //   });
  // });
  //
  //
  //


});
describe('WLM integration – fallbacks & names', () => {
  beforeEach(() => {
    // Live queries default fixture
    cy.fixture('stub_live_queries.json').then((f) => {
      cy.intercept('GET', '**/api/live_queries*', { body: f }).as('live');
    });
  });

  // it('falls back to IDs when /_wlm/workload_group fails but stats succeed', () => {
  //   cy.intercept('GET', '**/api/wlm/cat_plugins*', { body: { ok: true, hasWlm: true } }).as('cat');
  //   cy.intercept('GET', '**/api/_wlm/stats*', {
  //     body: {
  //       nodeA: { workload_groups: { g1: { total_completions: 100 }, g2: { total_completions: 84 } } },
  //     },
  //   }).as('stats');
  //   cy.intercept('GET', '**/api/_wlm/workload_group*', { statusCode: 500 }).as('groupsFail');
  //
  //   cy.navigateToLiveQueries();
  //   cy.wait(['@cat', '@stats', '@groupsFail', '@live']);
  //
  //   // Options should include IDs from stats
  //   cy.get('#wlm-group-select')
  //     .find('option')
  //     .then(($opts) => [...$opts].map(o => o.getAttribute('value')))
  //     .should('include.members', ['', 'g1', 'g2']);
  //
  //   // Totals panel aggregates across all groups (100+84 = 184)
  //   cy.contains('.euiPanel', 'Total completions').within(() => {
  //     cy.contains(/^184$/).should('exist');
  //   });
  // });
  // it('shows friendly names and updates totals when a WLM group is selected', () => {
  //   // Stub WLM available + stats + group names
  //   cy.intercept('GET', '**/api/wlm/cat_plugins*', { body: { ok: true, hasWlm: true } }).as('cat');
  //   cy.intercept('GET', '**/api/_wlm/stats*', {
  //     // All = 110, g1 = 44 (11+33), g2 = 66 (22+44)
  //     body: {
  //       nodeA: { workload_groups: { g1: { total_completions: 11 }, g2: { total_completions: 22 } } },
  //       nodeB: { workload_groups: { g1: { total_completions: 33 }, g2: { total_completions: 44 } } },
  //     },
  //   }).as('stats');
  //   cy.intercept('GET', '**/api/_wlm/workload_group*', {
  //     body: { workload_groups: [{ _id: 'g1', name: 'Gold' }, { _id: 'g2', name: 'Silver' }] },
  //   }).as('groups');
  //
  //   // Live queries: alias by wlm_group presence
  //   cy.intercept('GET', '**/api/live_queries*', (req) => {
  //     const u = new URL(req.url);
  //     const g = u.searchParams.get('wlm_group');
  //     req.alias = g ? 'liveFiltered' : 'liveAll';
  //     req.reply({ body: { response: { live_queries: [] } } });
  //   });
  //
  //   cy.navigateToLiveQueries();
  //   cy.wait(['@cat', '@stats', '@groups', '@liveAll']);
  //
  //   // Ensure the select is present and options are rendered
  //   cy.get('#wlm-group-select').should('exist');
  //
  //   // Assert the friendly names appear as options (retries until they do)
  //   cy.get('#wlm-group-select').within(() => {
  //     cy.get('option').should('have.length.at.least', 3); // includes "All"
  //     cy.contains('option', 'Gold').should('exist');
  //     cy.contains('option', 'Silver').should('exist');
  //   });
  //
  //   // Assert All totals (110) with retry
  //   cy.contains('.euiPanel', 'Total completions')
  //     .find('h2')
  //     .should(($h2) => {
  //       expect($h2.text().trim()).to.eq('110');
  //     });
  //
  //   // Select Gold (g1) by value and check filtered call + totals (44)
  //   cy.get('#wlm-group-select').select('g1', { force: true });
  //   cy.wait('@liveFiltered').its('request.url').should('match', /wlm_group=g1/);
  //   cy.contains('.euiPanel', 'Total completions')
  //     .find('h2')
  //     .should(($h2) => {
  //       expect($h2.text().trim()).to.eq('44');
  //     });
  //
  //   // Select Silver (g2) and verify
  //   cy.get('#wlm-group-select').select('g2', { force: true });
  //   cy.wait('@liveFiltered').its('request.url').should('match', /wlm_group=g2/);
  //   cy.contains('.euiPanel', 'Total completions')
  //     .find('h2')
  //     .should(($h2) => {
  //       expect($h2.text().trim()).to.eq('66');
  //     });
  //
  //   // Back to All (empty value)
  //   cy.get('#wlm-group-select').select('', { force: true });
  //   cy.wait('@liveAll');
  //   cy.contains('.euiPanel', 'Total completions')
  //     .find('h2')
  //     .should(($h2) => {
  //       expect($h2.text().trim()).to.eq('110');
  //     });
  // });


  it('keeps showing stats even when plugin is unavailable; dropdown stays at All', () => {
    cy.intercept('GET', '**/api/wlm/cat_plugins*', { body: { ok: true, hasWlm: false } }).as('cat');
    cy.intercept('GET', '**/api/_wlm/stats*', {
      body: { nodeA: { workload_groups: { g1: { total_completions: 9 } } } },
    }).as('stats');
    cy.intercept('GET', '**/api/_wlm/workload_group*', { statusCode: 404 }).as('groups404');

    cy.navigateToLiveQueries();
    cy.wait(['@cat', '@stats', '@groups404', '@live']);

    cy.contains('.euiPanel', 'Total completions').within(() => {
      cy.contains(/^9$/).should('exist');
    });

    // Only "All workload groups" visible
    cy.get('#wlm-group-select').find('option').should('have.length', 1);
    cy.get('#wlm-group-select').find('option').first().should('have.value', '');
  });
  it('preselects from URL and triggers filtered live queries on load', () => {
    cy.intercept('GET', '**/api/wlm/cat_plugins*', { body: { ok: true, hasWlm: true } }).as('cat');
    cy.intercept('GET', '**/api/_wlm/stats*', { body: { nodeA: { workload_groups: { g2: {} } } } }).as('stats');
    cy.intercept('GET', '**/api/_wlm/workload_group*', {
      body: { workload_groups: [{ _id: 'g2', name: 'Silver' }] },
    }).as('groups');

    cy.intercept('GET', '**/api/live_queries*', (req) => {
      const u = new URL(req.url);
      if (u.searchParams.get('wlm_group') === 'g2') req.alias = 'liveG2';
      req.reply({ body: { response: { live_queries: [] } } });
    });

    cy.visit('/app/query-insights-dashboards#/LiveQueries?wlm_group=g2');
    cy.wait(['@cat', '@stats', '@groups', '@liveG2']);

    cy.get('#wlm-group-select').should('have.value', 'g2');
  });
  it('renders WLM group as a link when plugin is available, and plain text when not', () => {
    // First pass: available
    cy.intercept('GET', '**/api/wlm/cat_plugins*', { body: { ok: true, hasWlm: true } }).as('catOn');
    cy.intercept('GET', '**/api/_wlm/stats*', { body: {} }).as('stats1');
    cy.intercept('GET', '**/api/_wlm/workload_group*', {
      body: { workload_groups: [{ _id: 'gX', name: 'XName' }] },
    }).as('groups1');

    cy.fixture('stub_live_queries.json').then((f) => {
      f.response.live_queries = (f.response.live_queries || []).slice(0, 1).map((q) => ({
        ...q,
        query_group_id: 'gX',
        wlm_group: 'gX',
      }));
      cy.intercept('GET', '**/api/live_queries*', { body: f }).as('live1');
    });

    cy.navigateToLiveQueries();
    cy.wait(['@catOn', '@stats1', '@groups1', '@live1']);

    // Find WLM Group column index
    cy.contains('.euiTable thead th', 'WLM Group')
      .invoke('index')
      .then((idx) => {
        cy.get('.euiTable tbody tr').first().within(() => {
          cy.get('td').eq(idx).find('[role="link"], a').should('exist');
        });
      });

    // Second pass: unavailable
    cy.intercept('GET', '**/api/wlm/cat_plugins*', { body: { ok: true, hasWlm: false } }).as('catOff');
    cy.intercept('GET', '**/api/_wlm/stats*', { body: {} }).as('stats2');
    cy.intercept('GET', '**/api/_wlm/workload_group*', { statusCode: 404 }).as('groups2');
    cy.intercept('GET', '**/api/live_queries*', { times: 1, body: { response: { live_queries: [] } } }).as('live2');

    cy.navigateToLiveQueries();
    cy.wait(['@catOff', '@stats2', '@groups2', '@live2']);

    cy.contains('.euiTable thead th', 'WLM Group')
      .invoke('index')
      .then((idx) => {
        cy.get('.euiTable tbody tr').first().within(() => {
          cy.get('td').eq(idx).find('[role="link"], a').should('not.exist');
        });
      });
  });
  it('auto-refresh triggers repeated WLM stats and live queries', () => {
    cy.clock(); // control timers

    cy.intercept('GET', '**/api/wlm/cat_plugins*', { body: { ok: true, hasWlm: true } });
    const statsSpy = cy.spy().as('statsSpy');
    const liveSpy = cy.spy().as('liveSpy');

    cy.intercept('GET', '**/api/_wlm/stats*', (req) => { statsSpy(); req.reply({ body: {} }); });
    cy.intercept('GET', '**/api/_wlm/workload_group*', { body: { workload_groups: [] } });
    cy.intercept('GET', '**/api/live_queries*', (req) => { liveSpy(); req.reply({ body: { response: { live_queries: [] } } }); });

    cy.navigateToLiveQueries(); // sets interval to 5s by default

    // Tick 3 times -> ~15s
    cy.tick(5000);
    cy.tick(5000);
    cy.tick(5000);

    cy.get('@statsSpy').should('have.callCount.at.least', 3);
    cy.get('@liveSpy').should('have.callCount.at.least', 3);
  });
});


