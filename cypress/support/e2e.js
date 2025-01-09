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
