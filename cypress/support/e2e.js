/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import './commands';

// ignore the error "ResizeObserver loop limit exceeded", https://github.com/quasarframework/quasar/issues/2233
const resizeObserverLoopErrRe = /^[^(ResizeObserver loop limit exceeded)]/;
Cypress.on('uncaught:exception', (err) => {
  /* returning false here prevents Cypress from failing the test */
  if (resizeObserverLoopErrRe.test(err.message)) {
    return false;
  }
});

// Switch the base URL of Opensearch when security enabled in the cluster
// Dashboard endpoint can still be http when security enabled
if (Cypress.env('security_enabled')) {
  Cypress.env('opensearch', `https://${Cypress.env('opensearch_url')}`);
} else {
  Cypress.env('opensearch', `http://${Cypress.env('opensearch_url')}`);
}

// Warmup for WLM plugin - ensure plugin is loaded before tests run
// This helps prevent the first test from failing due to plugin initialization time
// NOTE: Only runs for non-security tests since security tests need auth credentials
before(() => {
  // Only run warmup for WLM no-security tests
  const testFile = Cypress.spec.relative;
  if (testFile.includes('wlm-no-security')) {
    const isCI = Cypress.env('CI') || !Cypress.config('isInteractive');

    // Only do warmup in CI where timing is more critical
    if (isCI) {
      cy.log('=== WLM Plugin Warmup (CI only) ===');

      // Short warmup visit to trigger plugin initialization
      cy.visit('/app/workload-management#/workloadManagement', {
        failOnStatusCode: false,
        timeout: 120000,
      });

      // Wait a bit for the plugin to initialize
      cy.wait(10000);

      cy.log('=== WLM Plugin Warmup Complete ===');
    }
  }
});
