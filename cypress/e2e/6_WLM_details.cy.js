/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

describe('WLM Details Page', () => {
  const groupName = `test_group_${Date.now()}`;

  before(() => {
    Cypress.env('groupName', groupName);

    // Clean up existing non-default groups
    cy.request({
      method: 'GET',
      url: '/api/_wlm/workload_group',
      headers: { 'osd-xsrf': 'true' },
    }).then((res) => {
      const groups = res.body?.workload_groups ?? [];
      groups.forEach((g) => {
        if (g.name !== 'DEFAUL_WORKLOAD_GROUP') {
          cy.request({
            method: 'DELETE',
            url: `/api/_wlm/workload_group/${g.name}`,
            headers: { 'osd-xsrf': 'true' },
            failOnStatusCode: false,
          });
        }
      });
    });

    cy.request({
      method: 'PUT',
      url: '/api/_wlm/workload_group',
      headers: { 'osd-xsrf': 'true' },
      body: {
        name: groupName,
        resiliency_mode: 'soft',
        resource_limits: {
          cpu: 0.01,
          memory: 0.01,
        },
      },
    });
  });

  beforeEach(() => {
    cy.visit(`/app/workload-management#/wlm-details?name=${groupName}`);
    // Wait until rows render
    cy.get('.euiBasicTable .euiTableRow').should('have.length.greaterThan', 0);
  });

  it('should display workload group summary panel', () => {
    cy.contains('Workload group name').should('exist');
    cy.contains('Resiliency mode').should('exist');
    cy.contains('CPU usage limit').should('exist');
    cy.contains('Memory usage limit').should('exist');
    cy.contains(groupName).should('exist');
  });

  it('should switch between tabs', () => {
    // Switch to Settings tab
    cy.get('[data-testid="wlm-tab-settings"]').click();
    cy.contains('Workload group settings').should('exist');

    // Switch to Resources tab
    cy.get('[data-testid="wlm-tab-resources"]').click();
    cy.contains('Node ID').should('exist');
  });

  it('should display node resource usage table', () => {
    cy.contains('Node ID').should('exist');
    cy.get('.euiTableRow').should('have.length.greaterThan', 0);
  });

  it('should allow modifying and saving settings', () => {
    cy.get('.euiTab').contains('Settings').click();

    cy.get('input[type="number"]').first().clear().type('150');
    cy.get('input[type="number"]').last().clear().type('-5');

    cy.contains('Value must be between 0 and 100').should('exist');

    // Modify CPU and memory thresholds
    cy.get('input[type="number"]').first().clear().type('0.5');
    cy.get('input[type="number"]').last().clear().type('0.6');

    // Select "Soft" resiliency mode
    cy.get('label[for="soft"]').click();

    // Save changes
    cy.contains('Apply Changes').click();

    // Confirm success toast appears
    cy.contains(`Saved changes for "${groupName}"`).should('exist');
  });

  it('should show delete modal and cancel', () => {
    cy.contains('Delete').click();
    cy.contains('Delete workload group').should('exist');
    cy.get('button').contains('Cancel').click();
    cy.contains('Delete workload group').should('not.exist');
  });

  it('should delete the workload group successfully', () => {
    cy.contains('Delete').click(); // opens modal
    cy.get('input[placeholder="delete"]').type('delete');
    cy.get('.euiModalFooter button').contains('Delete').click();

    // Confirm redirected back to WLM main page
    cy.url().should('include', '/workloadManagement');

    // Confirm toast appears
    cy.contains(`Deleted workload group "${groupName}"`).should('exist');
  });
});

describe('WLM Details – DEFAULT_WORKLOAD_GROUP', () => {
  it('should disable settings tab for DEFAULT_WORKLOAD_GROUP', () => {
    cy.visit('/app/workload-management#/wlm-details?name=DEFAULT_WORKLOAD_GROUP');
    cy.get('[data-testid="wlm-tab-settings"]').click();
    cy.contains('Settings are not available for the DEFAULT_WORKLOAD_GROUP').should('exist');
  });
});
