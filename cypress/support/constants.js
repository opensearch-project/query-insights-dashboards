/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export const BASE_PATH = Cypress.config('baseUrl');

export const PLUGIN_NAME = 'query-insights-dashboards';

export const OVERVIEW_PATH = `${BASE_PATH}/app/${PLUGIN_NAME}#/queryInsights`;
export const CONFIGURATION_PATH = `${BASE_PATH}/app/${PLUGIN_NAME}#/configuration`;
export const LIVEQUERIES_PATH = `${BASE_PATH}/app/${PLUGIN_NAME}#/LiveQueries`;

export const METRICS = {
  LATENCY: 'latency',
  CPU: 'cpu',
  MEMORY: 'memory',
};

// Credentials come from the environment. Security-enabled workflows forward the cluster
// admin password as CYPRESS_OPENSEARCH_INITIAL_ADMIN_PASSWORD; falling back to Cypress.env
// ('password') (the cypress.config.js default 'admin') only for non-security suites where
// the value is unused. No hardcoded cluster password is baked in here.
export const ADMIN_AUTH = {
  username: Cypress.env('username') || 'admin',
  password: Cypress.env('OPENSEARCH_INITIAL_ADMIN_PASSWORD') || Cypress.env('password'),
};

export const WLM_AUTH = {
  username: Cypress.env('username') || 'admin',
  password: Cypress.env('OPENSEARCH_INITIAL_ADMIN_PASSWORD') || Cypress.env('password'),
};
