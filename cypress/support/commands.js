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
      contains && cy.contains(contains).should('be.visible');
    });
});

Cypress.Commands.add('navigateToOverview', () => {
  cy.visit(OVERVIEW_PATH);
  cy.waitForPageLoad(OVERVIEW_PATH, { contains: 'Query insights - Top N queries' });
});

Cypress.Commands.add('navigateToConfiguration', () => {
  cy.visit(CONFIGURATION_PATH);
  cy.waitForPageLoad(CONFIGURATION_PATH, { contains: 'Query insights - Configuration' });
});
