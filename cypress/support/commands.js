/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

const { ADMIN_AUTH, OVERVIEW_PATH, CONFIGURATION_PATH, BASE_PATH } = require('./constants');

/**
 * Overwrites the default visit command to authenticate before visiting
 */
Cypress.Commands.overwrite('visit', (originalFn, url, options) => {
  // Add the basic auth header when security enabled in the Opensearch cluster
  if (Cypress.env('security_enabled')) {
    if (options) {
      options.auth = ADMIN_AUTH;
    } else {
      options = { auth: ADMIN_AUTH };
    }
    // Add query parameters - select the default OpenSearch Dashboards tenant
    options.qs = { security_tenant: 'private' };
    return originalFn(url, options);
  } else {
    return originalFn(url, options);
  }
});

/**
 * Overwrite request command to support authentication similar to visit.
 * The request function parameters can be url, or (method, url), or (method, url, body).
 */
Cypress.Commands.overwrite('request', (originalFn, ...args) => {
  const defaults = {};
  // Add the basic authentication header when security enabled in the Opensearch cluster
  if (Cypress.env('SECURITY_ENABLED')) {
    defaults.auth = ADMIN_AUTH;
  }

  let options = {};
  if (typeof args[0] === 'object' && args[0] !== null) {
    options = { ...args[0] };
  } else if (args.length === 1) {
    [options.url] = args;
  } else if (args.length === 2) {
    [options.method, options.url] = args;
  } else if (args.length === 3) {
    [options.method, options.url, options.body] = args;
  }

  return originalFn({ ...defaults, ...options });
});

Cypress.Commands.add('getElementByText', (locator, text) => {
  Cypress.log({ message: `Get element by text: ${text}` });
  return locator
    ? cy.get(locator).filter(`:contains("${text}")`).should('be.visible')
    : cy.contains(text).should('be.visible');
});

Cypress.Commands.add('login', () => {
  // much faster than log in through UI
  cy.request({
    method: 'POST',
    url: `${BASE_PATH}/auth/login`,
    body: ADMIN_AUTH,
    headers: {
      'osd-xsrf': true,
    },
  });
});

Cypress.Commands.add('enableTopQueries', (metric) => {
  cy.request({
    method: 'PUT',
    url: `${Cypress.env('openSearchUrl')}/_cluster/settings`,
    body: {
      persistent: {
        [`search.insights.top_queries.${metric}.enabled`]: true,
        [`search.insights.top_queries.${metric}.window_size`]: '1m',
        [`search.insights.top_queries.${metric}.top_n_size`]: 100,
      },
    },
    failOnStatusCode: false,
  });
});

Cypress.Commands.add('disableTopQueries', (metric) => {
  cy.request({
    method: 'PUT',
    url: `${Cypress.env('openSearchUrl')}/_cluster/settings`,
    body: {
      persistent: {
        [`search.insights.top_queries.${metric}.enabled`]: false,
      },
    },
    failOnStatusCode: false,
  });
});

Cypress.Commands.add('enableGrouping', () => {
  cy.request({
    method: 'PUT',
    url: `${Cypress.env('openSearchUrl')}/_cluster/settings`,
    body: {
      persistent: {
        'search.insights.top_queries.latency.enabled': true,
        'search.insights.top_queries.cpu.enabled': true,
        'search.insights.top_queries.memory.enabled': true,
        'search.insights.top_queries.grouping.group_by': 'similarity',
        'search.insights.top_queries.grouping.max_groups_excluding_topn': 100,
        'search.insights.top_queries.grouping.attributes.field_name': true,
        'search.insights.top_queries.grouping.attributes.field_type': true,
        'search.insights.top_queries.latency.top_n_size': 5,
        'search.insights.top_queries.cpu.top_n_size': 5,
        'search.insights.top_queries.memory.top_n_size': 5,
        'search.insights.top_queries.latency.window_size': '1m',
        'search.insights.top_queries.cpu.window_size': '1m',
        'search.insights.top_queries.memory.window_size': '1m',
        'search.insights.top_queries.exporter.type': 'none',
      },
    },
    failOnStatusCode: true,
  });
});

Cypress.Commands.add('disableGrouping', () => {
  cy.request({
    method: 'PUT',
    url: `${Cypress.env('openSearchUrl')}/_cluster/settings`,
    body: {
      persistent: {
        'search.insights.top_queries.latency.enabled': false,
        'search.insights.top_queries.cpu.enabled': false,
        'search.insights.top_queries.memory.enabled': false,
        'search.insights.top_queries.grouping.group_by': 'none',
        'search.insights.top_queries.exporter.type': 'none',
      },
    },
    failOnStatusCode: true,
  });
});
Cypress.Commands.add('setWindowSize', (size = '1m') => {
  cy.request({
    method: 'PUT',
    url: `${Cypress.env('openSearchUrl')}/_cluster/settings`,
    body: {
      persistent: {
        'search.insights.top_queries.latency.window_size': size,
        'search.insights.top_queries.cpu.window_size': size,
        'search.insights.top_queries.memory.window_size': size,
      },
    },
    failOnStatusCode: true,
  });
});

Cypress.Commands.add('createIndexByName', (indexName, body = {}) => {
  cy.request('POST', `${Cypress.env('openSearchUrl')}/${indexName}/_doc`, body);
});

Cypress.Commands.add('searchOnIndex', (indexName, body = {}) => {
  cy.request('GET', `${Cypress.env('openSearchUrl')}/${indexName}/_search`, body);
});

Cypress.Commands.add('deleteIndexByName', (indexName) => {
  cy.request({
    method: 'DELETE',
    url: `${Cypress.env('openSearchUrl')}/${indexName}`,
    failOnStatusCode: false,
  });
});

Cypress.Commands.add('waitForPageLoad', (fullUrl, { timeout = 60000, contains = null }) => {
  Cypress.log({
    message: `Wait for url: ${fullUrl} to be loaded.`,
  });
  cy.url({ timeout: timeout })
    .should('include', fullUrl)
    .then(() => {
      contains && cy.contains(contains, { timeout: timeout }).should('be.visible');
    });
});

Cypress.Commands.add('navigateToOverview', () => {
  cy.visit(OVERVIEW_PATH);
  cy.waitForPageLoad(OVERVIEW_PATH, { contains: 'Query insights - Top N queries', timeout: 90000 });
});

Cypress.Commands.add('navigateToConfiguration', () => {
  cy.visit(CONFIGURATION_PATH);
  cy.waitForPageLoad(CONFIGURATION_PATH, { contains: 'Query insights - Configuration' });
});

Cypress.Commands.add('waitForQueryInsightsData', () => {
  // Poll the API to ensure query insights data is available before proceeding
  cy.log('Waiting for query insights data to be available...');

  const checkData = () => {
    const to = new Date().toISOString();
    const from = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    return cy.request({
      method: 'GET',
      url: `/api/top_queries/latency`,
      qs: { from, to },
      failOnStatusCode: false,
    }).then((response) => {
      if (response.status === 200 &&
          response.body.ok &&
          response.body.response &&
          response.body.response.top_queries &&
          response.body.response.top_queries.length > 0) {
        cy.log('Query insights data is available');
        return true;
      }
      return false;
    });
  };

  // Retry up to 10 times with 3 second intervals
  const retryCheck = (attempts = 0) => {
    if (attempts >= 10) {
      cy.log('Max attempts reached, proceeding anyway');
      return;
    }

    checkData().then((hasData) => {
      if (!hasData) {
        cy.wait(3000);
        retryCheck(attempts + 1);
      }
    });
  };

  retryCheck();
});
