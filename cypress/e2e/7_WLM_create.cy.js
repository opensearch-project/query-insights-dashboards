/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

describe('WLM Create Page', () => {
  beforeEach(() => {
    cy.visit('/app/workload-management#/wlm-create');
  });

  it('should render the create form layout', () => {
    // Confirm title and overview section exist
    cy.contains('h1', 'Create workload group').should('exist');
    cy.contains('h2', 'Overview').should('exist');

    // Confirm presence of form field labels
    const labels = [
      'Name',
      'Description (Optional)',
      'Index wildcard',
      'Resiliency mode',
      'Reject queries when CPU usage exceeds',
      'Reject queries when memory usage exceeds',
    ];

    labels.forEach((label) => {
      cy.contains('label', label).should('exist');
    });

    // Confirm both radio options are visible
    cy.contains('label', 'Soft').should('exist');
    cy.contains('label', 'Enforced').should('exist');

    // Confirm buttons exist
    cy.get('button').contains('Cancel').should('exist');
    cy.get('button').contains('Create workload group').should('exist');
  });

  it('should validate CPU and memory input ranges using label', () => {
    cy.contains('label', 'Reject queries when CPU usage exceeds')
      .parentsUntil('.euiFormRow')
      .parent()
      .find('input[type="number"]')
      .as('cpuInput');

    cy.get('@cpuInput').clear().type('150');
    cy.contains('Value must be between 0 and 100').should('exist');

    cy.get('@cpuInput').clear().type('-10');
    cy.contains('Value must be between 0 and 100').should('exist');

    cy.contains('label', 'Reject queries when memory usage exceeds')
      .parentsUntil('.euiFormRow')
      .parent()
      .find('input[type="number"]')
      .as('memInput');

    cy.get('@memInput').clear().type('150');
    cy.contains('Value must be between 0 and 100').should('exist');

    cy.get('@memInput').clear().type('-5');
    cy.contains('Value must be between 0 and 100').should('exist');
  });

  it('should create workload group successfully with valid inputs', () => {
    const groupName = `test_group_${Date.now()}`;

    // Fill in the "Name" input using label
    cy.contains('label', 'Name')
      .parentsUntil('.euiFormRow')
      .parent()
      .find('input[type="text"]')
      .type(groupName);

    // Select "Soft" resiliency mode radio
    cy.contains('label', 'Soft').click();

    // Fill in the CPU threshold
    cy.contains('label', 'Reject queries when CPU usage exceeds')
      .parentsUntil('.euiFormRow')
      .parent()
      .find('input[type="number"]')
      .first()
      .type('1');

    // Fill in the Memory threshold
    cy.contains('label', 'Reject queries when memory usage exceeds')
      .parentsUntil('.euiFormRow')
      .parent()
      .find('input[type="number"]')
      .first()
      .type('1');

    // Intercept request
    cy.intercept('PUT', '/api/_wlm/workload_group').as('createGroup');

    // Submit form
    cy.get('button').contains('Create workload group').click();

    // Confirm redirect and success toast
    cy.url().should('include', '/workloadManagement');
    cy.contains(groupName).should('exist');
  });
});
