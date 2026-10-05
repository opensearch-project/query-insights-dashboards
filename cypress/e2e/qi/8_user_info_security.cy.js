/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ADMIN_AUTH } from '../../support/constants';

// End-to-end coverage for the user-info columns (Username / User Roles / Backend Roles)
// and the X-Opaque-Id column on the Top N table, running against a REAL security-enabled
// cluster (provisioned by cypress-tests-user-info.yml). Rather than depend on the workflow's
// pre-seed surviving the 1-minute top-N window until Dashboards finishes starting, the
// supported block seeds its own labeled queries at test time and asserts on that real data.
//
// The columns are version-gated (rendered only when the cluster version is >= 3.5). The
// real cluster is a single fixed version, so the "not supported" (< 3.5) case is exercised
// by stubbing only /api/cluster/version to a below-gate value — a real downgrade is not
// possible within one job. That block intentionally does NOT stub /api/top_queries.
describe('User Info Columns with Security Enabled', () => {
  const osUrl = Cypress.env('openSearchUrl') || 'https://localhost:9200';
  const TEST_INDEX = 'user-info-e2e';

  const req = (options) => cy.request({ auth: ADMIN_AUTH, failOnStatusCode: false, ...options });

  describe('when the cluster supports user info (real cluster, version >= 3.5)', () => {
    before(() => {
      // Enable top-N latency collection with a short window.
      req({
        method: 'PUT',
        url: `${osUrl}/_cluster/settings`,
        body: {
          persistent: {
            'search.insights.top_queries.latency.enabled': true,
            'search.insights.top_queries.latency.window_size': '1m',
            'search.insights.top_queries.latency.top_n_size': 100,
          },
        },
      });
      // Seed a document, then run labeled searches as admin so the top-N store captures the
      // username, roles and X-Opaque-Id in the current window.
      req({
        method: 'POST',
        url: `${osUrl}/${TEST_INDEX}/_doc`,
        headers: { 'Content-Type': 'application/json' },
        body: { name: 'e2e', value: 1 },
      });
      req({ method: 'POST', url: `${osUrl}/${TEST_INDEX}/_refresh` });
      for (let i = 0; i < 5; i++) {
        req({
          method: 'POST',
          url: `${osUrl}/${TEST_INDEX}/_search`,
          headers: { 'Content-Type': 'application/json', 'X-Opaque-Id': 'admin-console' },
          body: { query: { match_all: {} } },
        });
      }
      // Wait for the 1-minute window to roll over so the queries surface in top-N.
      cy.wait(65000);
    });

    beforeEach(() => {
      // No stubs: hit the real security-enabled cluster.
      cy.waitForQueryInsightsPlugin();
      cy.get('.euiBasicTable', { timeout: 120000 }).should('exist');
    });

    it('shows the user-info and X-Opaque-Id column headers', () => {
      cy.get('.euiBasicTable')
        .last()
        .within(() => {
          cy.contains('Username').should('exist');
          cy.contains('User Roles').should('exist');
          cy.contains('Backend Roles').should('exist');
          cy.contains('X-Opaque-Id').should('exist');
        });
    });

    it('displays the seeded username', () => {
      cy.get('.euiBasicTable').last().find('tbody').should('contain.text', 'admin');
    });

    it('displays user roles for the seeded user', () => {
      // The admin user is mapped to all_access on the demo security config.
      cy.get('.euiBasicTable').last().find('tbody').should('contain.text', 'all_access');
    });

    it('displays the seeded X-Opaque-Id label value', () => {
      cy.get('.euiBasicTable').last().find('tbody').should('contain.text', 'admin-console');
    });
  });

  describe('when the cluster does not support user info (version < 3.5)', () => {
    beforeEach(() => {
      // Only the version is stubbed (a real old cluster can't be booted in-job); the top-N
      // data still comes from the real cluster.
      cy.intercept('GET', '**/api/cluster/version', {
        statusCode: 200,
        body: { version: '3.4.0' },
      }).as('clusterVersion');

      cy.waitForQueryInsightsPlugin();
      cy.get('.euiBasicTable', { timeout: 120000 }).should('exist');
    });

    it('hides the user-info columns', () => {
      cy.get('.euiBasicTable')
        .last()
        .within(() => {
          cy.contains('Username').should('not.exist');
          cy.contains('User Roles').should('not.exist');
          cy.contains('Backend Roles').should('not.exist');
        });
    });

    it('still shows the X-Opaque-Id column (not user-info gated)', () => {
      cy.get('.euiBasicTable').last().should('contain.text', 'X-Opaque-Id');
    });
  });
});
