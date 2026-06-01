/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { WLM_AUTH } from '../../support/constants';

describe('WLM Details Page', () => {
  const api = (opts) =>
    cy.request({
      headers: { 'osd-xsrf': 'true' },
      auth: WLM_AUTH,
      failOnStatusCode: false,
      ...opts,
    });

  const groupName = `wlm-e2e-${Date.now()}`;

  before(() => {
    // Just create the test group
    return api({
      method: 'PUT',
      url: '/api/_wlm/workload_group',
      body: {
        name: groupName,
        resiliency_mode: 'soft',
        resource_limits: { cpu: 0.01, memory: 0.01 },
      },
    })
      .its('status')
      .should('be.oneOf', [200, 201, 204, 409]);
  });

  beforeEach(() => {
    // Detect CI environment for appropriate timeouts
    const isCI = Cypress.env('CI') || !Cypress.config('isInteractive');
    const pageLoadTimeout = isCI ? 180000 : 60000; // 3 minutes in CI, 1 minute locally

    cy.visit(`/app/workload-management#/wlm-details?name=${groupName}`, {
      auth: WLM_AUTH,
      timeout: pageLoadTimeout,
    });

    // Wait for the page to be fully loaded with the group name
    cy.contains(groupName, { timeout: pageLoadTimeout }).should('exist');
  });

  it('should display workload group summary panel', () => {
    cy.contains('Workload group name').should('exist');
    cy.contains('Resiliency mode').should('exist');
    cy.contains('CPU usage limit').should('exist');
    cy.contains('Memory usage limit').should('exist');
  });

  it('should switch between tabs', () => {
    cy.get('[data-testid="wlm-tab-settings"]').click();
    cy.contains('Workload group settings').should('exist');
    cy.get('[data-testid="wlm-tab-resources"]').click();
    cy.contains('Node ID').should('exist');
  });

  it('should display node resource usage table', () => {
    cy.get('[data-testid="wlm-tab-resources"]').click();
    cy.contains('Node ID').should('exist');
    cy.get('.euiTableRow').should('have.length.greaterThan', 0);
  });

  it('should show delete modal', () => {
    cy.contains('Delete').click();
    cy.contains('Delete workload group').should('exist');
    cy.get('.euiModalFooter button').contains('Cancel').click();
  });

  it('should create, update, and delete an index rule on the details page', () => {
    const i1 = `logs-${Date.now()}-*`;
    const i2 = `metrics-${Date.now()}-*`;

    cy.intercept('PUT', '**/api/_wlm/workload_group/*').as('saveGroup');
    cy.intercept('GET', '**/api/_rules/workload_group*').as('listRules');

    cy.get('[data-testid="wlm-tab-settings"]').click();
    cy.contains('+ Add another rule').click();

    cy.get('[data-testid="indexInput"]').last().type(i1);

    cy.contains('button', /^Apply Changes$/)
      .should('not.be.disabled')
      .click();
    cy.wait('@saveGroup');

    cy.reload();
    cy.wait('@listRules');
    cy.get('[data-testid="wlm-tab-settings"]').click();

    cy.get('[data-testid="indexInput"]', { timeout: 20000 }).should(($els) => {
      const values = Array.from($els, (el) => (el.value || '').trim());
      expect(values).to.include(i1);
    });

    cy.get('[data-testid="indexInput"]').last().type('{selectAll}{backspace}').type(i2).blur();

    cy.contains('button', /^Apply Changes$/)
      .should('not.be.disabled')
      .click();
    cy.wait('@saveGroup');

    cy.reload();
    cy.wait('@listRules');
    cy.get('[data-testid="wlm-tab-settings"]').click();

    cy.get('[data-testid="indexInput"]', { timeout: 20000 }).should(($els) => {
      const values = Array.from($els, (el) => (el.value || '').trim());
      expect(values).to.include(i2);
      expect(values).to.not.include(i1);
    });

    cy.get('button[aria-label="Delete rule"]', { timeout: 20000 }).last().click({ force: true });

    cy.contains('button', /^Apply Changes$/)
      .should('not.be.disabled')
      .click();
    cy.wait('@saveGroup');

    cy.reload();
    cy.wait('@listRules');
    cy.get('[data-testid="wlm-tab-settings"]').click();

    cy.get('[data-testid="indexInput"]').should(($areas) => {
      const values = Array.from($areas, (el) => (el.value || '').trim());
      expect(values).to.not.include(i2);
    });
  });

  it('persists a group setting via PUT and reflects it after reload', () => {
    cy.intercept('PUT', '**/api/_wlm/workload_group/*').as('saveGroup');

    cy.get('[data-testid="wlm-tab-settings"]').click();

    cy.get('[data-testid="wlm-setting-toggle-search.max_buckets"]').click();
    cy.get('[data-testid="wlm-setting-input-search.max_buckets"]').clear().type('5000');

    cy.contains('button', /^Apply Changes$/)
      .should('not.be.disabled')
      .click();

    cy.wait('@saveGroup')
      .its('request.body.settings')
      .should('deep.equal', { 'search.max_buckets': 5000 });

    cy.reload();
    cy.get('[data-testid="wlm-tab-settings"]').click();
    cy.get('[data-testid="wlm-setting-input-search.max_buckets"]').should('have.value', '5000');
  });

  it('toggling off a previously-set key sends null', () => {
    cy.intercept('PUT', '**/api/_wlm/workload_group/*').as('saveGroupRemove');

    cy.get('[data-testid="wlm-tab-settings"]').click();
    cy.get('[data-testid="wlm-setting-toggle-search.max_buckets"]').click();

    cy.contains('button', /^Apply Changes$/)
      .should('not.be.disabled')
      .click();

    cy.wait('@saveGroupRemove')
      .its('request.body.settings')
      .should('deep.equal', { 'search.max_buckets': null });
  });

  it('persists override_request_values and clears it on toggle off', () => {
    cy.intercept('PUT', '**/api/_wlm/workload_group/*').as('saveOverride');

    cy.get('[data-testid="wlm-tab-settings"]').click();
    cy.get('[data-testid="wlm-setting-toggle-override_request_values"]').click();

    cy.contains('button', /^Apply Changes$/)
      .should('not.be.disabled')
      .click();

    cy.wait('@saveOverride')
      .its('request.body.settings')
      .should('deep.equal', { override_request_values: true });

    cy.intercept('PUT', '**/api/_wlm/workload_group/*').as('saveOverrideRemove');
    cy.get('[data-testid="wlm-setting-toggle-override_request_values"]').click();

    cy.contains('button', /^Apply Changes$/)
      .should('not.be.disabled')
      .click();

    cy.wait('@saveOverrideRemove')
      .its('request.body.settings')
      .should('deep.equal', { override_request_values: null });
  });

  it('keeps Apply Changes disabled while a settings row has an invalid value', () => {
    cy.get('[data-testid="wlm-tab-settings"]').click();

    cy.get('[data-testid="wlm-setting-toggle-search.batched_reduce_size"]').click();
    cy.get('[data-testid="wlm-setting-input-search.batched_reduce_size"]').clear().type('1');

    cy.contains('button', /^Apply Changes$/).should('be.disabled');

    cy.get('[data-testid="wlm-setting-input-search.batched_reduce_size"]').clear().type('512');
    cy.contains('button', /^Apply Changes$/).should('not.be.disabled');
  });

  it('omits the settings field entirely when no toggle is on', () => {
    cy.intercept('PUT', '**/api/_wlm/workload_group/*').as('saveNoSettings');

    cy.get('[data-testid="wlm-tab-settings"]').click();

    // touch resiliency to enable the Apply Changes button without altering settings
    cy.contains('label', 'Enforced').click();
    cy.contains('button', /^Apply Changes$/)
      .should('not.be.disabled')
      .click();

    cy.wait('@saveNoSettings').its('request.body.settings').should('be.undefined');
  });

  it('should delete the workload group successfully', () => {
    cy.contains('Delete').click();
    cy.get('input[placeholder="delete"]').type('delete');
    cy.get('.euiModalFooter button').contains('Delete').click();
    cy.url().should('include', '/workloadManagement');
    cy.contains(`Deleted workload group "${groupName}"`).should('exist');
  });
});

describe('WLM Details – DEFAULT_WORKLOAD_GROUP', () => {
  it('should disable settings tab for DEFAULT_WORKLOAD_GROUP', () => {
    // Detect CI environment for appropriate timeouts
    const isCI = Cypress.env('CI') || !Cypress.config('isInteractive');
    const pageLoadTimeout = isCI ? 180000 : 60000; // 3 minutes in CI, 1 minute locally

    cy.visit('/app/workload-management#/wlm-details?name=DEFAULT_WORKLOAD_GROUP', {
      auth: WLM_AUTH,
      timeout: pageLoadTimeout,
    });

    // Wait for the page to be fully loaded
    cy.contains('DEFAULT_WORKLOAD_GROUP', { timeout: pageLoadTimeout }).should('exist');

    cy.get('[data-testid="wlm-tab-settings"]').click();
    cy.contains('Settings are not available for the DEFAULT_WORKLOAD_GROUP').should('exist');
  });
});
