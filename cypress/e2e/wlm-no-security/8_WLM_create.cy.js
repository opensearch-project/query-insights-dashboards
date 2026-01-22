/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { WLM_AUTH } from '../../support/constants';

const auth = WLM_AUTH;

describe('WLM Create Page', () => {
  beforeEach(() => {
    // Detect CI environment for appropriate timeouts
    const isCI = Cypress.env('CI') || !Cypress.config('isInteractive');
    const pageLoadTimeout = isCI ? 180000 : 60000; // 3 minutes in CI, 1 minute locally

    cy.visit('/app/workload-management#/wlm-create', {
      auth,
      timeout: pageLoadTimeout,
    });

    // Wait for the page to be fully loaded with the main heading
    cy.contains('h1', 'Create workload group', { timeout: pageLoadTimeout }).should('exist');
  });

  it('renders the full create form with required fields', () => {
    cy.contains('h1', 'Create workload group').should('exist');
    cy.contains('h2', 'Overview').should('exist');
    [
      'Name',
      'Description – Optional',
      'Resiliency mode',
      'Index wildcard',
      'Reject queries when CPU usage exceeds',
      'Reject queries when memory usage exceeds',
    ].forEach((label) => {
      cy.contains(label).should('exist');
    });
    cy.contains('Soft').should('exist');
    cy.contains('Enforced').should('exist');
    cy.contains('+ Add another rule').should('exist');
    cy.get('button').contains('Create workload group').should('exist');
  });

  it('shows validation errors for CPU and memory thresholds', () => {
    cy.get('[data-testid="cpu-threshold-input"]').clear().type('150');
    cy.contains('Value must be between 0 and 100').should('exist');
    cy.get('[data-testid="cpu-threshold-input"]').clear().type('0');
    cy.contains('Value must be between 0 and 100').should('exist');
    cy.get('[data-testid="memory-threshold-input"]').clear().type('101');
    cy.contains('Value must be between 0 and 100').should('exist');
    cy.get('[data-testid="memory-threshold-input"]').clear().type('0');
    cy.contains('Value must be between 0 and 100').should('exist');
  });

  it('creates a workload group successfully with valid inputs', () => {
    const groupName = `wlm_test_${Date.now()}`;
    cy.get('[data-testid="name-input"]').type(groupName);
    cy.contains('Soft').click();
    cy.get('[data-testid="indexInput"]').type(`test-index_${Date.now()}`);
    cy.get('[data-testid="cpu-threshold-input"]').type('10');
    cy.get('[data-testid="memory-threshold-input"]').type('20');
    cy.intercept('PUT', '/api/_wlm/workload_group').as('createRequest');
    cy.get('button').contains('Create workload group').click();
    cy.url().should('include', '/workloadManagement');
    cy.contains(groupName).should('exist');
  });

  it('adds and deletes a rule block', () => {
    cy.contains('+ Add another rule').click();
    cy.get('[data-testid="indexInput"]').should('have.length', 2);
    cy.get('[aria-label="Delete rule"]').first().click();
    cy.get('[data-testid="indexInput"]').should('have.length', 1);
  });

  it('does not create a rule when all fields are blank (no rule PUT)', () => {
    const groupName = `wlm_blank_${Date.now()}`;
    cy.intercept('PUT', '/api/_wlm/workload_group').as('createGroup');
    cy.intercept('PUT', '/api/_rules/workload_group').as('createRule');
    cy.get('[data-testid="name-input"]').type(groupName);
    cy.contains('Soft').click();
    cy.get('[data-testid="memory-threshold-input"]').clear().type('1');
    cy.get('button').contains('Create workload group').click();
    cy.wait('@createGroup');
    cy.get('@createRule.all').should('have.length', 0);
    cy.url().should('include', '/workloadManagement');
  });

  it('ignores commas-only inputs and does not send empty arrays', () => {
    const groupName = `wlm_commas_${Date.now()}`;
    cy.intercept('PUT', '/api/_wlm/workload_group').as('createGroup');
    cy.intercept('PUT', '/api/_rules/workload_group').as('createRule');
    cy.get('[data-testid="name-input"]').type(groupName);
    cy.contains('Soft').click();
    cy.get('[data-testid="indexInput"]').type(' , , , ');
    cy.get('[placeholder="Enter username"]').type(' , , ');
    cy.get('[placeholder="Enter role"]').type(' , ');
    cy.get('[data-testid="memory-threshold-input"]').clear().type('1');
    cy.get('button').contains('Create workload group').click();
    cy.wait('@createGroup');
    cy.get('@createRule.all').should('have.length', 0);
    cy.url().should('include', '/workloadManagement');
  });

  it('navigates back to main page on Cancel', () => {
    cy.get('button').contains('Cancel').click();
    cy.url().should('include', '/workloadManagement');
  });
});
